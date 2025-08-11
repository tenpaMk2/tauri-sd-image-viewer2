use super::ThumbnailConfig;
use crate::image_loader::ImageReader;
use image::{GenericImageView, imageops::FilterType};
use std::time::Instant;
use webp::Encoder;

/// Handles thumbnail generation
pub struct ThumbnailGenerator {
    config: ThumbnailConfig,
}

impl ThumbnailGenerator {
    pub fn new(config: ThumbnailConfig) -> Self {
        Self { config }
    }

    /// Generate thumbnail only (no metadata processing)
    pub fn generate(&self, reader: &ImageReader) -> Result<Vec<u8>, String> {
        let start_time = Instant::now();

        // Convert to DynamicImage (for thumbnail processing)
        let img = reader.to_dynamic_image()?;

        // Generate thumbnail with progressive resize
        let thumbnail = self.resize_image_optimized(img, self.config.size);
        let (thumbnail_width, thumbnail_height) = thumbnail.dimensions();

        // Convert to RGBA byte array
        let rgba_image = thumbnail.to_rgba8();
        let rgba_data = rgba_image.as_raw();

        // Convert to WebP
        let encoder = Encoder::from_rgba(rgba_data, thumbnail_width, thumbnail_height);
        let webp_memory = encoder.encode(self.config.quality as f32);
        let webp_data = webp_memory.to_vec();

        let _total_duration = start_time.elapsed();

        println!(
            "🚀 Thumbnail generation complete: thumbnail={}x{}, size={}bytes",
            thumbnail_width,
            thumbnail_height,
            webp_data.len()
        );

        Ok(webp_data)
    }

    /// Optimized progressive resize
    fn resize_image_optimized(
        &self,
        img: image::DynamicImage,
        target_size: u32,
    ) -> image::DynamicImage {
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
