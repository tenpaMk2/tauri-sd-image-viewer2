use crate::image_file_info::ImageFileInfo;
use crate::image_loader::ImageReader;
use crate::image_metadata_info::ImageMetadataInfo;

/// 画像基本情報のみを軽量取得
#[tauri::command]
pub fn read_image_metadata_basic(path: String) -> Result<ImageFileInfo, String> {
    let reader = ImageReader::from_file(&path)?;
    ImageFileInfo::from_reader(&reader, &path)
}

/// 画像Rating値のみを軽量取得
#[tauri::command]
pub fn read_image_metadata_rating(path: String) -> Result<Option<u8>, String> {
    let reader = ImageReader::from_file(&path)?;
    let rating = ImageMetadataInfo::extract_rating_from_reader(&reader, &path);
    Ok(rating)
}

/// 画像ファイルから全メタデータを取得
#[tauri::command]
pub fn read_image_metadata_all(path: String) -> Result<ImageMetadataInfo, String> {
    let reader = ImageReader::from_file(&path)?;
    ImageMetadataInfo::from_reader(&reader, &path).map_err(|e| format!("{:?}", e))
}
