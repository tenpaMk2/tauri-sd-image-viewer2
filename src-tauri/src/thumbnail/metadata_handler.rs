use crate::image_info::read_image_metadata_internal;
use crate::types::{OriginalFileInfo, ThumbnailCacheInfo, ThumbnailConfig};
use std::fs;

/// メタデータ処理を担当
pub struct MetadataHandler;

impl MetadataHandler {
    /// 包括的なキャッシュ情報を生成
    pub fn generate_cache_info(
        image_path: &str,
        config: &ThumbnailConfig,
        thumbnail_filename: String,
    ) -> Result<ThumbnailCacheInfo, String> {
        // 現在のファイル情報を取得
        let original_file_info = Self::get_file_info(image_path)?;

        // 画像のメタデータを読み込み
        let image_metadata = read_image_metadata_internal(image_path)
            .map_err(|e| format!("メタデータ読み込みに失敗: {}", e))?;

        let current_time = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        Ok(ThumbnailCacheInfo {
            thumbnail_config: config.clone(),
            original_file_info,
            thumbnail_filename,
            rating: image_metadata
                .exif_info
                .as_ref()
                .and_then(|exif| exif.rating),
            exif_info: image_metadata.exif_info,
            sd_parameters: image_metadata.sd_parameters,
            cached_at: current_time,
        })
    }

    /// ファイル情報を取得
    fn get_file_info(image_path: &str) -> Result<OriginalFileInfo, String> {
        let metadata = fs::metadata(image_path)
            .map_err(|e| format!("ファイルメタデータの取得に失敗: {}", e))?;

        let modified_time = metadata
            .modified()
            .map_err(|e| format!("ファイル更新時刻の取得に失敗: {}", e))?
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| format!("UNIX時刻への変換に失敗: {}", e))?
            .as_secs();

        // 解像度情報を取得
        let (width, height) = Self::get_image_dimensions(image_path)?;

        Ok(OriginalFileInfo {
            path: image_path.to_string(),
            file_size: metadata.len(),
            width,
            height,
            modified_time,
        })
    }

    /// 画像の解像度を取得
    fn get_image_dimensions(image_path: &str) -> Result<(u32, u32), String> {
        use image::GenericImageView;

        let img = image::open(image_path)
            .map_err(|e| format!("画像の読み込みに失敗: {}", e))?;
        
        let (width, height) = img.dimensions();
        Ok((width, height))
    }
}
