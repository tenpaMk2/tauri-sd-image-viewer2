mod config;
mod generator;
mod thumbnail_service;

use tauri::State;

// Public exports from submodules
pub use config::*;
pub use thumbnail_service::*;

/// Generate thumbnail asynchronously with channel transfer
#[tauri::command]
pub async fn generate_thumbnail_async(
    image_path: String,
    _config: Option<ThumbnailConfig>,
    app_handle: tauri::AppHandle,
    thumbnail_service: State<'_, AsyncThumbnailService>,
    channel: tauri::ipc::Channel<Vec<u8>>,
) -> Result<(), String> {
    // Generate thumbnail
    let result = thumbnail_service.generate(image_path, app_handle).await?;
    
    // Send thumbnail data through channel
    channel
        .send(result.thumbnail_data)
        .map_err(|e| format!("Failed to send thumbnail data: {}", e))?;
    
    Ok(())
}
