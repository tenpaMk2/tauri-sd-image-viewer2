use crate::common::AppResult;
use crate::exif_info::ExifInfo;
use crate::image_handlers::PngProcessor;
use crate::image_loader::ImageReader;
use crate::types::{ImageFileInfo, ImageMetadataInfo};

/// 画像基本情報のみを軽量取得
#[tauri::command]
pub fn read_image_metadata_basic(path: String) -> Result<ImageFileInfo, String> {
    extract_image_file_info_with_reader(&path)
}

/// 画像Rating値のみを軽量取得
#[tauri::command]
pub fn read_image_metadata_rating(path: String) -> Result<Option<u8>, String> {
    let reader = ImageReader::from_file(&path)?;
    let rating = extract_rating_only_from_reader(&reader, &path);
    Ok(rating)
}

/// 画像ファイルから全メタデータを取得
#[tauri::command]
pub fn read_image_metadata_all(path: String) -> Result<ImageMetadataInfo, String> {
    read_image_metadata_internal(&path).map_err(|e| e.to_string())
}


/// ImageReaderを使用した画像ファイル情報取得
fn extract_image_file_info_with_reader(path: &str) -> Result<ImageFileInfo, String> {
    ImageFileInfo::from_file_with_reader(path)
}


/// 共通: EXIF情報の抽出（ImageReaderから）
fn extract_exif_info_from_reader(reader: &ImageReader, path: &str) -> Option<ExifInfo> {
    if matches!(reader.mime_type(), "image/png" | "image/jpeg" | "image/webp") {
        let extension = path.split('.').last().unwrap_or("");
        ExifInfo::from_bytes(reader.as_bytes(), extension)
    } else {
        None
    }
}

/// 共通: Rating値のみを抽出（ImageReaderから）
fn extract_rating_only_from_reader(reader: &ImageReader, path: &str) -> Option<u8> {
    extract_exif_info_from_reader(reader, path)?.rating
}

/// ImageReaderからImageMetadataInfoを抽出（共通関数）
pub fn extract_metadata_from_reader(reader: &ImageReader, path: &str) -> Result<ImageMetadataInfo, String> {
    // 基本情報を取得
    let file_size = reader.as_bytes().len() as u64;
    let (width, height) = reader.get_dimensions().map_err(|e| format!("解像度取得失敗: {}", e))?;
    
    // SD Parametersを取得（PNGのみ）
    let sd_parameters = if reader.mime_type() == "image/png" {
        match PngProcessor::extract_sd_parameters(reader.as_bytes()) {
            Ok(sd) => sd,
            Err(_) => None,
        }
    } else {
        None
    };
    
    // EXIF情報を取得
    let exif_info = extract_exif_info_from_reader(reader, path);

    Ok(ImageMetadataInfo {
        width,
        height,
        file_size,
        mime_type: reader.mime_type().to_string(),
        sd_parameters,
        exif_info,
    })
}

pub fn read_image_metadata_internal(path: &str) -> AppResult<ImageMetadataInfo> {
    let reader = ImageReader::from_file(path).map_err(|e| format!("ImageReader作成失敗: {}", e))?;
    extract_metadata_from_reader(&reader, path).map_err(|e| e.into())
}
