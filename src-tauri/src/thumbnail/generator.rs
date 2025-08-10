use crate::image_info::read_image_metadata_internal;
use crate::types::{ComprehensiveThumbnail};
use image::imageops::FilterType;
use image::{GenericImageView, ImageFormat};
use memmap2::MmapOptions;
use std::fs::File;
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

    /// 包括的サムネイル生成（メタデータ統合版、1回の読み込みで全て処理）
    pub fn generate_comprehensive_thumbnail(&self, image_path: &str) -> Result<ComprehensiveThumbnail, String> {
        let start_time = Instant::now();

        // 画像ファイルを最適化された方法で読み込み（1回のみ）
        let load_start = Instant::now();
        let img = self.load_image_optimized(image_path)?;
        let _load_duration = load_start.elapsed();

        // 元画像の解像度を取得
        let (original_width, original_height) = img.dimensions();

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

        // メタデータを取得（重複読み込みなし）
        let metadata_start = Instant::now();
        let metadata_info = read_image_metadata_internal(image_path)
            .map_err(|e| format!("メタデータ読み込みに失敗: {}", e))?;
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

    /// 最適化された画像読み込み
    fn load_image_optimized(&self, image_path: &str) -> Result<image::DynamicImage, String> {
        let path_lower = image_path.to_lowercase();

        if path_lower.ends_with(".png") {
            // PNG画像：メモリマップド読み込みを使用
            let file = File::open(image_path)
                .map_err(|e| format!("ファイルオープンに失敗: {} - {}", image_path, e))?;

            let mmap = unsafe {
                MmapOptions::new()
                    .map(&file)
                    .map_err(|e| format!("メモリマップに失敗: {} - {}", image_path, e))?
            };

            image::load_from_memory_with_format(&mmap, ImageFormat::Png)
                .map_err(|e| format!("PNG画像の読み込みに失敗: {} - {}", image_path, e))
        } else {
            // その他の形式：従来の方法
            image::open(image_path)
                .map_err(|e| format!("画像の読み込みに失敗: {} - {}", image_path, e))
        }
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
