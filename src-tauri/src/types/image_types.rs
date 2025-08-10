use crate::exif_info::ExifInfo;
use crate::sd_parameters::SdParameters;
use serde::{Deserialize, Serialize};

/// 基本ファイル情報（ファイルシステムから取得可能な情報のみ）
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FileSystemInfo {
    pub path: String,
    pub file_size: u64,
    pub modified_time: u64, // UNIXタイムスタンプ
}

/// 画像のファイル情報
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ImageFileInfo {
    #[serde(flatten)]
    pub file_info: FileSystemInfo,
    pub width: u32,
    pub height: u32,
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
