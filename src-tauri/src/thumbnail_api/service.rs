use super::ThumbnailGeneratorConfig;
use super::generator::ThumbnailGenerator;
use crate::common::log_with_timestamp;
use crate::image_file_lock_service::ImageFileLockService;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tokio::fs as async_fs;
use tokio::sync::Mutex as AsyncMutex;

/// Thumbnail generation result for async operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AsyncThumbnailResult {
    pub original_path: String,
    pub thumbnail_data: Vec<u8>,
}

/// Async thumbnail service
pub struct AsyncThumbnailService {
    generator: ThumbnailGenerator,
    cache_dir: PathBuf,
}

impl AsyncThumbnailService {
    /// Create new async thumbnail service
    pub fn new(
        generator_config: ThumbnailGeneratorConfig,
        cache_dir: PathBuf,
    ) -> Result<Self, String> {
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

        let generator = ThumbnailGenerator::new(generator_config);
        Ok(Self {
            generator,
            cache_dir,
        })
    }

    /// Generate single thumbnail asynchronously
    pub async fn generate(
        &self,
        image_path: String,
        app_handle: AppHandle,
    ) -> Result<AsyncThumbnailResult, String> {
        let cache_filename = self.generate_cache_filename(&image_path);

        log_with_timestamp(&image_path, "Judge thumbnail regeneration 🟢");
        // Check if thumbnail should be regenerated
        if !self
            .should_regenerate_thumbnail(&cache_filename, &image_path, &app_handle)
            .await
        {
            log_with_timestamp(&image_path, "Judge thumbnail regeneration 🟥");

            log_with_timestamp(&image_path, "Loading thumbnail from cache 🟢");
            // Load from cache
            if let Ok(thumbnail_data) = self
                .load_thumbnail_from_cache(&cache_filename, &app_handle)
                .await
            {
                log_with_timestamp(&image_path, "Loading thumbnail from cache 🟥");
                return Ok(AsyncThumbnailResult {
                    original_path: image_path,
                    thumbnail_data,
                });
            }
        }
        log_with_timestamp(&image_path, "Judge thumbnail regeneration 🟥");

        log_with_timestamp(&image_path, "Lock 🟢");

        // Get file lock service from app state
        let mutex = app_handle.state::<AsyncMutex<ImageFileLockService>>();
        let mut image_file_lock_service = mutex.lock().await;

        // Get path-specific mutex
        let path_mutex = image_file_lock_service.get_or_create_path_mutex(&image_path);
        drop(image_file_lock_service); // Release service lock immediately

        log_with_timestamp(&image_path, "Lock 🟥");

        log_with_timestamp(&image_path, "File processing 🟢");
        // Execute file operation with exclusive access
        let thumbnail_data = ImageFileLockService::with_exclusive_file_access(
            path_mutex,
            image_path.clone(),
            |path| async move {
                // Generate thumbnail
                self.generator.generate_from_path(&path).await
            },
        )
        .await?;

        log_with_timestamp(&image_path, "File processing 🟥");

        // Save to cache asynchronously (don't await to speed up response)
        let cache_dir_clone = self.cache_dir.clone();
        let cache_filename_clone = cache_filename.clone();
        let thumbnail_data_clone = thumbnail_data.clone();
        let app_handle_clone = app_handle.clone();
        tokio::spawn(async move {
            if let Err(e) = Self::save_thumbnail_to_cache(
                cache_dir_clone,
                &cache_filename_clone,
                &thumbnail_data_clone,
                &app_handle_clone,
            )
            .await
            {
                println!("⚠️ Failed to save thumbnail to cache: {}", e);
            }
        });

        Ok(AsyncThumbnailResult {
            original_path: image_path,
            thumbnail_data,
        })
    }

    /// Generate cache filename from image path
    fn generate_cache_filename(&self, image_path: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(image_path.as_bytes());
        hex::encode(hasher.finalize())[..16].to_string()
    }

    /// Get thumbnail cache file path
    fn get_thumbnail_cache_path(&self, cache_filename: &str) -> PathBuf {
        self.cache_dir.join(format!("{}.webp", cache_filename))
    }

    /// Check if thumbnail should be regenerated
    async fn should_regenerate_thumbnail(
        &self,
        cache_filename: &str,
        original_path: &str,
        app_handle: &AppHandle,
    ) -> bool {
        let cache_path = self.get_thumbnail_cache_path(cache_filename);

        // Check if cache file exists
        if !cache_path.exists() {
            return true;
        }

        // Get file lock service from app state
        let mutex = app_handle.state::<AsyncMutex<ImageFileLockService>>();
        let mut image_file_lock_service = mutex.lock().await;

        // Get path-specific mutexes for both original and cache files
        let original_path_mutex = image_file_lock_service.get_or_create_path_mutex(original_path);
        let cache_path_str = cache_path.to_string_lossy().to_string();
        let cache_path_mutex = image_file_lock_service.get_or_create_path_mutex(&cache_path_str);
        drop(image_file_lock_service); // Release service lock immediately

        // Get metadata for original file with exclusive access
        let original_meta_result = ImageFileLockService::with_exclusive_file_access(
            original_path_mutex,
            original_path.to_string(),
            |path| async move {
                async_fs::metadata(&path)
                    .await
                    .map_err(|e| format!("Failed to get original file metadata: {}", e))
            },
        )
        .await;

        // Get metadata for cache file with exclusive access
        let cache_meta_result = ImageFileLockService::with_exclusive_file_access(
            cache_path_mutex,
            cache_path_str,
            |path| async move {
                async_fs::metadata(&path)
                    .await
                    .map_err(|e| format!("Failed to get cache file metadata: {}", e))
            },
        )
        .await;

        // Simple change detection: cache is older than original
        match (original_meta_result, cache_meta_result) {
            (Ok(original_meta), Ok(cache_meta)) => {
                let original_modified = original_meta.modified().unwrap_or(std::time::UNIX_EPOCH);
                let cache_modified = cache_meta.modified().unwrap_or(std::time::UNIX_EPOCH);
                original_modified > cache_modified
            }
            _ => true, // Error case: regenerate
        }
    }

    /// Load thumbnail from cache
    async fn load_thumbnail_from_cache(
        &self,
        cache_filename: &str,
        app_handle: &AppHandle,
    ) -> Result<Vec<u8>, String> {
        let cache_path = self.get_thumbnail_cache_path(cache_filename);

        // Get file lock service from app state
        let mutex = app_handle.state::<AsyncMutex<ImageFileLockService>>();
        let mut image_file_lock_service = mutex.lock().await;

        // Get path-specific mutex for cache file
        let cache_path_str = cache_path.to_string_lossy().to_string();
        let cache_path_mutex = image_file_lock_service.get_or_create_path_mutex(&cache_path_str);
        drop(image_file_lock_service); // Release service lock immediately

        // Read cache file with exclusive access
        ImageFileLockService::with_exclusive_file_access(
            cache_path_mutex,
            cache_path_str,
            |path| async move {
                async_fs::read(&path)
                    .await
                    .map_err(|e| format!("Failed to read cache file: {}", e))
            },
        )
        .await
    }

    /// Save thumbnail to cache (static function for use in tokio::spawn)
    async fn save_thumbnail_to_cache(
        cache_dir: PathBuf,
        cache_filename: &str,
        thumbnail_data: &[u8],
        app_handle: &AppHandle,
    ) -> Result<(), String> {
        let cache_path = cache_dir.join(format!("{}.webp", cache_filename));

        // Get file lock service from app state
        let mutex = app_handle.state::<AsyncMutex<ImageFileLockService>>();
        let mut image_file_lock_service = mutex.lock().await;

        // Get path-specific mutex for cache file
        let cache_path_str = cache_path.to_string_lossy().to_string();
        let cache_path_mutex = image_file_lock_service.get_or_create_path_mutex(&cache_path_str);
        drop(image_file_lock_service); // Release service lock immediately

        // Clone thumbnail_data for move into closure
        let thumbnail_data_clone = thumbnail_data.to_vec();
        let cache_filename_clone = cache_filename.to_string();

        // Write cache file with exclusive access
        ImageFileLockService::with_exclusive_file_access(
            cache_path_mutex,
            cache_path_str,
            |path| async move {
                async_fs::write(&path, &thumbnail_data_clone)
                    .await
                    .map_err(|e| format!("Failed to save thumbnail to cache: {}", e))?;

                println!(
                    "✅ Thumbnail saved to cache: {} ({}bytes)",
                    cache_filename_clone,
                    thumbnail_data_clone.len()
                );
                Ok(())
            },
        )
        .await
    }
}
