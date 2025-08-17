use super::png_handler;
use super::sd_parameters::SdParameters;
use super::xmp_handler;
use crate::image_loader::ImageReader;
use serde::{Deserialize, Serialize};
use std::fs;

/// Comprehensive image metadata information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageMetadataInfo {
    pub width: u32,
    pub height: u32,
    pub file_size: u64,
    pub mime_type: String,
    pub sd_parameters: Option<SdParameters>,
    pub rating: Option<u8>, // XMP Rating from xmp_handler
}

impl ImageMetadataInfo {
    /// Build comprehensive metadata information from ImageReader
    pub fn from_reader(reader: &ImageReader, path: &str) -> Result<Self, String> {
        // Get file size from filesystem metadata
        let file_size = fs::metadata(path)
            .map_err(|e| format!("Failed to get file metadata: {}", e))?
            .len();
        
        // Get image dimensions
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
        
        // Get XMP Rating information 
        let rating = Self::extract_xmp_rating_from_reader(reader, path);

        Ok(ImageMetadataInfo {
            width,
            height,
            file_size,
            mime_type,
            sd_parameters,
            rating,
        })
    }

    /// Extract XMP Rating from ImageReader (PNG and JPEG support)
    fn extract_xmp_rating_from_reader(reader: &ImageReader, path: &str) -> Option<u8> {
        let mime_type = reader.mime_type();
        let file_extension = path.split('.').last().unwrap_or("").to_lowercase();
        
        // Support PNG and JPEG files for XMP rating extraction
        if matches!(mime_type.as_str(), "image/png" | "image/jpeg") && matches!(file_extension.as_str(), "png" | "jpg" | "jpeg") {
            // Extract existing XMP and parse rating
            if let Some(xmp_content) = xmp_handler::extract_existing_xmp(reader.as_bytes(), &file_extension) {
                Self::parse_xmp_rating(&xmp_content)
            } else {
                None
            }
        } else {
            None
        }
    }

    /// Parse rating from XMP content using xmp-toolkit
    fn parse_xmp_rating(xmp_content: &str) -> Option<u8> {
        // Use xmp-toolkit for robust parsing (preferred method)
        if let Some(rating) = xmp_handler::extract_rating_from_xmp_toolkit(xmp_content) {
            if rating <= 5 {
                return Some(rating as u8);
            }
        }
        
        // Fallback to regex parsing for backwards compatibility
        let rating_pattern = r#"xmp:Rating="(\d+)""#;
        let rating_re = regex::Regex::new(rating_pattern).ok()?;
        
        if let Some(captures) = rating_re.captures(xmp_content) {
            if let Some(rating_match) = captures.get(1) {
                rating_match.as_str().parse::<u8>().ok()
            } else {
                None
            }
        } else {
            None
        }
    }

}