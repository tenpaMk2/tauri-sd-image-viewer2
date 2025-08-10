use crate::exif_info::ExifInfo;
use crate::sd_parameters::SdParameters;
use serde::{Deserialize, Serialize};

/// 画像基本情報（軽量版）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BasicImageInfo {
    pub width: u32,
    pub height: u32,
    pub file_size: u64,
    pub mime_type: String,
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

impl From<BasicImageInfo> for ImageMetadataInfo {
    fn from(basic: BasicImageInfo) -> Self {
        Self {
            width: basic.width,
            height: basic.height,
            file_size: basic.file_size,
            mime_type: basic.mime_type,
            sd_parameters: None,
            exif_info: None,
        }
    }
}

