use super::ThumbnailGeneratorConfig;
use image::{GenericImageView, imageops::FilterType};
use tokio::fs::File;
use tokio::io::AsyncReadExt;
use webp::Encoder;

/// Handles asynchronous thumbnail generation
pub struct ThumbnailGenerator {
    config: ThumbnailGeneratorConfig,
}

impl ThumbnailGenerator {
    pub fn new(config: ThumbnailGeneratorConfig) -> Self {
        Self { config }
    }

    /// Generate thumbnail from file path asynchronously
    pub async fn generate_from_path(&self, image_path: &str) -> Result<Vec<u8>, String> {
        // Read file asynchronously
        let mut file = File::open(image_path)
            .await
            .map_err(|e| format!("Failed to open file {}: {}", image_path, e))?;

        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer)
            .await
            .map_err(|e| format!("Failed to read file {}: {}", image_path, e))?;

        // Process image in blocking task
        let config = self.config.clone();
        let thumbnail_data =
            tokio::task::spawn_blocking(move || Self::process_image_buffer(buffer, config))
                .await
                .map_err(|e| format!("Task join error: {}", e))?
                .map_err(|e| format!("Image processing error: {}", e))?;

        Ok(thumbnail_data)
    }

    /// Process image buffer and generate thumbnail
    fn process_image_buffer(
        buffer: Vec<u8>,
        config: ThumbnailGeneratorConfig,
    ) -> Result<Vec<u8>, String> {
        // Load image from memory
        let img = image::load_from_memory(&buffer)
            .map_err(|e| format!("Failed to load image from memory: {}", e))?;

        // Generate thumbnail with progressive resize
        let thumbnail = Self::resize_image_optimized(img, config.size);
        let (thumbnail_width, thumbnail_height) = thumbnail.dimensions();

        // Convert to RGBA byte array
        let rgba_image = thumbnail.to_rgba8();
        let rgba_data = rgba_image.as_raw();

        // Convert to WebP
        let encoder = Encoder::from_rgba(rgba_data, thumbnail_width, thumbnail_height);
        let webp_memory = encoder.encode(config.quality as f32);
        let webp_data = webp_memory.to_vec();

        Ok(webp_data)
    }

    /// Optimized progressive resize
    fn resize_image_optimized(img: image::DynamicImage, target_size: u32) -> image::DynamicImage {
        let (width, height) = img.dimensions();
        let max_dimension = width.max(height);

        if max_dimension > 512 {
            // Large image: progressive resize
            let intermediate_size = (target_size * 4).min(512);
            let intermediate =
                img.resize(intermediate_size, intermediate_size, FilterType::Triangle);
            intermediate.thumbnail(target_size, target_size)
        } else {
            // Small image: direct resize
            img.thumbnail(target_size, target_size)
        }
    }
}
