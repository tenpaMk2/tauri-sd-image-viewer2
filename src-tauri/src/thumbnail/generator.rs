use crate::image_info::extract_metadata_from_reader;
use crate::image_loader::ImageReader;
use crate::types::{ComprehensiveThumbnail};
use image::imageops::FilterType;
use image::{GenericImageView};
use std::time::Instant;
use webp::Encoder;

use crate::types::ThumbnailConfig;

impl Default for ThumbnailConfig {
    fn default() -> Self {
        Self {
            size: 240,
            quality: 80,
            format: "webp".to_string(),
        }
    }
}

/// サムネイル生成を担当
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

    /// 包括的サムネイル生成（メタデータ統合版、ImageReaderから処理）
    pub fn generate_comprehensive_thumbnail(&self, reader: &ImageReader, image_path: &str) -> Result<ComprehensiveThumbnail, String> {
        let start_time = Instant::now();

        // 軽量解像度取得
        let (original_width, original_height) = reader.get_dimensions()?;

        // DynamicImageに変換（サムネイル処理用）
        let img = reader.to_dynamic_image()?;

        // 段階的リサイズでサムネイル生成
        let resize_start = Instant::now();
        let thumbnail = self.resize_image_optimized(img, self.config.size);
        let (thumbnail_width, thumbnail_height) = thumbnail.dimensions();
        let _resize_duration = resize_start.elapsed();

        // RGBAバイト配列に変換
        let rgba_start = Instant::now();
        let rgba_image = thumbnail.to_rgba8();
        let rgba_data = rgba_image.as_raw();
        let _rgba_duration = rgba_start.elapsed();

        // WebPに変換
        let webp_start = Instant::now();
        let encoder = Encoder::from_rgba(rgba_data, thumbnail_width, thumbnail_height);
        let webp_memory = encoder.encode(self.config.quality as f32);
        let webp_data = webp_memory.to_vec();
        let _webp_duration = webp_start.elapsed();

        // メタデータを取得（既存ImageReaderから、重複読み込みなし）
        let metadata_start = Instant::now();
        let metadata_info = extract_metadata_from_reader(reader, image_path)?;
        let _metadata_duration = metadata_start.elapsed();

        let _total_duration = start_time.elapsed();

        println!("🚀 包括的サムネイル生成完了: path={}, thumbnail={}x{}, original={}x{}, has_exif={}, has_sd={}", 
                 image_path, thumbnail_width, thumbnail_height, original_width, original_height,
                 metadata_info.exif_info.is_some(), metadata_info.sd_parameters.is_some());

        Ok(ComprehensiveThumbnail {
            data: webp_data,
            thumbnail_width,
            thumbnail_height,
            mime_type: "image/webp".to_string(),
            cache_path: None,
            original_width,
            original_height,
            metadata_info,
        })
    }

    /// 最適化された段階的リサイズ
    fn resize_image_optimized(
        &self,
        img: image::DynamicImage,
        target_size: u32,
    ) -> image::DynamicImage {
        let (width, height) = img.dimensions();
        let max_dimension = width.max(height);

        if max_dimension > 512 {
            // 大きな画像：段階的リサイズ
            let intermediate_size = (target_size * 4).min(512);
            let intermediate =
                img.resize(intermediate_size, intermediate_size, FilterType::Triangle);
            intermediate.thumbnail(target_size, target_size)
        } else {
            // 小さな画像：直接リサイズ
            img.thumbnail(target_size, target_size)
        }
    }
}
