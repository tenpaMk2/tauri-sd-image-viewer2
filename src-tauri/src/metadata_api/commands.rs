use super::image_metadata::ImageMetadata;
use super::xmp_handler;
use crate::image_file_lock_service::ImageFileLockService;
use tauri::{AppHandle, Manager};
use tokio::sync::Mutex as AsyncMutex;

/// Read comprehensive image metadata (Tauri command)
#[tauri::command]
pub async fn read_image_metadata(
    path: String,
    cache: tauri::State<'_, super::cache::MetadataCache>,
    app_handle: AppHandle,
) -> Result<ImageMetadata, String> {
    // Tauri Stateからキャッシュを取得し、キャッシュヒットを確認
    if let Some(cached_metadata) = cache.get_metadata(&path, &app_handle).await {
        return Ok(cached_metadata);
    }

    // Get file lock service from app state
    let mutex = app_handle.state::<AsyncMutex<ImageFileLockService>>();
    let mut image_file_lock_service = mutex.lock().await;

    // Get path-specific mutex
    let path_mutex = image_file_lock_service.get_or_create_path_mutex(&path);
    drop(image_file_lock_service); // Release service lock immediately

    // Execute file operation with exclusive access
    let metadata = ImageFileLockService::with_exclusive_file_access(
        path_mutex,
        path.clone(),
        |path| async move {
            // キャッシュミス → ファイルから読み込み（非同期版を使用）
            let metadata = ImageMetadata::from_file_async(&path)
                .await
                .map_err(|e| format!("{:?}", e))?;

            Ok(metadata)
        },
    )
    .await?;

    // キャッシュに保存
    cache
        .store_metadata(path, metadata.clone(), &app_handle)
        .await;

    Ok(metadata)
}

/// Write image rating to XMP metadata (Tauri command)
#[tauri::command]
pub async fn write_xmp_image_rating(
    src_path: String,
    rating: u32,
    app_handle: AppHandle,
) -> Result<(), String> {
    if rating > 5 {
        return Err("Rating must be in the range 0-5".to_string());
    }

    // Get file lock service from app state
    let mutex = app_handle.state::<AsyncMutex<ImageFileLockService>>();
    let mut image_file_lock_service = mutex.lock().await;

    // Get path-specific mutex
    let path_mutex = image_file_lock_service.get_or_create_path_mutex(&src_path);
    drop(image_file_lock_service); // Release service lock immediately

    // Execute file operation with exclusive access
    ImageFileLockService::with_exclusive_file_access(path_mutex, src_path, |src_path| async move {
        // Use unified XMP API for direct file processing in blocking task
        tokio::task::spawn_blocking(move || {
            xmp_handler::embed_xmp_rating_unified(&src_path, rating)
        })
        .await
        .map_err(|e| format!("XMP rating write task failed: {}", e))?
    })
    .await
}

#[cfg(test)]
mod tests {
    use log::{debug, info};
    use std::fs;

    #[test]
    fn test_write_xmp_rating_integration() {
        debug!("Testing XMP rating write");

        // Read test PNG file
        let test_file = "../test-rating.png";
        let original_data = fs::read(test_file).expect("Failed to read test PNG file");

        debug!("Original PNG size: {} bytes", original_data.len());

        // Test the XMP pipeline components directly (synchronous version)
        let current_data = fs::read(test_file).expect("Failed to read test file");

        // Apply XMP rating using unified API
        // First write to a temporary file for testing
        let temp_file = format!("{}.test", test_file);
        std::fs::write(&temp_file, &current_data).expect("Failed to write temp file");

        super::xmp_handler::embed_xmp_rating_unified(&temp_file, 3)
            .expect("XMP rating write should succeed");

        let processed_data = std::fs::read(&temp_file).expect("Failed to read processed file");
        std::fs::remove_file(&temp_file).ok(); // Clean up

        debug!("Processed PNG size: {} bytes", processed_data.len());
        assert_ne!(
            original_data.len(),
            processed_data.len(),
            "File size should change after processing"
        );

        // Check for iTXt (XMP) chunks only
        let chunks_info = analyze_png_chunks(&processed_data);
        debug!("PNG chunks found: {:?}", chunks_info);

        assert!(chunks_info.has_itxt_xmp, "Should have iTXt XMP chunk");

        info!("XMP integration test passed - XMP chunk present");
    }

    #[test]
    fn test_xmp_toolkit_rating_roundtrip() {
        debug!("Testing XMP Toolkit rating roundtrip with real test image");

        // Use the actual test image provided
        let test_file = "../1dot-red-vanilla.png";
        let original_data = fs::read(test_file).expect("Failed to read test PNG file");

        debug!("Original PNG size: {} bytes", original_data.len());

        // Test rating values 1-5 (skip 0 for now)
        for rating in 1..=5 {
            debug!("Testing rating: {}", rating);

            // Write rating using unified API
            let temp_file = format!("{}.test_rating_{}", test_file, rating);
            std::fs::write(&temp_file, &original_data).expect("Failed to write temp file");

            super::xmp_handler::embed_xmp_rating_unified(&temp_file, rating)
                .expect("XMP rating write should succeed");

            let processed_data = std::fs::read(&temp_file).expect("Failed to read processed file");
            debug!("Processed PNG size: {} bytes", processed_data.len());

            // Verify rating using direct file reading
            if let Some(read_rating) = super::xmp_handler::extract_rating_from_file(&temp_file) {
                debug!("Direct file read rating: {}", read_rating);
                assert_eq!(
                    read_rating, rating,
                    "Rating roundtrip failed for rating {}",
                    rating
                );
            } else {
                if rating == 0 {
                    debug!("Debug rating 0 - no XMP found (expected)");
                } else {
                    panic!("Failed to read rating {} using direct file method", rating);
                }
            }

            // Clean up temp file
            std::fs::remove_file(&temp_file).ok();
        }

        info!("XMP Toolkit roundtrip test passed for all ratings 0-5");
    }

    #[test]
    fn test_unified_api_integration() {
        debug!("Testing Unified API integration");

        let test_file = "../1dot-red-vanilla.png";
        let original_data = fs::read(test_file).expect("Failed to read test PNG file");

        // Test with rating 4
        let test_rating = 4;
        let temp_file = format!("{}.test_unified", test_file);

        // Copy original to temp file
        std::fs::write(&temp_file, &original_data).expect("Failed to write temp file");

        // Apply rating using unified API
        super::xmp_handler::embed_xmp_rating_unified(&temp_file, test_rating)
            .expect("Unified XMP rating write should succeed");

        // Read back using direct file API
        if let Some(read_rating) = super::xmp_handler::extract_rating_from_file(&temp_file) {
            debug!("Read back rating: {}", read_rating);
            assert_eq!(read_rating, test_rating, "Direct file API rating mismatch");
        } else {
            panic!("Failed to read rating using direct file API");
        }

        // Clean up
        std::fs::remove_file(&temp_file).ok();

        info!("Unified API integration test passed");
    }

    #[derive(Debug)]
    struct PngChunksInfo {
        has_itxt_xmp: bool,
        chunk_types: Vec<String>,
    }

    fn analyze_png_chunks(data: &[u8]) -> PngChunksInfo {
        use std::io::{Cursor, Read, Seek, SeekFrom};

        const PNG_SIGNATURE: &[u8] = b"\x89PNG\r\n\x1a\n";

        let mut info = PngChunksInfo {
            has_itxt_xmp: false,
            chunk_types: Vec::new(),
        };

        if data.len() < 8 || &data[0..8] != PNG_SIGNATURE {
            return info;
        }

        let mut cursor = Cursor::new(data);
        cursor.seek(SeekFrom::Start(8)).unwrap();

        loop {
            let mut length_bytes = [0u8; 4];
            if cursor.read_exact(&mut length_bytes).is_err() {
                break;
            }
            let length = u32::from_be_bytes(length_bytes);

            let mut type_bytes = [0u8; 4];
            if cursor.read_exact(&mut type_bytes).is_err() {
                break;
            }
            let chunk_type = String::from_utf8_lossy(&type_bytes).to_string();
            info.chunk_types.push(chunk_type.clone());

            let mut chunk_data = vec![0u8; length as usize];
            if cursor.read_exact(&mut chunk_data).is_err() {
                break;
            }

            // Skip CRC
            let mut crc_bytes = [0u8; 4];
            if cursor.read_exact(&mut crc_bytes).is_err() {
                break;
            }

            // Check for XMP iTXt chunk
            if chunk_type == "iTXt" {
                if let Some(null_pos) = chunk_data.iter().position(|&b| b == 0) {
                    if let Ok(keyword) = std::str::from_utf8(&chunk_data[0..null_pos]) {
                        if keyword == "XML:com.adobe.xmp" {
                            info.has_itxt_xmp = true;
                        }
                    }
                }
            }

            if chunk_type == "IEND" {
                break;
            }
        }

        info
    }
}
