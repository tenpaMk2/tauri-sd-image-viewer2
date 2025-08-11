use super::generator::ThumbnailGenerator;
use super::{ThumbnailConfig, ThumbnailResult};
use crate::image_loader::ImageReader;
use rayon::prelude::*;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, Runtime};

/// Unified thumbnail service (generation + caching)
pub struct ThumbnailService {
    generator: ThumbnailGenerator,
    cache_dir: PathBuf,
}

impl ThumbnailService {
    /// Create new thumbnail service
    pub fn new<R: Runtime>(config: ThumbnailConfig, app: &AppHandle<R>) -> Result<Self, String> {
        let cache_dir = Self::get_cache_directory(app)?;

        // Create cache directory if needed
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
        }

        let generator = ThumbnailGenerator::new(config);

        Ok(Self {
            generator,
            cache_dir,
        })
    }

    /// Generate thumbnails in batch
    pub fn generate_batch(&self, image_paths: &[String]) -> Vec<ThumbnailResult> {
        image_paths
            .par_iter()
            .map(|path| self.generate_single_thumbnail(path))
            .collect()
    }

    /// Clear thumbnail cache
    pub fn clear_all(&self) -> Result<(), String> {
        if self.cache_dir.exists() {
            self.clear_directory(&self.cache_dir)?;
        }
        Ok(())
    }

    /// Get thumbnail cache directory path
    fn get_cache_directory<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
        app.path()
            .app_cache_dir()
            .map(|cache_dir| cache_dir.join("thumbnails"))
            .map_err(|e| format!("Failed to get thumbnail cache directory: {}", e))
    }

    /// Generate single thumbnail
    fn generate_single_thumbnail(&self, original_path: &str) -> ThumbnailResult {
        let thumbnail_filename = self.generate_filename(original_path);

        // Check if thumbnail should be regenerated
        if !self.should_regenerate_thumbnail(&thumbnail_filename, original_path) {
            // Return cached thumbnail path
            let thumbnail_path = self.get_thumbnail_path(&thumbnail_filename);
            return ThumbnailResult {
                original_path: original_path.to_string(),
                thumbnail_path: Some(thumbnail_path.to_string_lossy().to_string()),
                error: None,
            };
        }

        // Generate new thumbnail
        match self.generate_new_thumbnail(original_path, &thumbnail_filename) {
            Ok(thumbnail_path) => ThumbnailResult {
                original_path: original_path.to_string(),
                thumbnail_path: Some(thumbnail_path),
                error: None,
            },
            Err(e) => ThumbnailResult {
                original_path: original_path.to_string(),
                thumbnail_path: None,
                error: Some(e),
            },
        }
    }

    /// Generate new thumbnail and save to cache
    fn generate_new_thumbnail(&self, image_path: &str, cache_key: &str) -> Result<String, String> {
        // Load image
        let reader = ImageReader::from_file(image_path)?;

        // Generate thumbnail
        let thumbnail_data = self.generator.generate(&reader)?;

        // Save to cache
        self.save_thumbnail_file(cache_key, &thumbnail_data)?;

        // Return path
        let thumbnail_path = self.get_thumbnail_path(cache_key);
        Ok(thumbnail_path.to_string_lossy().to_string())
    }

    /// Generate cache key from file path
    fn generate_filename(&self, image_path: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(image_path.as_bytes());
        hex::encode(hasher.finalize())[..16].to_string()
    }

    /// Get thumbnail file path
    fn get_thumbnail_path(&self, cache_key: &str) -> PathBuf {
        self.cache_dir.join(format!("{}.webp", cache_key))
    }

    /// Check if thumbnail should be regenerated
    fn should_regenerate_thumbnail(&self, thumbnail_filename: &str, original_path: &str) -> bool {
        let thumbnail_path = self.get_thumbnail_path(thumbnail_filename);

        // Check if thumbnail file exists
        if !thumbnail_path.exists() {
            return true;
        }

        // Simple change detection: thumbnail is older than original
        match (fs::metadata(original_path), fs::metadata(&thumbnail_path)) {
            (Ok(original_meta), Ok(thumbnail_meta)) => {
                let original_modified = original_meta.modified().unwrap_or(std::time::UNIX_EPOCH);
                let thumbnail_modified = thumbnail_meta.modified().unwrap_or(std::time::UNIX_EPOCH);
                original_modified > thumbnail_modified
            }
            _ => true, // Error case: regenerate
        }
    }

    /// Save thumbnail file
    fn save_thumbnail_file(&self, cache_key: &str, image_data: &[u8]) -> Result<(), String> {
        let thumbnail_path = self.get_thumbnail_path(cache_key);

        fs::write(&thumbnail_path, image_data)
            .map_err(|e| format!("Failed to save thumbnail file: {}", e))?;

        println!(
            "✅ Thumbnail saved: {} ({}bytes)",
            cache_key,
            image_data.len()
        );
        Ok(())
    }

    /// Clear directory contents
    fn clear_directory(&self, dir: &PathBuf) -> Result<(), String> {
        let entries = fs::read_dir(dir).map_err(|e| format!("Failed to read directory: {}", e))?;

        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                let _ = fs::remove_file(&path);
            }
        }

        Ok(())
    }
}

/// Thumbnail state wrapper for Tauri
pub struct ThumbnailState {
    pub service: ThumbnailService,
}

impl ThumbnailState {
    pub fn new<R: Runtime>(config: ThumbnailConfig, app: &AppHandle<R>) -> Result<Self, String> {
        let service = ThumbnailService::new(config, app)?;
        Ok(Self { service })
    }
}
