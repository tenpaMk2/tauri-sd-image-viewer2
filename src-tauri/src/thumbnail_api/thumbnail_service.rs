use super::generator::ThumbnailGenerator;
use super::ThumbnailConfig;
use crate::image_file_lock_service::ImageFileLockService;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
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
}

impl AsyncThumbnailService {
    /// Create new async thumbnail service
    pub fn new(config: ThumbnailConfig) -> Self {
        let generator = ThumbnailGenerator::new(config);
        Self { generator }
    }

    /// Generate single thumbnail asynchronously
    pub async fn generate(
        &self,
        image_path: String,
        app_handle: AppHandle,
    ) -> Result<AsyncThumbnailResult, String> {
        // Get file lock service from app state
        let mutex = app_handle.state::<AsyncMutex<ImageFileLockService>>();
        let mut image_file_lock_service = mutex.lock().await;

        // Get path-specific mutex
        let path_mutex = image_file_lock_service.get_or_create_path_mutex(&image_path);
        drop(image_file_lock_service); // Release service lock immediately

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

        Ok(AsyncThumbnailResult {
            original_path: image_path,
            thumbnail_data,
        })
    }
}
