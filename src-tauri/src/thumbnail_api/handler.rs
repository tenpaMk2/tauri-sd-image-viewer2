use super::cache_manager::ThumbnailCacheManager;
use super::generator::ThumbnailGenerator;
use super::{BatchThumbnailResult, ImageMetadataCache, ThumbnailConfig};
use crate::image_loader::ImageReader;
use rayon::prelude::*;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, Runtime};

/// Thumbnail processing orchestration handler
pub struct ThumbnailProcessingHandler {
    generator: ThumbnailGenerator,
    cache_manager: ThumbnailCacheManager,
}

impl ThumbnailProcessingHandler {
    /// Create new thumbnail processing handler
    pub fn new<R: Runtime>(config: ThumbnailConfig, app: &AppHandle<R>) -> Result<Self, String> {
        let cache_dir = Self::get_cache_directory(app)?;

        // Create cache directory
        if !cache_dir.exists() {
            println!(
                "📁 Creating thumbnail cache directory: {}",
                cache_dir.display()
            );
            fs::create_dir_all(&cache_dir).map_err(|e| {
                println!(
                    "❌ Failed to create thumbnail cache directory: {} - {}",
                    cache_dir.display(),
                    e
                );
                format!("Failed to create thumbnail cache directory: {}", e)
            })?;
            println!("✅ Thumbnail cache directory created successfully");
        } else {
            println!(
                "📁 Thumbnail cache directory exists: {}",
                cache_dir.display()
            );
        }

        let generator = ThumbnailGenerator::new(config.clone());
        let cache_manager = ThumbnailCacheManager::new(cache_dir);

        Ok(Self {
            generator,
            cache_manager,
        })
    }

    /// Get thumbnail cache directory path
    pub fn get_cache_directory<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
        app.path()
            .app_cache_dir()
            .map(|cache_dir| cache_dir.join("thumbnails"))
            .map_err(|e| format!("Failed to get thumbnail cache directory: {}", e))
    }

    /// Process thumbnails in batch (returns image metadata cache only)
    pub fn process_thumbnails_batch<R: Runtime>(
        &self,
        image_paths: &[String],
        _app: &AppHandle<R>,
    ) -> Vec<BatchThumbnailResult> {
        image_paths
            .par_iter()
            .map(|path| self.process_single_thumbnail(path))
            .collect()
    }

    /// Process single thumbnail (path only)
    fn process_single_thumbnail(&self, path: &str) -> BatchThumbnailResult {
        let cache_key = self.cache_manager.generate_cache_key(path);
        let config = self.generator.get_config();

        let result = self.load_or_generate_image_metadata_cache(path, &cache_key, &config);

        match result {
            Ok(metadata_cache) => BatchThumbnailResult {
                path: path.to_string(),
                metadata_cache: Some(metadata_cache),
                error: None,
            },
            Err(e) => BatchThumbnailResult {
                path: path.to_string(),
                metadata_cache: None,
                error: Some(e),
            },
        }
    }

    /// Load or generate image metadata cache
    fn load_or_generate_image_metadata_cache(
        &self,
        original_path: &str,
        cache_key: &str,
        config: &ThumbnailConfig,
    ) -> Result<ImageMetadataCache, String> {
        // Check if thumbnail cache should be regenerated
        if !self
            .cache_manager
            .should_regenerate_thumbnail_cache(cache_key, original_path, config)
        {
            let thumbnail_path = self.cache_manager.get_thumbnail_path(cache_key);
            let thumbnail_path_string = thumbnail_path.to_string_lossy().to_string();

            // Debug: Check thumbnail path details (test readability)
            let can_read = std::fs::metadata(&thumbnail_path).is_ok();
            println!(
                "🔍 Thumbnail path details: image_path={}, cache_key={}, thumbnail_path={}, exists={}, readable={}",
                original_path,
                cache_key,
                thumbnail_path_string,
                thumbnail_path.exists(),
                can_read
            );

            // Load image metadata cache
            let cache_info = self
                .cache_manager
                .load_cached_image_metadata_with_result(cache_key)?;
            return Ok(cache_info);
        }

        // Generate new thumbnail
        let metadata_cache = self.generate_and_save_thumbnail(original_path, cache_key, config)?;

        // Debug: Check new generation thumbnail path (test readability)
        let _thumbnail_path_obj = std::path::Path::new(&metadata_cache.thumbnail_filename);
        let thumbnail_path = self.cache_manager.get_thumbnail_path(cache_key);
        let can_read = std::fs::metadata(&thumbnail_path).is_ok();
        println!(
            "🆕 New generation thumbnail path: image_path={}, cache_key={}, thumbnail_path={}, exists={}, readable={}",
            original_path,
            cache_key,
            thumbnail_path.display(),
            thumbnail_path.exists(),
            can_read
        );

        Ok(metadata_cache)
    }

    /// Generate thumbnail and save to cache (comprehensive integrated version, maximum efficiency)
    fn generate_and_save_thumbnail(
        &self,
        image_path: &str,
        cache_key: &str,
        config: &ThumbnailConfig,
    ) -> Result<ImageMetadataCache, String> {
        // Load with unified image reader (once only, all formats with mmap support)
        let reader = ImageReader::from_file(image_path)?;

        // Generate comprehensive thumbnail (all from existing reader: image, resolution, metadata)
        let bundle = self
            .generator
            .generate_comprehensive_thumbnail(&reader, image_path)?;

        // Save thumbnail image to file
        let thumbnail_filename = format!("{}.{}", cache_key, config.format);
        self.cache_manager
            .save_thumbnail_file(cache_key, &bundle.data)?;

        // Generate comprehensive cache information (all reused, no additional reads)
        let cache_info = ImageMetadataCache::from_comprehensive(
            image_path,
            config,
            thumbnail_filename,
            bundle.thumbnail_width,
            bundle.thumbnail_height,
            bundle.mime_type.clone(),
            bundle.original_width,
            bundle.original_height,
            bundle.mime_type,
            &bundle.metadata_info,
        )?;

        // Save image metadata cache to JSON file
        self.cache_manager
            .save_image_metadata_cache(cache_key, &cache_info)?;

        Ok(cache_info)
    }

    /// Clear thumbnail cache
    pub fn clear_thumbnail_cache<R: Runtime>(&self, _app: &AppHandle<R>) -> Result<(), String> {
        self.cache_manager.clear_thumbnail_cache()
    }
}

/// Thumbnail state management structure
pub struct ThumbnailState {
    pub handler: ThumbnailProcessingHandler,
}

impl ThumbnailState {
    /// Create new ThumbnailState
    pub fn new<R: Runtime>(config: ThumbnailConfig, app: &AppHandle<R>) -> Result<Self, String> {
        let handler = ThumbnailProcessingHandler::new(config, app)?;
        Ok(Self { handler })
    }
}
