mod cache;
mod generator;
mod metadata_handler;

use cache::CacheManager;
use generator::ThumbnailGenerator;
use metadata_handler::MetadataHandler;

use crate::types::{BatchThumbnailResult, ThumbnailCacheInfo, ThumbnailConfig, ThumbnailInfo};
use rayon::prelude::*;
use std::fs;
use std::path::PathBuf;
use std::time::Instant;
use tauri::{AppHandle, Manager, Runtime};


/// サムネイルハンドラー
pub struct ThumbnailHandler {
    generator: ThumbnailGenerator,
    cache_manager: CacheManager,
}

impl ThumbnailHandler {
    /// 新しいサムネイルハンドラーを作成
    pub fn new<R: Runtime>(
        config: ThumbnailConfig,
        app: &AppHandle<R>,
    ) -> Result<Self, String> {
        let cache_dir = Self::get_cache_directory(app)?;

        // キャッシュディレクトリ作成
        if !cache_dir.exists() {
            fs::create_dir_all(&cache_dir)
                .map_err(|e| format!("キャッシュディレクトリの作成に失敗: {}", e))?;
        }

        let generator = ThumbnailGenerator::new(config.clone());
        let cache_manager = CacheManager::new(cache_dir);

        Ok(Self {
            generator,
            cache_manager,
        })
    }

    /// キャッシュディレクトリのパスを取得
    pub fn get_cache_directory<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
        app.path()
            .app_cache_dir()
            .map(|cache_dir| cache_dir.join("thumbnails"))
            .map_err(|e| format!("キャッシュディレクトリの取得に失敗: {}", e))
    }

    /// バッチでサムネイルを処理（並列読み込み・生成）
    pub fn process_thumbnails_batch<R: Runtime>(
        &self,
        image_paths: &[String],
        _app: &AppHandle<R>,
    ) -> Vec<BatchThumbnailResult> {
        image_paths
            .par_iter()
            .map(|path| self.process_single_thumbnail(path, false))
            .collect()
    }

    /// バッチでサムネイルを処理（キャッシュパスのみ返却）
    pub fn process_thumbnails_batch_path_only<R: Runtime>(
        &self,
        image_paths: &[String],
        _app: &AppHandle<R>,
    ) -> Vec<BatchThumbnailResult> {
        image_paths
            .par_iter()
            .map(|path| self.process_single_thumbnail(path, true))
            .collect()
    }

    /// 単一のサムネイル処理
    fn process_single_thumbnail(&self, path: &str, path_only: bool) -> BatchThumbnailResult {
        let cache_key = self.cache_manager.generate_cache_key(path);
        let config = self.generator.get_config();

        let result = if path_only {
            self.load_or_generate_thumbnail_path_only(path, &cache_key, &config)
        } else {
            self.load_or_generate_thumbnail(path, &cache_key, &config)
        };

        match result {
            Ok((thumbnail, cache_info)) => BatchThumbnailResult {
                path: path.to_string(),
                thumbnail: Some(thumbnail),
                cache_info: Some(cache_info),
                error: None,
            },
            Err(e) => BatchThumbnailResult {
                path: path.to_string(),
                thumbnail: None,
                cache_info: None,
                error: Some(e),
            },
        }
    }

    /// サムネイルを読み込みまたは生成（キャッシュ優先）
    fn load_or_generate_thumbnail(
        &self,
        image_path: &str,
        cache_key: &str,
        config: &ThumbnailConfig,
    ) -> Result<(ThumbnailInfo, ThumbnailCacheInfo), String> {
        // キャッシュが有効かチェック
        if let Some(cache_info) = self.cache_manager.is_cache_valid(cache_key, image_path, config) {
            // キャッシュから画像データを読み込み
            if let Ok(data) = self.cache_manager.load_thumbnail_image(cache_key) {
                let thumbnail_info = ThumbnailInfo {
                    data,
                    width: config.size,
                    height: config.size,
                    mime_type: config.format.clone(),
                    cache_path: Some(self.cache_manager.get_thumbnail_file_path(cache_key).to_string_lossy().to_string()),
                };
                return Ok((thumbnail_info, cache_info));
            }
        }

        // 新しいサムネイルを生成
        self.generate_and_cache_thumbnail(image_path, cache_key, config)
    }

    /// サムネイルを読み込みまたは生成（キャッシュパスのみ返却）
    fn load_or_generate_thumbnail_path_only(
        &self,
        image_path: &str,
        cache_key: &str,
        config: &ThumbnailConfig,
    ) -> Result<(ThumbnailInfo, ThumbnailCacheInfo), String> {
        // キャッシュが有効かチェック
        if let Some(cache_info) = self.cache_manager.is_cache_valid(cache_key, image_path, config) {
            let thumbnail_info = ThumbnailInfo {
                data: Vec::new(), // 画像データは空
                width: config.size,
                height: config.size,
                mime_type: config.format.clone(),
                cache_path: Some(self.cache_manager.get_thumbnail_file_path(cache_key).to_string_lossy().to_string()),
            };
            return Ok((thumbnail_info, cache_info));
        }

        // 新しいサムネイルを生成（データ付きで生成してからパスのみにする）
        let (full_thumbnail, cache_info) = self.generate_and_cache_thumbnail(image_path, cache_key, config)?;
        
        let path_only_thumbnail = ThumbnailInfo {
            data: Vec::new(), // 画像データは空
            width: full_thumbnail.width,
            height: full_thumbnail.height,
            mime_type: full_thumbnail.mime_type,
            cache_path: full_thumbnail.cache_path,
        };

        Ok((path_only_thumbnail, cache_info))
    }

    /// サムネイルを生成してキャッシュに保存
    fn generate_and_cache_thumbnail(
        &self,
        image_path: &str,
        cache_key: &str,
        config: &ThumbnailConfig,
    ) -> Result<(ThumbnailInfo, ThumbnailCacheInfo), String> {
        // サムネイル画像を生成
        let thumbnail_info = self.generator.generate_thumbnail(image_path)?;

        // サムネイル画像をファイルに保存
        let thumbnail_filename = format!("{}.{}", cache_key, config.format);
        self.cache_manager.save_thumbnail_image(cache_key, &thumbnail_info.data)?;

        // 包括的なキャッシュ情報を生成
        let cache_info = MetadataHandler::generate_cache_info(
            image_path,
            config,
            thumbnail_filename,
        )?;

        // キャッシュ情報をJSONファイルに保存
        self.cache_manager.save_cache_info(cache_key, &cache_info)?;

        // レスポンス用のサムネイル情報を作成
        let response_thumbnail = ThumbnailInfo {
            data: thumbnail_info.data,
            width: thumbnail_info.width,
            height: thumbnail_info.height,
            mime_type: thumbnail_info.mime_type,
            cache_path: Some(self.cache_manager.get_thumbnail_file_path(cache_key).to_string_lossy().to_string()),
        };

        Ok((response_thumbnail, cache_info))
    }

    /// キャッシュをクリア
    pub fn clear_cache<R: Runtime>(&self, _app: &AppHandle<R>) -> Result<(), String> {
        self.cache_manager.clear_cache()
    }
}

/// サムネイル状態管理用の構造体
pub struct ThumbnailState {
    pub handler: ThumbnailHandler,
}

impl ThumbnailState {
    /// 新しいThumbnailStateを作成
    pub fn new<R: Runtime>(
        config: ThumbnailConfig,
        app: &AppHandle<R>,
    ) -> Result<Self, String> {
        let handler = ThumbnailHandler::new(config, app)?;
        Ok(Self { handler })
    }
}

/// バッチでサムネイルを生成または取得するTauriコマンド
#[tauri::command]
pub async fn load_thumbnails_batch<R: Runtime>(
    image_paths: Vec<String>,
    app: AppHandle<R>,
    state: tauri::State<'_, ThumbnailState>,
) -> Result<Vec<BatchThumbnailResult>, String> {
    let batch_start = Instant::now();
    println!("\n📦 バッチ処理開始: {}個のファイル", image_paths.len());

    let results = state.handler.process_thumbnails_batch(&image_paths, &app);

    let success_count = results.iter().filter(|r| r.thumbnail.is_some()).count();
    let error_count = results.iter().filter(|r| r.error.is_some()).count();
    let batch_duration = batch_start.elapsed();
    println!(
        "✅ バッチ完了: 成功={}, エラー={}, 処理時間={:?} (平均 {:.2}ms/ファイル)\n",
        success_count,
        error_count,
        batch_duration,
        batch_duration.as_millis() as f64 / image_paths.len() as f64
    );

    Ok(results)
}

/// バッチでサムネイルを生成または取得するTauriコマンド（キャッシュパスのみ返却）
#[tauri::command]
pub async fn load_thumbnails_batch_path_only<R: Runtime>(
    image_paths: Vec<String>,
    app: AppHandle<R>,
    state: tauri::State<'_, ThumbnailState>,
) -> Result<Vec<BatchThumbnailResult>, String> {
    println!(
        "チャンク処理（パスのみ）: {}個のファイル",
        image_paths.len()
    );

    let results = state
        .handler
        .process_thumbnails_batch_path_only(&image_paths, &app);

    let success_count = results.iter().filter(|r| r.thumbnail.is_some()).count();
    let error_count = results.iter().filter(|r| r.error.is_some()).count();
    println!(
        "チャンク完了（パスのみ）: 成功={}, エラー={}",
        success_count, error_count
    );

    Ok(results)
}

/// サムネイルキャッシュをクリアするTauriコマンド
#[tauri::command]
pub async fn clear_thumbnail_cache<R: Runtime>(
    app: AppHandle<R>,
    state: tauri::State<'_, ThumbnailState>,
) -> Result<(), String> {
    state.handler.clear_cache(&app)
}
