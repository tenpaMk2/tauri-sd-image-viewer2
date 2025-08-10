use crate::types::{ImageFileInfo, ThumbnailCacheInfo, ThumbnailConfig};

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
        let original_file_info = ImageFileInfo::from_file_with_dimensions(
            image_path,
            comprehensive.original_width,
            comprehensive.original_height,
            comprehensive.mime_type.clone(),
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

}
