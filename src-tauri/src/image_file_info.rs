use std::os::unix::fs::MetadataExt;

use serde::{Deserialize, Serialize};

/// Basic image file information (including metadata)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ImageFileInfo {
    pub file_size: u64,
    pub modified_time: u64, // UNIX timestamp
    pub width: u32,
    pub height: u32,
    pub mime_type: String,
}

impl ImageFileInfo {
    /// Build image file information from ImageReader
    pub fn from_reader(
        reader: &crate::image_loader::ImageReader,
        path: &str,
    ) -> Result<Self, String> {
        use std::fs;

        let (width, height) = reader.get_dimensions()?;
        let mime_type = reader.mime_type();

        // Get filesystem information
        let metadata =
            fs::metadata(path).map_err(|e| format!("Failed to get file metadata: {}", e))?;
        let modified_time = metadata
            .modified()
            .map_err(|e| format!("Failed to get file modified time: {}", e))?
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| format!("Failed to convert to UNIX time: {}", e))?
            .as_secs();
        let file_size = metadata.size();

        Ok(ImageFileInfo {
            file_size,
            modified_time,
            width,
            height,
            mime_type,
        })
    }

    /// Create from dimensions and path (for cache)
    pub fn from_dimensions(
        path: &str,
        width: u32,
        height: u32,
        mime_type: String,
    ) -> Result<Self, String> {
        use std::fs;

        // Get filesystem information
        let metadata =
            fs::metadata(path).map_err(|e| format!("Failed to get file metadata: {}", e))?;
        let modified_time = metadata
            .modified()
            .map_err(|e| format!("Failed to get file modified time: {}", e))?
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| format!("Failed to convert to UNIX time: {}", e))?
            .as_secs();
        let file_size = metadata.size();

        Ok(ImageFileInfo {
            file_size,
            modified_time,
            width,
            height,
            mime_type,
        })
    }
}
