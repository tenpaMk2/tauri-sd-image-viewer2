use super::exif_handler;
use super::metadata_info::ImageMetadataInfo;
use super::xmp_handler;
use crate::image_loader::ImageReader;
use std::path::Path;

/// Read comprehensive image metadata (Tauri command)
#[tauri::command]
pub fn read_image_metadata(path: String) -> Result<ImageMetadataInfo, String> {
    let reader = ImageReader::from_file(&path)?;
    ImageMetadataInfo::from_reader(&reader, &path).map_err(|e| format!("{:?}", e))
}

/// Write image rating to EXIF metadata (Tauri command)
#[tauri::command]
pub async fn write_exif_image_rating(path: String, rating: u32) -> Result<(), String> {
    if rating > 5 {
        return Err("Rating must be in the range 0-5".to_string());
    }

    // Write to EXIF
    exif_handler::write_exif_rating(&path, rating)?;

    // Write to XMP (safe version - ignore errors)
    let image_path = Path::new(&path);
    if let Err(e) = xmp_handler::write_xmp_rating_to_file(image_path, rating) {
        // XMP writing failures are treated as warnings since EXIF was successful
        eprintln!("XMP writing warning: {}", e);
    }

    Ok(())
}