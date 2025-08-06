mod cache;
mod generator;
mod metadata_handler;

use cache::CacheManager;
use generator::ThumbnailGenerator;
use metadata_handler::MetadataHandler;

use crate::types::{ThumbnailInfo, BatchThumbnailResult, CachedMetadata};
use rayon::prelude::*;
use std::fs;
use std::path::PathBuf;
use std::time::Instant;
use tauri::{AppHandle, Runtime, Manager};

pub use generator::ThumbnailConfig;

/// サムネイルハンドラー
pub struct ThumbnailHandler {
    generator: ThumbnailGenerator,
    cache_manager: CacheManager,
}

impl ThumbnailHandler {
    /// 新しいサムネイルハンドラーを作成
    pub fn new<R: Runtime>(config: generator::ThumbnailConfig, app: &AppHandle<R>) -> Result<Self, String> {
        let cache_dir = Self::get_cache_directory(app)?;
        let metadata_cache_dir = cache_dir.join("metadata");

        // キャッシュディレクトリ作成
        if !cache_dir.exists() {
            fs::create_dir_all(&cache_dir)
                .map_err(|e| format!("キャッシュディレクトリの作成に失敗: {}", e))?;
        }

        if !metadata_cache_dir.exists() {
            fs::create_dir_all(&metadata_cache_dir)
                .map_err(|e| format!("メタデータキャッシュディレクトリの作成に失敗: {}", e))?;
        }

        let generator = ThumbnailGenerator::new(config.clone());
        let cache_manager = CacheManager::new(cache_dir, metadata_cache_dir);

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
        let cache_key = self.cache_manager.generate_cache_key(path, 128, 80);
        
        let thumbnail_result = if path_only {
            self.load_or_generate_thumbnail_path_only(path)
        } else {
            self.load_or_generate_thumbnail(path)
        };
        
        match thumbnail_result {
            Ok(thumbnail) => {
                let cached_metadata = self.load_or_generate_metadata(path, &cache_key);
                
                BatchThumbnailResult {
                    path: path.to_string(),
                    thumbnail: Some(thumbnail),
                    cached_metadata,
                    error: None,
                }
            },
            Err(e) => BatchThumbnailResult {
                path: path.to_string(),
                thumbnail: None,
                cached_metadata: None,
                error: Some(e),
            },
        }
    }

    /// サムネイルを読み込みまたは生成（キャッシュ優先）
    fn load_or_generate_thumbnail(&self, image_path: &str) -> Result<ThumbnailInfo, String> {
        let cache_key = self.cache_manager.generate_cache_key(image_path, 128, 80);
        let cache_path = self.cache_manager.get_thumbnail_cache_path(&cache_key);

        // キャッシュが有効かチェック
        if self.cache_manager.is_cache_valid(&cache_path, image_path) {
            if let Ok(data) = fs::read(&cache_path) {
                return Ok(ThumbnailInfo {
                    data,
                    width: 128,
                    height: 128,
                    mime_type: "image/webp".to_string(),
                    cache_path: Some(cache_path.to_string_lossy().to_string()),
                });
            }
        }

        // 新しいサムネイルを生成
        let mut thumbnail_info = self.generator.generate_thumbnail(image_path)?;

        // キャッシュに保存
        if fs::write(&cache_path, &thumbnail_info.data).is_ok() {
            thumbnail_info.cache_path = Some(cache_path.to_string_lossy().to_string());
        }

        Ok(thumbnail_info)
    }

    /// サムネイルを読み込みまたは生成（キャッシュパスのみ返却）
    fn load_or_generate_thumbnail_path_only(&self, image_path: &str) -> Result<ThumbnailInfo, String> {
        let cache_key = self.cache_manager.generate_cache_key(image_path, 128, 80);
        let cache_path = self.cache_manager.get_thumbnail_cache_path(&cache_key);

        // キャッシュが有効かチェック
        if self.cache_manager.is_cache_valid(&cache_path, image_path) {
            return Ok(ThumbnailInfo {
                data: Vec::new(),
                width: 128,
                height: 128,
                mime_type: "image/webp".to_string(),
                cache_path: Some(cache_path.to_string_lossy().to_string()),
            });
        }

        // 新しいサムネイルを生成
        let thumbnail_info = self.generator.generate_thumbnail(image_path)?;

        // キャッシュに保存
        if fs::write(&cache_path, &thumbnail_info.data).is_ok() {
            return Ok(ThumbnailInfo {
                data: Vec::new(),
                width: thumbnail_info.width,
                height: thumbnail_info.height,
                mime_type: thumbnail_info.mime_type,
                cache_path: Some(cache_path.to_string_lossy().to_string()),
            });
        }

        Ok(thumbnail_info)
    }

    /// メタデータをロードまたは生成（キャッシュ優先）
    fn load_or_generate_metadata(&self, image_path: &str, cache_key: &str) -> Option<CachedMetadata> {
        // キャッシュから読み込み試行
        if let Some(cached) = self.cache_manager.load_cached_metadata(cache_key) {
            return Some(cached);
        }

        // 新しいメタデータを生成
        match MetadataHandler::generate_metadata(image_path) {
            Ok(metadata) => {
                // キャッシュに保存
                let _ = self.cache_manager.save_metadata_cache(cache_key, &metadata);
                Some(metadata)
            }
            Err(_) => None,
        }
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
    pub fn new<R: Runtime>(config: generator::ThumbnailConfig, app: &AppHandle<R>) -> Result<Self, String> {
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
    println!("✅ バッチ完了: 成功={}, エラー={}, 処理時間={:?} (平均 {:.2}ms/ファイル)\n", 
        success_count, error_count, batch_duration, 
        batch_duration.as_millis() as f64 / image_paths.len() as f64);
    
    Ok(results)
}

/// バッチでサムネイルを生成または取得するTauriコマンド（キャッシュパスのみ返却）
#[tauri::command]
pub async fn load_thumbnails_batch_path_only<R: Runtime>(
    image_paths: Vec<String>,
    app: AppHandle<R>,
    state: tauri::State<'_, ThumbnailState>,
) -> Result<Vec<BatchThumbnailResult>, String> {
    println!("チャンク処理（パスのみ）: {}個のファイル", image_paths.len());
    
    let results = state.handler.process_thumbnails_batch_path_only(&image_paths, &app);
    
    let success_count = results.iter().filter(|r| r.thumbnail.is_some()).count();
    let error_count = results.iter().filter(|r| r.error.is_some()).count();
    println!("チャンク完了（パスのみ）: 成功={}, エラー={}", success_count, error_count);
    
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