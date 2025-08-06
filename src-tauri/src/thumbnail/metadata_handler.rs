use crate::image_info::read_image_metadata_internal;
use crate::types::CachedMetadata;

/// メタデータ処理を担当
pub struct MetadataHandler;

impl MetadataHandler {
    /// メタデータを生成
    pub fn generate_metadata(image_path: &str) -> Result<CachedMetadata, String> {
        match read_image_metadata_internal(image_path) {
            Ok(image_metadata) => {
                let current_time = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs();

                Ok(CachedMetadata {
                    rating: image_metadata.exif_info.as_ref().and_then(|exif| exif.rating),
                    exif_info: image_metadata.exif_info,
                    cached_at: current_time,
                })
            }
            Err(e) => Err(format!("メタデータ生成に失敗: {}", e)),
        }
    }
}