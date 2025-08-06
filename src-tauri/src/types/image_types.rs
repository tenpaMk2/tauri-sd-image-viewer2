use crate::sd_parameters::SdParameters;
use crate::exif_info::ExifInfo;
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

/// PNG画像情報（拡張）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PngImageInfo {
    pub width: u32,
    pub height: u32,
    pub bit_depth: u8,
    pub color_type: String,
    pub sd_parameters: Option<SdParameters>,
}