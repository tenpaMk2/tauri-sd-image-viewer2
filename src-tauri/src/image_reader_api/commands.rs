use super::*;
use tauri::State;

/// Read image file asynchronously with channel transfer
#[tauri::command]
pub async fn read_image_async(
    image_path: String,
    app_handle: tauri::AppHandle,
    image_reader_service: State<'_, AsyncImageReaderService>,
    channel: tauri::ipc::Channel<Vec<u8>>,
) -> Result<(), String> {
    // Read image data
    let image_data = image_reader_service
        .read_image(image_path, app_handle)
        .await?;

    // Send image data through channel
    channel
        .send(image_data)
        .map_err(|e| format!("Failed to send image data: {}", e))?;

    Ok(())
}
