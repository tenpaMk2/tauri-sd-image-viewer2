use crate::exif_info::ExifInfo;
use crate::sd_parameters::SdParameters;
use serde::{Deserialize, Serialize};

/// サムネイル生成設定
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ThumbnailConfig {
    pub size: u32,
    pub quality: u8,
    pub format: String, // "webp"
}

/// 元画像のファイル情報
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct OriginalFileInfo {
    pub path: String,
    pub file_size: u64,
    pub width: u32,
    pub height: u32,
    pub modified_time: u64, // UNIXタイムスタンプ
}

/// 包括的キャッシュ情報（JSONファイルで保存）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThumbnailCacheInfo {
    /// キャッシュ作成時の設定
    pub thumbnail_config: ThumbnailConfig,
    /// 元画像のファイル情報
    pub original_file_info: OriginalFileInfo,
    /// サムネイル画像ファイル名
    pub thumbnail_filename: String,
    /// メタデータ情報
    pub rating: Option<u8>,
    pub exif_info: Option<ExifInfo>,
    pub sd_parameters: Option<SdParameters>,
    /// キャッシュ作成日時
    pub cached_at: u64, // UNIXタイムスタンプ
}

/// サムネイル情報（レスポンス用）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThumbnailInfo {
    pub data: Vec<u8>,
    pub width: u32,
    pub height: u32,
    pub mime_type: String,
    pub cache_path: Option<String>,
}

/// バッチサムネイル結果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchThumbnailResult {
    pub path: String,
    pub thumbnail: Option<ThumbnailInfo>,
    pub cache_info: Option<ThumbnailCacheInfo>,
    pub error: Option<String>,
}
