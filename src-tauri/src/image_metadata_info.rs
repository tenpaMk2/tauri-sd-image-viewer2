use crate::exif_api::ExifInfo; 
use crate::image_handlers::png_processor;
use crate::image_loader::ImageReader;
use crate::sd_parameters::SdParameters;
use serde::{Deserialize, Serialize};

/// 画像メタデータ情報（統合型）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageMetadataInfo {
    pub width: u32,
    pub height: u32,
    pub file_size: u64,
    pub mime_type: String,
    pub sd_parameters: Option<SdParameters>,
    pub exif_info: Option<ExifInfo>,
}

impl ImageMetadataInfo {
    /// ImageReaderから全メタデータ情報を構築
    pub fn from_reader(reader: &ImageReader, path: &str) -> Result<Self, String> {
        // 基本情報を取得
        let file_size = reader.as_bytes().len() as u64;
        let (width, height) = reader.get_dimensions().map_err(|e| format!("解像度取得失敗: {}", e))?;
        
        // SD Parametersを取得（PNGのみ）
        let mime_type = reader.mime_type();
        let sd_parameters = if mime_type == "image/png" {
            match png_processor::extract_sd_parameters(reader.as_bytes()) {
                Ok(sd) => sd,
                Err(_) => None,
            }
        } else {
            None
        };
        
        // EXIF情報を取得
        let exif_info = Self::extract_exif_info_from_reader(reader, path);

        Ok(ImageMetadataInfo {
            width,
            height,
            file_size,
            mime_type,
            sd_parameters,
            exif_info,
        })
    }

    /// EXIF情報の抽出（ImageReaderから）
    fn extract_exif_info_from_reader(reader: &ImageReader, path: &str) -> Option<ExifInfo> {
        let mime_type = reader.mime_type();
        if matches!(mime_type.as_str(), "image/png" | "image/jpeg" | "image/webp") {
            let extension = path.split('.').last().unwrap_or("");
            ExifInfo::from_bytes(reader.as_bytes(), extension)
        } else {
            None
        }
    }

    /// Rating値のみを抽出（ImageReaderから）
    pub fn extract_rating_from_reader(reader: &ImageReader, path: &str) -> Option<u8> {
        Self::extract_exif_info_from_reader(reader, path)?.rating
    }
}