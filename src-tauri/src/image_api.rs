use crate::image_loader::ImageReader;
use crate::image_metadata_info::ImageMetadataInfo;

/// Read comprehensive image metadata (Tauri command)
#[tauri::command]
pub fn read_image_metadata(path: String) -> Result<ImageMetadataInfo, String> {
    let reader = ImageReader::from_file(&path)?;
    ImageMetadataInfo::from_reader(&reader, &path).map_err(|e| format!("{:?}", e))
}
