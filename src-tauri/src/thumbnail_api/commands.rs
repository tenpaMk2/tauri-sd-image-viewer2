use super::*;
use tauri::State;

/// Generate thumbnail asynchronously with channel transfer
#[tauri::command]
pub async fn generate_thumbnail_async(
    image_path: String,
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

/// Clear thumbnail cache (Tauri command)
#[tauri::command]
pub async fn clear_thumbnail_cache(
    thumbnail_service: State<'_, AsyncThumbnailService>,
) -> Result<String, String> {
    thumbnail_service.clear_cache().await
}
