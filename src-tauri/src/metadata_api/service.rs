use super::exif_handler;
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

/// Write image rating to EXIF metadata (Tauri command)
#[tauri::command]
pub async fn write_exif_image_rating(src_path: String, rating: u32) -> Result<(), String> {
    if rating > 5 {
        return Err("Rating must be in the range 0-5".to_string());
    }

    // Create ImageReader once for unified vec pipeline
    let reader = ImageReader::from_file(&src_path)?;
    let src_image_path = Path::new(&src_path);

    // Get file extension
    let file_extension = src_image_path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_lowercase();

    // Unified vec pipeline: ImageReader -> EXIF -> XMP -> File
    let mut current_data = reader.as_bytes().to_vec();

    // Step 1: Apply EXIF rating
    current_data = exif_handler::embed_exif_rating_in_vec(&current_data, &file_extension, rating)?;

    // Step 2: Apply XMP rating (safe version - continue on error)
    current_data =
        match xmp_handler::embed_xmp_rating_in_vec(&current_data, &file_extension, rating) {
            Ok(data) => data,
            Err(e) => {
                // XMP processing failures are treated as warnings since EXIF was successful
                eprintln!("XMP processing warning: {}", e);
                current_data // Continue with EXIF-only data
            }
        };

    // Step 3: Single file write operation
    std::fs::write(src_image_path, current_data)
        .map_err(|e| format!("Final file write error: {}", e))?;

    Ok(())
}
