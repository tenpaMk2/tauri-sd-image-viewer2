use crate::exif_info::ExifInfo;
use crate::sd_parameters::SdParameters;
use serde::{Deserialize, Serialize};

/// 画像ファイルの基本情報（メタデータを含む）
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ImageFileInfo {
    pub path: String,
    pub file_size: u64,
    pub modified_time: u64, // UNIXタイムスタンプ
    pub width: u32,
    pub height: u32,
    pub mime_type: String,
}

impl ImageFileInfo {
    /// ImageReaderから画像ファイル情報を構築
    pub fn from_reader(reader: &crate::image_loader::ImageReader, path: &str) -> Result<Self, String> {
        use std::fs;

        let (width, height) = reader.get_dimensions()?;
        let file_size = reader.as_bytes().len() as u64;
        let mime_type = reader.mime_type().to_string();

        // ファイルシステム情報を取得
        let metadata =
            fs::metadata(path).map_err(|e| format!("Failed to get file metadata: {}", e))?;
        let modified_time = metadata
            .modified()
            .map_err(|e| format!("Failed to get file modified time: {}", e))?
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| format!("Failed to convert to UNIX time: {}", e))?
            .as_secs();

        Ok(ImageFileInfo {
            path: path.to_string(),
            file_size,
            modified_time,
            width,
            height,
            mime_type,
        })
    }

    /// 指定された解像度とMIMEタイプで画像ファイル情報を構築
    pub fn from_dimensions(
        path: &str,
        width: u32,
        height: u32,
        mime_type: String,
    ) -> Result<Self, String> {
        use std::fs;

        let metadata =
            fs::metadata(path).map_err(|e| format!("Failed to get file metadata: {}", e))?;

        let modified_time = metadata
            .modified()
            .map_err(|e| format!("Failed to get file modified time: {}", e))?
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| format!("Failed to convert to UNIX time: {}", e))?
            .as_secs();

        Ok(ImageFileInfo {
            path: path.to_string(),
            file_size: metadata.len(),
            modified_time,
            width,
            height,
            mime_type,
        })
    }
}

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
