use super::exif_handler::ExifInfo;
use super::png_handler;
use super::sd_parameters::SdParameters;
use crate::image_loader::ImageReader;
use serde::{Deserialize, Serialize};

/// Comprehensive image metadata information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageMetadataInfo {
    pub width: u32,
    pub height: u32,
    pub file_size: u64,
    pub mime_type: String,
    pub sd_parameters: Option<SdParameters>,
    pub exif_info: Option<ExifInfo>,
}

impl ImageMetadataInfo {
    /// Build comprehensive metadata information from ImageReader
    pub fn from_reader(reader: &ImageReader, path: &str) -> Result<Self, String> {
        // Get basic information
        let file_size = reader.as_bytes().len() as u64;
        let (width, height) = reader.get_dimensions().map_err(|e| format!("Resolution acquisition failed: {}", e))?;
        
        // Get SD Parameters (PNG only)
        let mime_type = reader.mime_type();
        let sd_parameters = if mime_type == "image/png" {
            match png_handler::extract_sd_parameters(reader.as_bytes()) {
                Ok(sd) => sd,
                Err(_) => None,
            }
        } else {
            None
        };
        
        // Get EXIF information
        let exif_info = Self::extract_exif_info_from_reader(reader, path);

        Ok(ImageMetadataInfo {
            width,
            height,
            file_size,
            mime_type,
            sd_parameters,
            exif_info,
        })
    }

    /// Extract EXIF information from ImageReader
    fn extract_exif_info_from_reader(reader: &ImageReader, path: &str) -> Option<ExifInfo> {
        let mime_type = reader.mime_type();
        if matches!(mime_type.as_str(), "image/png" | "image/jpeg" | "image/webp") {
            let extension = path.split('.').last().unwrap_or("");
            ExifInfo::from_bytes(reader.as_bytes(), extension)
        } else {
            None
        }
    }

}