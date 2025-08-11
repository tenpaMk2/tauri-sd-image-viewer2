use super::ThumbnailConfig;
use crate::image_loader::ImageReader;
use crate::image_metadata_info::ImageMetadataInfo;
use image::GenericImageView;
use image::imageops::FilterType;
use std::time::Instant;
use webp::Encoder;

/// Thumbnail bundle (temporary comprehensive information)
#[derive(Debug, Clone)]
pub struct ThumbnailBundle {
    pub data: Vec<u8>,
    pub thumbnail_width: u32,
    pub thumbnail_height: u32,
    pub mime_type: String,
    pub original_width: u32,
    pub original_height: u32,
    pub metadata_info: ImageMetadataInfo,
}

// Default implementation moved to thumbnail_config.rs

/// Handles thumbnail generation
pub struct ThumbnailGenerator {
    config: ThumbnailConfig,
}

impl ThumbnailGenerator {
    pub fn new(config: ThumbnailConfig) -> Self {
        Self { config }
    }

    pub fn get_config(&self) -> &ThumbnailConfig {
        &self.config
    }

    /// Generate comprehensive thumbnail (metadata integrated version, processed from ImageReader)
    pub fn generate_comprehensive_thumbnail(
        &self,
        reader: &ImageReader,
        image_path: &str,
    ) -> Result<ThumbnailBundle, String> {
        let start_time = Instant::now();

        // Get lightweight dimensions
        let (original_width, original_height) = reader.get_dimensions()?;

        // Convert to DynamicImage (for thumbnail processing)
        let img = reader.to_dynamic_image()?;

        // Generate thumbnail with progressive resize
        let resize_start = Instant::now();
        let thumbnail = self.resize_image_optimized(img, self.config.size);
        let (thumbnail_width, thumbnail_height) = thumbnail.dimensions();
        let _resize_duration = resize_start.elapsed();

        // Convert to RGBA byte array
        let rgba_start = Instant::now();
        let rgba_image = thumbnail.to_rgba8();
        let rgba_data = rgba_image.as_raw();
        let _rgba_duration = rgba_start.elapsed();

        // Convert to WebP
        let webp_start = Instant::now();
        let encoder = Encoder::from_rgba(rgba_data, thumbnail_width, thumbnail_height);
        let webp_memory = encoder.encode(self.config.quality as f32);
        let webp_data = webp_memory.to_vec();
        let _webp_duration = webp_start.elapsed();

        // Get metadata (from existing ImageReader, no duplicate reads)
        let metadata_start = Instant::now();
        let metadata_info = ImageMetadataInfo::from_reader(reader, image_path)?;
        let _metadata_duration = metadata_start.elapsed();

        let _total_duration = start_time.elapsed();

        println!(
            "🚀 Comprehensive thumbnail generation complete: path={}, thumbnail={}x{}, original={}x{}, has_exif={}, has_sd={}",
            image_path,
            thumbnail_width,
            thumbnail_height,
            original_width,
            original_height,
            metadata_info.exif_info.is_some(),
            metadata_info.sd_parameters.is_some()
        );

        Ok(ThumbnailBundle {
            data: webp_data,
            thumbnail_width,
            thumbnail_height,
            mime_type: "image/webp".to_string(),
            original_width,
            original_height,
            metadata_info,
        })
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
