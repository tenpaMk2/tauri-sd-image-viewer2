mod config;
mod generator;
mod thumbnail_service;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Runtime};

// Public exports from submodules
pub use config::*;
pub use thumbnail_service::*;

/// Thumbnail generation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThumbnailResult {
    pub original_path: String,
    pub thumbnail_path: Option<String>,
    pub error: Option<String>,
}

/// Generate thumbnails in batch (Tauri command)
#[tauri::command]
pub async fn generate_thumbnails_batch<R: Runtime>(
    image_paths: Vec<String>,
    config: Option<ThumbnailConfig>,
    _app: AppHandle<R>,
    state: tauri::State<'_, ThumbnailState>,
) -> Result<Vec<ThumbnailResult>, String> {
    let _thumbnail_config = config.unwrap_or_default();
    println!("Generating thumbnails for {} files", image_paths.len());

    let results = state.service.generate_batch(&image_paths);

    let success_count = results
        .iter()
        .filter(|r| r.thumbnail_path.is_some())
        .count();
    let error_count = results.iter().filter(|r| r.error.is_some()).count();
    println!(
        "Thumbnail generation complete: success={}, errors={}",
        success_count, error_count
    );

    Ok(results)
}

/// Clear thumbnail cache (Tauri command)
#[tauri::command]
pub async fn clear_thumbnail_cache<R: Runtime>(
    _app: AppHandle<R>,
    state: tauri::State<'_, ThumbnailState>,
) -> Result<(), String> {
    state.service.clear_all()
}
