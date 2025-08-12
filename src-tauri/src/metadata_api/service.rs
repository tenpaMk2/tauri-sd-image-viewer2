use super::metadata_info::ImageMetadataInfo;
use super::xmp_handler;
use crate::image_loader::ImageReader;
use std::path::Path;

/// Read comprehensive image metadata (Tauri command)
#[tauri::command]
pub fn read_image_metadata(
    path: String,
    cache: tauri::State<super::cache::MetadataCache>,
) -> Result<ImageMetadataInfo, String> {
    // Tauri Stateからキャッシュを取得し、キャッシュヒットを確認
    if let Some(cached_metadata) = cache.get_metadata(&path) {
        return Ok(cached_metadata);
    }

    // キャッシュミス → ファイルから読み込み
    let reader = ImageReader::from_file(&path)?;
    let metadata =
        ImageMetadataInfo::from_reader(&reader, &path).map_err(|e| format!("{:?}", e))?;

    // キャッシュに保存
    cache.store_metadata(path, metadata.clone());

    Ok(metadata)
}

/// Write image rating to XMP metadata (Tauri command)
#[tauri::command]
pub async fn write_xmp_image_rating(src_path: String, rating: u32) -> Result<(), String> {
    if rating > 5 {
        return Err("Rating must be in the range 0-5".to_string());
    }

    // Create ImageReader for unified vec pipeline
    let reader = ImageReader::from_file(&src_path)?;
    let src_image_path = Path::new(&src_path);

    // Get file extension
    let file_extension = src_image_path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_lowercase();

    // XMP-only pipeline: ImageReader -> XMP -> File
    let current_data = reader.as_bytes().to_vec();

    // Apply XMP rating
    let processed_data = xmp_handler::embed_xmp_rating_in_vec(&current_data, &file_extension, rating)?;

    // Single file write operation
    std::fs::write(src_image_path, processed_data)
        .map_err(|e| format!("File write error: {}", e))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_write_xmp_rating_integration() {
        println!("🧪 Testing XMP rating write");
        
        // Read test PNG file
        let test_file = "../test-rating.png";
        let original_data = fs::read(test_file)
            .expect("Failed to read test PNG file");
        
        println!("📁 Original PNG size: {} bytes", original_data.len());
        
        // Test the XMP pipeline components directly (synchronous version)
        let reader = crate::image_loader::ImageReader::from_file(test_file)
            .expect("Failed to create ImageReader");
        let current_data = reader.as_bytes().to_vec();
        
        // Apply XMP rating only
        let processed_data = super::xmp_handler::embed_xmp_rating_in_vec(&current_data, "png", 3)
            .expect("XMP rating write should succeed");
        
        println!("📁 Processed PNG size: {} bytes", processed_data.len());
        assert_ne!(original_data.len(), processed_data.len(), "File size should change after processing");
        
        // Check for iTXt (XMP) chunks only
        let chunks_info = analyze_png_chunks(&processed_data);
        println!("📦 PNG chunks found: {:?}", chunks_info);
        
        assert!(chunks_info.has_itxt_xmp, "Should have iTXt XMP chunk");
        
        println!("✅ XMP integration test passed - XMP chunk present");
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
