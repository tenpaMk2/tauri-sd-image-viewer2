use crate::common::{detect_mime_type_from_path, read_file_safe, AppResult};
use crate::exif_info::ExifInfo;
use crate::image_handlers::PngProcessor;
use crate::types::{ImageFileInfo, ImageMetadataInfo};

/// 画像基本情報のみを軽量取得
#[tauri::command]
pub fn read_image_metadata_basic(path: String) -> Result<ImageFileInfo, String> {
    extract_image_file_info_with_reader(&path)
}

/// 画像Rating値のみを軽量取得
#[tauri::command]
pub fn read_image_metadata_rating(path: String) -> Result<Option<u8>, String> {
    let (data, mime_type) = read_file_and_detect_mime(&path).map_err(|e| e.to_string())?;
    let rating = extract_rating_only(&data, &mime_type, &path);
    Ok(rating)
}

/// 画像ファイルから全メタデータを取得
#[tauri::command]
pub fn read_image_metadata_all(path: String) -> Result<ImageMetadataInfo, String> {
    read_image_metadata_internal(&path).map_err(|e| e.to_string())
}

/// 共通: ファイル読み込み + MIME型検出
fn read_file_and_detect_mime(path: &str) -> AppResult<(Vec<u8>, String)> {
    let data = read_file_safe(path)?;
    let mime_type = detect_mime_type_from_path(path);
    Ok((data, mime_type))
}

/// ImageReaderを使用した画像ファイル情報取得
fn extract_image_file_info_with_reader(path: &str) -> Result<ImageFileInfo, String> {
    ImageFileInfo::from_file_with_reader(path)
}


/// 共通: EXIF情報の抽出
fn extract_exif_info(data: &[u8], mime_type: &str, path: &str) -> Option<ExifInfo> {
    if matches!(mime_type, "image/png" | "image/jpeg" | "image/webp") {
        let extension = path.split('.').last().unwrap_or("");
        ExifInfo::from_bytes(data, extension)
    } else {
        None
    }
}

/// 共通: Rating値のみを抽出
fn extract_rating_only(data: &[u8], mime_type: &str, path: &str) -> Option<u8> {
    extract_exif_info(data, mime_type, path)?.rating
}

pub fn read_image_metadata_internal(path: &str) -> AppResult<ImageMetadataInfo> {
    let (data, mime_type) = read_file_and_detect_mime(path)?;
    
    // 基本情報を取得（直接構築）
    let file_size = data.len() as u64;
    let (width, height) = match image::load_from_memory(&data) {
        Ok(img) => (img.width(), img.height()),
        Err(_) => (0, 0), // エラー時は0を設定
    };
    
    // SD Parametersを取得（PNGのみ）
    let sd_parameters = if mime_type == "image/png" {
        match PngProcessor::extract_sd_parameters(&data) {
            Ok(sd) => sd,
            Err(_) => None,
        }
    } else {
        None
    };
    
    // EXIF情報を取得
    let exif_info = extract_exif_info(&data, &mime_type, path);

    Ok(ImageMetadataInfo {
        width,
        height,
        file_size,
        mime_type,
        sd_parameters,
        exif_info,
    })
}
