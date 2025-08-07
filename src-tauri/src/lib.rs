mod clipboard;
mod common;
mod exif_info;
mod image_handlers;
mod image_info;
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
            let thumbnail_config = thumbnail::ThumbnailConfig::default();
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
            thumbnail::load_thumbnails_batch,
            thumbnail::load_thumbnails_batch_path_only,
            thumbnail::clear_thumbnail_cache,
            image_handlers::png_processor::read_png_image_info,
            image_handlers::png_processor::read_png_sd_parameters,
            image_info::read_image_metadata_info,
            exif_info::write_exif_image_rating,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
