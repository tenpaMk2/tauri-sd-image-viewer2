mod common;
mod types;
mod image_processor;
mod thumbnail;
mod sd_parameters;
mod png_handler;
mod image_info;
mod exif_info;

use tauri::Manager;
use thumbnail::{ThumbnailState, ThumbnailConfig};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // サムネイル状態を初期化
            let thumbnail_config = ThumbnailConfig::default();
            let thumbnail_state =
                match ThumbnailState::new(thumbnail_config, app.handle()) {
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
            thumbnail::load_thumbnails_batch,
            thumbnail::clear_thumbnail_cache,
            png_handler::read_png_image_info,
            png_handler::read_png_sd_parameters,
            image_info::read_image_metadata_info,
            exif_info::write_exif_image_rating,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}