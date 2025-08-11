mod cache_manager;
mod config;
mod generator;
mod handler;
mod metadata_cache;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Runtime};

// Public exports from submodules
pub use config::*;
pub use handler::*;
pub use metadata_cache::*;

/// Batch thumbnail result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchThumbnailResult {
    pub path: String,
    pub metadata_cache: Option<ImageMetadataCache>,
    pub error: Option<String>,
}

/// Generate or load thumbnails in batch (Tauri command)
#[tauri::command]
pub async fn load_thumbnail_paths_batch<R: Runtime>(
    image_paths: Vec<String>,
    app: AppHandle<R>,
    state: tauri::State<'_, ThumbnailState>,
) -> Result<Vec<BatchThumbnailResult>, String> {
    println!("Batch processing (paths only): {} files", image_paths.len());

    let results = state.handler.process_thumbnails_batch(&image_paths, &app);

    let success_count = results
        .iter()
        .filter(|r| r.metadata_cache.is_some())
        .count();
    let error_count = results.iter().filter(|r| r.error.is_some()).count();
    println!(
        "Batch complete (paths only): success={}, errors={}",
        success_count, error_count
    );

    Ok(results)
}

/// Clear thumbnail cache (Tauri command)
#[tauri::command]
pub async fn clear_thumbnail_cache<R: Runtime>(
    app: AppHandle<R>,
    state: tauri::State<'_, ThumbnailState>,
) -> Result<(), String> {
    state.handler.clear_thumbnail_cache(&app)
}
