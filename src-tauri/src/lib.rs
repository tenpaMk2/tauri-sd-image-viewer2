mod clipboard_api;
mod common;
mod image_file_lock_service;
mod image_reader_api;
mod metadata_api;
mod thumbnail_api;

use log::{error, info};
use tauri::Manager;
use tokio::sync::Mutex as AsyncMutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some("logs".to_string()),
                    },
                ))
                .max_file_size(50_000)
                .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal)
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // ImageFileLockServiceを初期化
            let image_file_lock_service = image_file_lock_service::ImageFileLockService::new();
            app.manage(AsyncMutex::new(image_file_lock_service));

            // サムネイルキャッシュディレクトリの取得
            let thumbnail_cache_dir = app
                .path()
                .app_cache_dir()
                .map(|cache_dir| cache_dir.join("thumbnails"))
                .map_err(|e| format!("Failed to get thumbnail cache dir: {}", e))?;

            // 非同期サムネイルサービスを初期化
            let thumbnail_config = thumbnail_api::ThumbnailGeneratorConfig::default();
            let async_thumbnail_service =
                thumbnail_api::AsyncThumbnailService::new(thumbnail_config, thumbnail_cache_dir)
                    .map_err(|e| format!("Failed to initialize AsyncThumbnailService: {}", e))?;
            app.manage(async_thumbnail_service);

            // 非同期画像読み込みサービスを初期化
            let async_image_reader_service = image_reader_api::AsyncImageReaderService::new();
            app.manage(async_image_reader_service);

            // メタデータキャッシュを初期化
            let metadata_disk_cache_file_path = app
                .path()
                .app_cache_dir()
                .map(|cache_dir| cache_dir.join("metadata_cache.json"))
                .map_err(|e| format!("Failed to get metadata cache file path: {}", e))?;
            let metadata_cache =
                match metadata_api::cache::MetadataCache::new(metadata_disk_cache_file_path) {
                    Ok(cache) => cache,
                    Err(e) => {
                        error!("Failed to initialize MetadataCache: {}", e);
                        return Err(e.into());
                    }
                };
            app.manage(metadata_cache);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            clipboard_api::set_clipboard_files,
            thumbnail_api::commands::generate_thumbnail_async,
            thumbnail_api::commands::clear_thumbnail_cache,
            image_reader_api::commands::read_image_async,
            metadata_api::commands::read_image_metadata,
            metadata_api::commands::write_xmp_image_rating,
            metadata_api::commands::clear_metadata_cache,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    // アプリ終了時処理でキャッシュを保存
    app.run(move |app_handle, event| {
        if let tauri::RunEvent::ExitRequested { .. } = event {
            info!("Application shutdown process started");

            // Tauri Stateからメタデータキャッシュを取得
            let cache = app_handle.state::<metadata_api::cache::MetadataCache>();

            // キャッシュをディスクに保存
            if let Err(e) = cache.save_on_shutdown() {
                error!("Cache save error during shutdown: {}", e);
            }
        }
    });
}
