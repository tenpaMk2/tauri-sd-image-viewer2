use super::png_handler;
use super::sd_parameters::SdParameters;
use super::xmp_handler;
use crate::image_loader::ImageReader;
use serde::{Deserialize, Serialize};
use std::fs;

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
    /// Build comprehensive metadata information from ImageReader
    pub fn from_reader(reader: &ImageReader, path: &str) -> Result<Self, String> {
        // Get file size from filesystem metadata
        let file_size = fs::metadata(path)
            .map_err(|e| format!("Failed to get file metadata: {}", e))?
            .len();

        // Get image dimensions
        let (width, height) = reader
            .get_dimensions()
            .map_err(|e| format!("Resolution acquisition failed: {}", e))?;

        // Get SD Parameters (PNG only)
        let mime_type = reader.mime_type();
        let sd_parameters = if mime_type == "image/png" {
            match png_handler::extract_sd_parameters_from_png(reader.as_bytes()) {
                Ok(sd) => sd,
                Err(_) => None,
            }
        } else {
            None
        };

        // Get XMP Rating information
        let rating = xmp_handler::extract_rating_from_file(path).map(|r| r as u8);

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
