mod thumbnail;

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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}