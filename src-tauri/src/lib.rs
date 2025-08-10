mod clipboard;
mod common;
mod exif_info;
mod image_handlers;
mod image_info;
mod image_loader;
mod sd_parameters;
mod thumbnail;
mod types;

use tauri::Manager;
use thumbnail::ThumbnailState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // サムネイル状態を初期化
            let thumbnail_config = types::ThumbnailConfig::default();
            let thumbnail_state = match ThumbnailState::new(thumbnail_config, app.handle()) {
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
            clipboard::set_clipboard_files,
            thumbnail::load_thumbnails_batch_path_only,
            thumbnail::clear_thumbnail_cache,
            image_info::read_image_metadata_basic,
            image_info::read_image_metadata_rating,
            image_info::read_image_metadata_all,
            exif_info::write_exif_image_rating,
            common::calculate_file_hash_api,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
