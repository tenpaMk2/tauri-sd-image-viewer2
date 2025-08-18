use super::png_handler;
use super::sd_parameters::SdParameters;
use super::xmp_handler;
use image::GenericImageView;
use serde::{Deserialize, Serialize};
use tokio::fs as async_fs;

/// Comprehensive image metadata information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageMetadata {
    pub width: u32,
    pub height: u32,
    pub file_size: u64,
    pub mime_type: String,
    pub sd_parameters: Option<SdParameters>,
    pub rating: Option<u8>, // XMP Rating from xmp_handler
}

impl ImageMetadata {
    /// Build comprehensive metadata information from file path using async I/O
    pub async fn from_file_async(path: &str) -> Result<Self, String> {
        // Get file metadata asynchronously
        let metadata = async_fs::metadata(path)
            .await
            .map_err(|e| format!("Failed to get file metadata: {}", e))?;
        let file_size = metadata.len();

        // Detect MIME type from path
        let mime_type = crate::common::detect_mime_type_from_path(path);

        // Read entire file once
        let file_data = async_fs::read(path)
            .await
            .map_err(|e| format!("Failed to read file: {}", e))?;

        // Get image dimensions using image crate (much simpler and more reliable)
        let image_data_clone = file_data.clone();
        let (width, height) = tokio::task::spawn_blocking(move || {
            let img = image::load_from_memory(&image_data_clone)
                .map_err(|e| format!("Failed to load image: {}", e))?;
            Ok::<(u32, u32), String>(img.dimensions())
        })
        .await
        .map_err(|e| format!("Image loading task failed: {}", e))??;

        // Get SD Parameters (PNG only) from the same file data
        let sd_parameters = if mime_type == "image/png" {
            tokio::task::spawn_blocking(move || {
                png_handler::extract_sd_parameters_from_png(&file_data)
            })
            .await
            .map_err(|e| format!("PNG SD parameter extraction task failed: {}", e))?
            .unwrap_or(None)
        } else {
            None
        };

        // Get XMP Rating information in blocking task
        let path_clone = path.to_string();
        let rating = tokio::task::spawn_blocking(move || {
            xmp_handler::extract_rating_from_file(&path_clone).map(|r| r as u8)
        })
        .await
        .map_err(|e| format!("XMP rating extraction failed: {}", e))?;

        Ok(ImageMetadata {
            width,
            height,
            file_size,
            mime_type,
            sd_parameters,
            rating,
        })
    }
}
