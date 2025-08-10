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
    /// ImageReaderを使用して画像ファイル情報を取得
    pub fn from_file_with_reader(path: &str) -> Result<Self, String> {
        use crate::image_loader::ImageReader;
        use std::fs;
        
        let reader = ImageReader::from_file(path)?;
        let (width, height) = reader.get_dimensions()?;
        let file_size = reader.as_bytes().len() as u64;
        let mime_type = reader.mime_type().to_string();

        // ファイルシステム情報を取得
        let metadata = fs::metadata(path)
            .map_err(|e| format!("ファイルメタデータの取得に失敗: {}", e))?;
        let modified_time = metadata
            .modified()
            .map_err(|e| format!("ファイル更新時刻の取得に失敗: {}", e))?
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| format!("UNIX時刻への変換に失敗: {}", e))?
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

    /// 指定された解像度とMIMEタイプで画像ファイル情報を作成
    pub fn from_file_with_dimensions(path: &str, width: u32, height: u32, mime_type: String) -> Result<Self, String> {
        use std::fs;
        
        let metadata = fs::metadata(path)
            .map_err(|e| format!("ファイルメタデータの取得に失敗: {}", e))?;

        let modified_time = metadata
            .modified()
            .map_err(|e| format!("ファイル更新時刻の取得に失敗: {}", e))?
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| format!("UNIX時刻への変換に失敗: {}", e))?
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

    /// ファイルが変更されたかどうかを確認
    pub fn is_file_changed(&self) -> Result<bool, String> {
        use std::fs;
        
        let metadata = fs::metadata(&self.path)
            .map_err(|e| format!("ファイルメタデータの取得に失敗: {}", e))?;

        let current_size = metadata.len();
        let current_modified_time = metadata
            .modified()
            .map_err(|e| format!("ファイル更新時刻の取得に失敗: {}", e))?
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| format!("UNIX時刻への変換に失敗: {}", e))?
            .as_secs();

        Ok(current_size != self.file_size || current_modified_time != self.modified_time)
    }

    /// キャッシュキーを生成
    pub fn get_cache_key(&self) -> String {
        format!("{}_{}_{}_{}", self.path, self.file_size, self.modified_time, self.width * self.height)
    }

    /// 基本的な検証を実行
    pub fn validate(&self) -> bool {
        !self.path.is_empty() && 
        self.file_size > 0 && 
        self.width > 0 && 
        self.height > 0 &&
        !self.mime_type.is_empty()
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
