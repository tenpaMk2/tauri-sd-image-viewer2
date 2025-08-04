use crate::sd_parameters::SdParameters;
use crate::exif_info::ExifInfo;
use png::Decoder;
use std::io::Cursor;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageMetadataInfo {
    pub width: u32,
    pub height: u32,
    pub file_size: u64,
    pub mime_type: String,
    pub sd_parameters: Option<SdParameters>,
    pub exif_info: Option<ExifInfo>,
    // 画像データは除外してメタデータのみ
}

/// 画像ファイルからメタデータのみを効率的に取得
#[tauri::command]
pub fn read_image_metadata_info(path: String) -> Result<ImageMetadataInfo, String> {
    let data = std::fs::read(&path).map_err(|e| format!("ファイル読み込みエラー: {}", e))?;
    let file_size = data.len() as u64;
    
    // MIME型を拡張子から推定
    let mime_type = detect_mime_type_from_path(&path);
    
    // 画像の基本情報とメタデータを解析
    let (width, height, sd_parameters) = if mime_type == "image/png" {
        match extract_png_info(&data) {
            Ok((w, h, sd)) => (w, h, sd),
            Err(_) => {
                // PNG解析に失敗した場合は基本情報のみ
                (0, 0, None)
            }
        }
    } else {
        // PNG以外の場合は基本情報のみ
        match extract_basic_image_info(&data, &mime_type) {
            Ok((w, h)) => (w, h, None),
            Err(_) => (0, 0, None)
        }
    };

    // Exif情報を抽出（JPEG、TIFF、PNG形式の場合）
    let exif_info = if mime_type == "image/jpeg" || mime_type == "image/tiff" || mime_type == "image/png" {
        let extension = path.split('.').last().unwrap_or("");
        ExifInfo::from_bytes(&data, extension)
    } else {
        None
    };
    
    Ok(ImageMetadataInfo {
        width,
        height,
        file_size,
        mime_type,
        sd_parameters,
        exif_info,
        // 画像データは返さない（メタデータのみ）
    })
}

fn detect_mime_type_from_path(path: &str) -> String {
    let extension = path.split('.').last().unwrap_or("").to_lowercase();
    match extension.as_str() {
        "png" => "image/png".to_string(),
        "jpg" | "jpeg" => "image/jpeg".to_string(),
        "gif" => "image/gif".to_string(),
        "bmp" => "image/bmp".to_string(),
        "webp" => "image/webp".to_string(),
        "avif" => "image/avif".to_string(),
        "tiff" | "tif" => "image/tiff".to_string(),
        _ => "application/octet-stream".to_string(),
    }
}

fn extract_png_info(data: &[u8]) -> Result<(u32, u32, Option<SdParameters>), String> {
    let cursor = Cursor::new(data);
    let decoder = Decoder::new(cursor);
    let reader = decoder
        .read_info()
        .map_err(|e| format!("PNG解析エラー: {}", e))?;
    let info = reader.info();

    // SD Parameters を検索・解析
    let mut sd_parameters = None;
    for entry in &info.uncompressed_latin1_text {
        if entry.keyword == "parameters" {
            match SdParameters::parse(&entry.text) {
                Ok(params) => sd_parameters = Some(params),
                Err(_) => {} // 解析失敗は無視
            }
            break;
        }
    }

    Ok((info.width, info.height, sd_parameters))
}

fn extract_basic_image_info(data: &[u8], _mime_type: &str) -> Result<(u32, u32), String> {
    // 基本的な画像サイズ取得（image crateを使用）
    match image::load_from_memory(data) {
        Ok(img) => Ok((img.width(), img.height())),
        Err(_) => Ok((0, 0)), // 解析失敗時はデフォルト値
    }
}