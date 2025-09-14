use crate::image_file_lock_service::ImageFileLockService;
use tauri::{AppHandle, Manager};
use tokio::sync::Mutex as AsyncMutex;

/// Async image reader service
pub struct AsyncImageReaderService;

impl AsyncImageReaderService {
    /// Create new async image reader service
    pub fn new() -> Self {
        Self
    }

    /// Read image file data asynchronously
    pub async fn read_image(
        &self,
        image_path: String,
        app_handle: AppHandle,
    ) -> Result<Vec<u8>, String> {
        // Get file lock service from app state
        let mutex = app_handle.state::<AsyncMutex<ImageFileLockService>>();
        let mut image_file_lock_service = mutex.lock().await;

        // Get path-specific mutex
        let path_mutex = image_file_lock_service.get_or_create_path_mutex(&image_path);
        drop(image_file_lock_service); // Release service lock immediately

        // Read image with exclusive file access
        ImageFileLockService::with_exclusive_file_access(
            path_mutex,
            image_path.clone(),
            |path| async move {
                // Read image file as bytes
                tokio::fs::read(&path)
                    .await
                    .map_err(|e| format!("Failed to read image file '{}': {}", path, e))
            },
        )
        .await
    }
}

impl Default for AsyncImageReaderService {
    fn default() -> Self {
        Self::new()
    }
}
