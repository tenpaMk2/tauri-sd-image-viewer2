use std::collections::HashMap;
use std::future::Future;
use std::sync::Arc;
use tokio::sync::Mutex as AsyncMutex;

/// Image file lock service for managing exclusive access to image files
pub struct ImageFileLockService {
    path_mutexes: HashMap<String, Arc<AsyncMutex<()>>>,
}

impl ImageFileLockService {
    /// Create new image file lock service
    pub fn new() -> Self {
        Self {
            path_mutexes: HashMap::new(),
        }
    }

    /// Get or create path mutex for image file
    pub fn get_or_create_path_mutex(&mut self, image_path: &str) -> Arc<AsyncMutex<()>> {
        if !self.path_mutexes.contains_key(image_path) {
            self.path_mutexes
                .insert(image_path.to_string(), Arc::new(AsyncMutex::new(())));
        }

        self.path_mutexes.get(image_path).unwrap().clone()
    }

    /// Execute operation with exclusive file access
    pub async fn with_exclusive_file_access<F, R, Fut>(
        path_mutex: Arc<AsyncMutex<()>>,
        image_path: String,
        operation: F,
    ) -> Result<R, String>
    where
        F: FnOnce(String) -> Fut,
        Fut: Future<Output = Result<R, String>>,
    {
        let _guard = path_mutex.lock().await;
        operation(image_path).await
    }
}

impl Default for ImageFileLockService {
    fn default() -> Self {
        Self::new()
    }
}