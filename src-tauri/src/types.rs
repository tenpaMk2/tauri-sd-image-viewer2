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

/// サムネイル情報
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThumbnailInfo {
    pub data: Vec<u8>,
    pub width: u32,
    pub height: u32,
    pub mime_type: String,
}

/// キャッシュされたメタデータ情報
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedMetadata {
    pub rating: Option<u8>,
    pub exif_info: Option<ExifInfo>,
    pub cached_at: u64, // UNIXタイムスタンプ
}

/// バッチサムネイル結果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchThumbnailResult {
    pub path: String,
    pub thumbnail: Option<ThumbnailInfo>,
    pub cached_metadata: Option<CachedMetadata>,
    pub error: Option<String>,
}