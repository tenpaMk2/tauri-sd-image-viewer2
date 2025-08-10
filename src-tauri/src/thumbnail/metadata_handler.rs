use crate::types::{FileSystemInfo, ImageFileInfo, ThumbnailCacheInfo, ThumbnailConfig};
use std::fs;

/// メタデータ処理を担当
pub struct MetadataHandler;

impl MetadataHandler {
    /// 包括的なキャッシュ情報を生成（包括的サムネイル版、最高効率）
    pub fn generate_cache_info_from_comprehensive(
        image_path: &str,
        config: &ThumbnailConfig,
        thumbnail_filename: String,
        comprehensive: &crate::types::ComprehensiveThumbnail,
    ) -> Result<ThumbnailCacheInfo, String> {
        // ファイル情報を取得
        let basic_file_info = Self::get_basic_file_info(image_path)?;
        let original_file_info = ImageFileInfo {
            path: basic_file_info.path,
            file_size: basic_file_info.file_size,
            modified_time: basic_file_info.modified_time,
            width: comprehensive.original_width,
            height: comprehensive.original_height,
            mime_type: comprehensive.mime_type.clone(),
        };

        let current_time = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        Ok(ThumbnailCacheInfo {
            thumbnail_config: config.clone(),
            original_file_info,
            thumbnail_filename,
            rating: comprehensive.metadata_info
                .exif_info
                .as_ref()
                .and_then(|exif| exif.rating),
            exif_info: comprehensive.metadata_info.exif_info.clone(),
            sd_parameters: comprehensive.metadata_info.sd_parameters.clone(),
            cached_at: current_time,
        })
    }

    /// 基本ファイル情報を取得（ファイルシステム情報のみ）
    pub fn get_basic_file_info(image_path: &str) -> Result<FileSystemInfo, String> {
        let metadata = fs::metadata(image_path)
            .map_err(|e| format!("ファイルメタデータの取得に失敗: {}", e))?;

        let modified_time = metadata
            .modified()
            .map_err(|e| format!("ファイル更新時刻の取得に失敗: {}", e))?
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| format!("UNIX時刻への変換に失敗: {}", e))?
            .as_secs();
        
        println!("📏 基本ファイル情報取得完了: path={}, size={}, modified={}", 
                 image_path, metadata.len(), modified_time);

        Ok(FileSystemInfo {
            path: image_path.to_string(),
            file_size: metadata.len(),
            modified_time,
        })
    }
}
