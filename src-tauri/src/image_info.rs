use crate::common::{detect_mime_type_from_path, read_file_safe, AppResult};
use crate::exif_info::ExifInfo;
use crate::image_handlers::{GenericImageProcessor, PngProcessor};
use crate::types::ImageMetadataInfo;

/// 画像ファイルからメタデータのみを効率的に取得
#[tauri::command]
pub fn read_image_metadata_info(path: String) -> Result<ImageMetadataInfo, String> {
    read_image_metadata_internal(&path).map_err(|e| e.to_string())
}

pub fn read_image_metadata_internal(path: &str) -> AppResult<ImageMetadataInfo> {
    let data = read_file_safe(path)?;
    let file_size = data.len() as u64;

    // MIME型を拡張子から推定
    let mime_type = detect_mime_type_from_path(path);

    // 画像の基本情報とメタデータを解析
    let (width, height, sd_parameters) = if mime_type == "image/png" {
        match PngProcessor::extract_comprehensive_info(&data) {
            Ok((png_info, sd)) => (png_info.width, png_info.height, sd),
            Err(_) => {
                // PNG解析に失敗した場合は基本情報のみ
                match GenericImageProcessor::extract_basic_image_info(&data) {
                    Ok((w, h)) => (w, h, None),
                    Err(_) => (0, 0, None),
                }
            }
        }
    } else {
        // PNG以外の場合は基本情報のみ
        match GenericImageProcessor::extract_basic_image_info(&data) {
            Ok((w, h)) => (w, h, None),
            Err(_) => (0, 0, None),
        }
    };

    // Exif情報を抽出（対応形式: PNG、JPEG、WebP）
    let exif_info = if matches!(
        mime_type.as_str(),
        "image/png" | "image/jpeg" | "image/webp"
    ) {
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
