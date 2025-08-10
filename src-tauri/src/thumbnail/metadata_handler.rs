use crate::types::{OriginalFileInfo, ThumbnailCacheInfo, ThumbnailConfig};
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
        // ファイル情報を取得（解像度は包括的サムネイルから再利用）
        let original_file_info = Self::get_file_info_with_dimensions(
            image_path, 
            comprehensive.original_width, 
            comprehensive.original_height
        )?;

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

    /// ファイル情報を取得（解像度指定版、重複読み込み回避）
    fn get_file_info_with_dimensions(image_path: &str, width: u32, height: u32) -> Result<OriginalFileInfo, String> {
        let metadata = fs::metadata(image_path)
            .map_err(|e| format!("ファイルメタデータの取得に失敗: {}", e))?;

        let modified_time = metadata
            .modified()
            .map_err(|e| format!("ファイル更新時刻の取得に失敗: {}", e))?
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| format!("UNIX時刻への変換に失敗: {}", e))?
            .as_secs();

        println!("📏 ファイル情報取得完了: path={}, size={}, dimensions={}x{}, modified={}", 
                 image_path, metadata.len(), width, height, modified_time);

        Ok(OriginalFileInfo {
            path: image_path.to_string(),
            file_size: metadata.len(),
            width,
            height,
            modified_time,
        })
    }
}
