mod clipboard_api;
mod common;
mod image_loader;
mod metadata_api;
mod thumbnail_api;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let cach_dir_path = app
                .path()
                .app_cache_dir()
                .map(|cache_dir| cache_dir.join("thumbnails"))
                .map_err(|e| format!("Failed to get thumbnail cache directory: {}", e))?;

            // サムネイル状態を初期化
            let thumbnail_config = thumbnail_api::ThumbnailConfig::default();

            let thumbnail_state =
                match thumbnail_api::ThumbnailState::new(thumbnail_config, cach_dir_path) {
                    Ok(state) => state,
                    Err(e) => {
                        eprintln!("ThumbnailStateの初期化に失敗: {}", e);
                        return Err(e.into());
                    }
                };
            app.manage(thumbnail_state);

            
            // メタデータキャッシュを初期化
            let metadata_disk_cache_file_path = app.path()
                .app_cache_dir()
                .map(|cache_dir| cache_dir.join("metadata_cache.json"))
                .map_err(|e| format!("Failed to get metadata cache file path: {}", e))?;
            let metadata_cache = match metadata_api::cache::MetadataCache::new(metadata_disk_cache_file_path) {
                Ok(cache) => cache,
                Err(e) => {
                    eprintln!("MetadataCacheの初期化に失敗: {}", e);
                    return Err(e.into());
                }
            };
            app.manage(metadata_cache);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            clipboard_api::set_clipboard_files,
            thumbnail_api::generate_thumbnails_batch,
            thumbnail_api::clear_thumbnail_cache,
            metadata_api::service::read_image_metadata,
            metadata_api::service::write_xmp_image_rating,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    // アプリ終了時処理でキャッシュを保存
    app.run(move |app_handle, event| {
        if let tauri::RunEvent::ExitRequested { .. } = event {
            println!("🔄 アプリケーション終了処理開始");

            // Tauri Stateからメタデータキャッシュを取得
            let cache = app_handle.state::<metadata_api::cache::MetadataCache>();

            // キャッシュをディスクに保存
            if let Err(e) = cache.save_on_shutdown() {
                eprintln!("❌ 終了時キャッシュ保存エラー: {}", e);
            }
        }
    });
}
