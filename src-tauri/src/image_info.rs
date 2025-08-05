use crate::common::{detect_mime_type_from_path, read_file_safe, AppResult};
use crate::image_processor::{PngProcessor, extract_basic_image_info};
use crate::types::ImageMetadataInfo;
use crate::exif_info::ExifInfo;

/// 画像ファイルからメタデータのみを効率的に取得
#[tauri::command]
pub fn read_image_metadata_info(path: String) -> Result<ImageMetadataInfo, String> {
    read_image_metadata_internal(&path).map_err(|e| e.to_string())
}

pub fn read_image_metadata_internal(path: &str) -> AppResult<ImageMetadataInfo> {
    let data = read_file_safe(path)?;
    let file_size = data.len() as u64;
    
    println!("DEBUG: メタデータ読み込み開始 - path: {}, size: {} bytes", path, file_size);
    
    // MIME型を拡張子から推定
    let mime_type = detect_mime_type_from_path(path);
    println!("DEBUG: MIME type: {}", mime_type);
    
    // 画像の基本情報とメタデータを解析
    let (width, height, sd_parameters) = if mime_type == "image/png" {
        println!("DEBUG: PNG画像として処理中...");
        match PngProcessor::extract_comprehensive_info(&data) {
            Ok((png_info, sd)) => {
                println!("DEBUG: PNG処理成功 - width: {}, height: {}, SD params: {:?}", 
                    png_info.width, png_info.height, sd.is_some());
                (png_info.width, png_info.height, sd)
            },
            Err(e) => {
                println!("DEBUG: PNG処理失敗: {:?}", e);
                // PNG解析に失敗した場合は基本情報のみ
                match extract_basic_image_info(&data) {
                    Ok((w, h)) => {
                        println!("DEBUG: 基本情報のみ取得 - width: {}, height: {}", w, h);
                        (w, h, None)
                    },
                    Err(e2) => {
                        println!("DEBUG: 基本情報取得も失敗: {:?}", e2);
                        (0, 0, None)
                    }
                }
            }
        }
    } else {
        println!("DEBUG: PNG以外の画像として処理");
        // PNG以外の場合は基本情報のみ
        match extract_basic_image_info(&data) {
            Ok((w, h)) => (w, h, None),
            Err(_) => (0, 0, None)
        }
    };

    // Exif情報を抽出（対応形式: PNG、JPEG、WebP）
    let exif_info = if matches!(mime_type.as_str(), "image/png" | "image/jpeg" | "image/webp") {
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
    })
}

