use crate::types::{ThumbnailInfo, BatchThumbnailResult};
use image::GenericImageView;
use rayon::prelude::*;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, Runtime};
use webp::Encoder;

/// サムネイルの設定
#[derive(Debug, Clone)]
pub struct ThumbnailConfig {
    pub size: u32,
    pub quality: u8,
}

impl Default for ThumbnailConfig {
    fn default() -> Self {
        Self {
            size: 300,
            quality: 80,
        }
    }
}


/// サムネイルハンドラー
pub struct ThumbnailHandler {
    config: ThumbnailConfig,
    cache_dir: PathBuf,
}

impl ThumbnailHandler {
    /// 新しいサムネイルハンドラーを作成
    pub fn new<R: Runtime>(config: ThumbnailConfig, app: &AppHandle<R>) -> Result<Self, String> {
        let cache_dir = Self::get_cache_directory(app)?;

        if !cache_dir.exists() {
            fs::create_dir_all(&cache_dir)
                .map_err(|e| format!("キャッシュディレクトリの作成に失敗: {}", e))?;
        }

        Ok(Self { config, cache_dir })
    }

    /// キャッシュディレクトリのパスを取得
    pub fn get_cache_directory<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
        app.path()
            .app_cache_dir()
            .map(|cache_dir| cache_dir.join("thumbnails"))
            .map_err(|e| format!("キャッシュディレクトリの取得に失敗: {}", e))
    }

    /// 画像ファイルパスからキャッシュキーを生成
    fn generate_cache_key(&self, image_path: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(image_path.as_bytes());
        hasher.update(self.config.size.to_le_bytes());
        hasher.update(self.config.quality.to_le_bytes());
        
        // ファイルサイズと更新日時も含める
        if let Ok(metadata) = fs::metadata(image_path) {
            hasher.update(metadata.len().to_le_bytes());
            if let Ok(modified) = metadata.modified() {
                if let Ok(duration) = modified.duration_since(std::time::UNIX_EPOCH) {
                    hasher.update(duration.as_secs().to_le_bytes());
                }
            }
        }
        
        hex::encode(hasher.finalize())
    }

    /// キャッシュが有効かチェック
    fn is_cache_valid(&self, cache_path: &PathBuf, original_path: &str) -> bool {
        cache_path.exists() && std::path::Path::new(original_path).exists()
    }

    /// バッチでサムネイルを処理（並列読み込み・生成）
    pub fn process_thumbnails_batch<R: Runtime>(
        &self,
        image_paths: &[String],
        _app: &AppHandle<R>,
    ) -> Vec<BatchThumbnailResult> {
        // 並列処理でサムネイルを生成
        image_paths
            .par_iter()
            .map(|path| match self.load_or_generate_thumbnail(path) {
                Ok(thumbnail) => BatchThumbnailResult {
                    path: path.clone(),
                    thumbnail: Some(thumbnail),
                    error: None,
                },
                Err(e) => BatchThumbnailResult {
                    path: path.clone(),
                    thumbnail: None,
                    error: Some(e),
                },
            })
            .collect()
    }

    /// サムネイルを読み込みまたは生成（キャッシュ優先）
    fn load_or_generate_thumbnail(&self, image_path: &str) -> Result<ThumbnailInfo, String> {
        let cache_key = self.generate_cache_key(image_path);
        let cache_path = self.cache_dir.join(format!("{}.webp", cache_key));

        // キャッシュが有効かチェック
        if self.is_cache_valid(&cache_path, image_path) {
            if let Ok(data) = fs::read(&cache_path) {
                return Ok(ThumbnailInfo {
                    data,
                    width: self.config.size,
                    height: self.config.size,
                    mime_type: "image/webp".to_string(),
                });
            }
        }

        // 新しいサムネイルを生成
        let thumbnail_info = self.generate_thumbnail(image_path)?;

        // キャッシュに保存
        if let Err(_e) = fs::write(&cache_path, &thumbnail_info.data) {
            // キャッシュ保存に失敗してもサムネイルは返す
        }

        Ok(thumbnail_info)
    }

    /// サムネイルを生成
    fn generate_thumbnail(&self, image_path: &str) -> Result<ThumbnailInfo, String> {
        // 画像ファイルを読み込み
        let img = image::open(image_path)
            .map_err(|e| format!("画像の読み込みに失敗: {} - {}", image_path, e))?;

        // サムネイル生成（アスペクト比を維持）
        let thumbnail = img.thumbnail(self.config.size, self.config.size);
        let (width, height) = thumbnail.dimensions();

        // RGBAバイト配列に変換
        let rgba_image = thumbnail.to_rgba8();
        let rgba_data = rgba_image.as_raw();

        // WebPに変換
        let encoder = Encoder::from_rgba(rgba_data, width, height);
        let webp_memory = encoder.encode(self.config.quality as f32);
        let webp_data = webp_memory.to_vec();

        Ok(ThumbnailInfo {
            data: webp_data,
            width,
            height,
            mime_type: "image/webp".to_string(),
        })
    }

    /// キャッシュをクリア
    pub fn clear_cache<R: Runtime>(&self, _app: &AppHandle<R>) -> Result<(), String> {
        if !self.cache_dir.exists() {
            return Ok(());
        }

        let entries = fs::read_dir(&self.cache_dir)
            .map_err(|e| format!("キャッシュディレクトリの読み取りに失敗: {}", e))?;

        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                let _ = fs::remove_file(&path);
            }
        }

        Ok(())
    }
}

/// サムネイル状態管理用の構造体
pub struct ThumbnailState {
    pub handler: ThumbnailHandler,
}

impl ThumbnailState {
    /// 新しいThumbnailStateを作成
    pub fn new<R: Runtime>(config: ThumbnailConfig, app: &AppHandle<R>) -> Result<Self, String> {
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
    println!("チャンク処理: {}個のファイル", image_paths.len());
    
    let results = state.handler.process_thumbnails_batch(&image_paths, &app);
    
    let success_count = results.iter().filter(|r| r.thumbnail.is_some()).count();
    let error_count = results.iter().filter(|r| r.error.is_some()).count();
    println!("チャンク完了: 成功={}, エラー={}", success_count, error_count);
    
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