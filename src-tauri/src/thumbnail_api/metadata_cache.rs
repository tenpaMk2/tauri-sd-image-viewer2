use super::ThumbnailConfig;
use crate::exif_api::ExifInfo;
use crate::image_file_info::ImageFileInfo;
use crate::sd_parameters::SdParameters;
use serde::{Deserialize, Serialize};

/// Comprehensive image metadata cache (saved as JSON file)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageMetadataCache {
    /// Configuration used when cache was created
    pub thumbnail_config: ThumbnailConfig,
    /// Original image file information
    pub original_file_info: ImageFileInfo,
    /// Thumbnail image filename
    pub thumbnail_filename: String,
    /// Thumbnail dimensions and format
    pub thumbnail_width: u32,
    pub thumbnail_height: u32,
    pub thumbnail_mime_type: String,
    /// Metadata information
    pub rating: Option<u8>,
    pub exif_info: Option<ExifInfo>,
    pub sd_parameters: Option<SdParameters>,
    /// Cache creation timestamp
    pub cached_at: u64, // UNIX timestamp
}

impl ImageMetadataCache {
    /// Create image metadata cache from comprehensive data
    pub fn from_comprehensive(
        image_path: &str,
        config: &ThumbnailConfig,
        thumbnail_filename: String,
        thumbnail_width: u32,
        thumbnail_height: u32,
        thumbnail_mime_type: String,
        original_width: u32,
        original_height: u32,
        original_mime_type: String,
        metadata_info: &crate::image_metadata_info::ImageMetadataInfo,
    ) -> Result<Self, String> {
        // Get file information
        let original_file_info = ImageFileInfo::from_dimensions(
            image_path,
            original_width,
            original_height,
            original_mime_type,
        )?;

        let current_time = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        Ok(ImageMetadataCache {
            thumbnail_config: config.clone(),
            original_file_info,
            thumbnail_filename,
            thumbnail_width,
            thumbnail_height,
            thumbnail_mime_type,
            rating: metadata_info
                .exif_info
                .as_ref()
                .and_then(|exif| exif.rating),
            exif_info: metadata_info.exif_info.clone(),
            sd_parameters: metadata_info.sd_parameters.clone(),
            cached_at: current_time,
        })
    }
}
