use crate::exif_info::ExifInfo;
use serde::{Deserialize, Serialize};

/// サムネイル情報
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThumbnailInfo {
    pub data: Vec<u8>,
    pub width: u32,
    pub height: u32,
    pub mime_type: String,
    pub cache_path: Option<String>,
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