mod clipboard_api;
mod common;
mod image_handlers;
mod image_loader;
mod metadata_api;
mod thumbnail_api;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // サムネイル状態を初期化
            let thumbnail_config = thumbnail_api::ThumbnailConfig::default();
            let thumbnail_state = match thumbnail_api::ThumbnailState::new(thumbnail_config, app.handle()) {
                Ok(state) => state,
                Err(e) => {
                    eprintln!("ThumbnailStateの初期化に失敗: {}", e);
                    return Err(e.into());
                }
            };
            app.manage(thumbnail_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            clipboard_api::set_clipboard_files,
            thumbnail_api::generate_thumbnails_batch,
            thumbnail_api::clear_thumbnail_cache,
            metadata_api::service::read_image_metadata,
            metadata_api::service::write_exif_image_rating,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
