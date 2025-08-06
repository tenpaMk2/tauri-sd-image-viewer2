use crate::types::{ThumbnailInfo, BatchThumbnailResult, CachedMetadata};
use crate::image_info::read_image_metadata_internal;
use image::{GenericImageView, ImageFormat};
use image::imageops::FilterType;
use memmap2::MmapOptions;
use rayon::prelude::*;
use sha2::{Digest, Sha256};
use std::fs::{self, File};
use std::path::PathBuf;
use std::time::Instant;
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
            size: 128,  // 300px → 128px に縮小（約4倍高速化）
            quality: 80,
        }
    }
}


/// サムネイルハンドラー
pub struct ThumbnailHandler {
    config: ThumbnailConfig,
    cache_dir: PathBuf,
    metadata_cache_dir: PathBuf,
}

impl ThumbnailHandler {
    /// 新しいサムネイルハンドラーを作成
    pub fn new<R: Runtime>(config: ThumbnailConfig, app: &AppHandle<R>) -> Result<Self, String> {
        let cache_dir = Self::get_cache_directory(app)?;
        let metadata_cache_dir = cache_dir.join("metadata");

        // 画像キャッシュディレクトリ作成
        if !cache_dir.exists() {
            fs::create_dir_all(&cache_dir)
                .map_err(|e| format!("キャッシュディレクトリの作成に失敗: {}", e))?;
        }

        // メタデータキャッシュディレクトリ作成
        if !metadata_cache_dir.exists() {
            fs::create_dir_all(&metadata_cache_dir)
                .map_err(|e| format!("メタデータキャッシュディレクトリの作成に失敗: {}", e))?;
        }

        Ok(Self { 
            config, 
            cache_dir,
            metadata_cache_dir 
        })
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

    /// メタデータキャッシュのパスを取得
    fn get_metadata_cache_path(&self, cache_key: &str) -> PathBuf {
        self.metadata_cache_dir.join(format!("{}.json", cache_key))
    }

    /// メタデータをキャッシュから読み込み
    fn load_cached_metadata(&self, cache_key: &str) -> Option<CachedMetadata> {
        let metadata_path = self.get_metadata_cache_path(cache_key);
        if !metadata_path.exists() {
            return None;
        }

        match fs::read_to_string(&metadata_path) {
            Ok(json_str) => {
                match serde_json::from_str::<CachedMetadata>(&json_str) {
                    Ok(metadata) => Some(metadata),
                    Err(_) => None,
                }
            }
            Err(_) => None,
        }
    }

    /// メタデータをキャッシュに保存
    fn save_metadata_cache(&self, cache_key: &str, metadata: &CachedMetadata) -> Result<(), String> {
        let metadata_path = self.get_metadata_cache_path(cache_key);
        let json_str = serde_json::to_string(metadata)
            .map_err(|e| format!("メタデータのJSON変換に失敗: {}", e))?;
        
        fs::write(&metadata_path, json_str)
            .map_err(|e| format!("メタデータキャッシュの保存に失敗: {}", e))?;
        
        Ok(())
    }

    /// バッチでサムネイルを処理（並列読み込み・生成）
    pub fn process_thumbnails_batch<R: Runtime>(
        &self,
        image_paths: &[String],
        _app: &AppHandle<R>,
    ) -> Vec<BatchThumbnailResult> {
        // 並列処理でサムネイルとメタデータを生成
        image_paths
            .par_iter()
            .map(|path| {
                let cache_key = self.generate_cache_key(path);
                
                match self.load_or_generate_thumbnail(path) {
                    Ok(thumbnail) => {
                        // メタデータもロードまたは生成
                        let cached_metadata = self.load_or_generate_metadata(path, &cache_key);
                        
                        BatchThumbnailResult {
                            path: path.clone(),
                            thumbnail: Some(thumbnail),
                            cached_metadata,
                            error: None,
                        }
                    },
                    Err(e) => BatchThumbnailResult {
                        path: path.clone(),
                        thumbnail: None,
                        cached_metadata: None,
                        error: Some(e),
                    },
                }
            })
            .collect()
    }

    /// バッチでサムネイルを処理（キャッシュパスのみ返却）
    pub fn process_thumbnails_batch_path_only<R: Runtime>(
        &self,
        image_paths: &[String],
        _app: &AppHandle<R>,
    ) -> Vec<BatchThumbnailResult> {
        // 並列処理でサムネイル生成・キャッシュパスのみ返却
        image_paths
            .par_iter()
            .map(|path| {
                let cache_key = self.generate_cache_key(path);
                
                match self.load_or_generate_thumbnail_path_only(path) {
                    Ok(thumbnail) => {
                        // メタデータもロードまたは生成
                        let cached_metadata = self.load_or_generate_metadata(path, &cache_key);
                        
                        BatchThumbnailResult {
                            path: path.clone(),
                            thumbnail: Some(thumbnail),
                            cached_metadata,
                            error: None,
                        }
                    },
                    Err(e) => BatchThumbnailResult {
                        path: path.clone(),
                        thumbnail: None,
                        cached_metadata: None,
                        error: Some(e),
                    },
                }
            })
            .collect()
    }

    /// サムネイルを読み込みまたは生成（キャッシュ優先）
    fn load_or_generate_thumbnail(&self, image_path: &str) -> Result<ThumbnailInfo, String> {
        let start_time = Instant::now();
        
        let cache_key_start = Instant::now();
        let cache_key = self.generate_cache_key(image_path);
        let cache_key_duration = cache_key_start.elapsed();
        
        let cache_path = self.cache_dir.join(format!("{}.webp", cache_key));

        // キャッシュが有効かチェック
        let cache_check_start = Instant::now();
        if self.is_cache_valid(&cache_path, image_path) {
            let cache_read_start = Instant::now();
            if let Ok(data) = fs::read(&cache_path) {
                let cache_read_duration = cache_read_start.elapsed();
                let total_duration = start_time.elapsed();
                println!("📋 キャッシュヒット: {} (キーの生成: {:?}, キャッシュ読み込み: {:?}, 合計: {:?})", 
                    std::path::Path::new(image_path).file_name().unwrap_or_default().to_string_lossy(),
                    cache_key_duration, cache_read_duration, total_duration);
                return Ok(ThumbnailInfo {
                    data,
                    width: self.config.size,
                    height: self.config.size,
                    mime_type: "image/webp".to_string(),
                    cache_path: Some(cache_path.to_string_lossy().to_string()),
                });
            }
        }
        let cache_check_duration = cache_check_start.elapsed();

        // 新しいサムネイルを生成
        let generation_start = Instant::now();
        let mut thumbnail_info = self.generate_thumbnail(image_path)?;
        let generation_duration = generation_start.elapsed();

        // キャッシュに保存
        let cache_save_start = Instant::now();
        if let Ok(_) = fs::write(&cache_path, &thumbnail_info.data) {
            // キャッシュ保存成功時はパスを設定
            thumbnail_info.cache_path = Some(cache_path.to_string_lossy().to_string());
        }
        let cache_save_duration = cache_save_start.elapsed();
        
        let total_duration = start_time.elapsed();
        println!("🔄 新規生成: {} (キー生成: {:?}, キャッシュ確認: {:?}, サムネイル生成: {:?}, キャッシュ保存: {:?}, 合計: {:?})", 
            std::path::Path::new(image_path).file_name().unwrap_or_default().to_string_lossy(),
            cache_key_duration, cache_check_duration, generation_duration, cache_save_duration, total_duration);

        Ok(thumbnail_info)
    }

    /// サムネイルを読み込みまたは生成（キャッシュパスのみ返却）
    fn load_or_generate_thumbnail_path_only(&self, image_path: &str) -> Result<ThumbnailInfo, String> {
        let cache_key = self.generate_cache_key(image_path);
        let cache_path = self.cache_dir.join(format!("{}.webp", cache_key));

        // キャッシュが有効かチェック
        if self.is_cache_valid(&cache_path, image_path) {
            return Ok(ThumbnailInfo {
                data: Vec::new(), // 空のデータ
                width: self.config.size,
                height: self.config.size,
                mime_type: "image/webp".to_string(),
                cache_path: Some(cache_path.to_string_lossy().to_string()),
            });
        }

        // 新しいサムネイルを生成
        let thumbnail_info = self.generate_thumbnail(image_path)?;

        // キャッシュに保存
        if let Ok(_) = fs::write(&cache_path, &thumbnail_info.data) {
            return Ok(ThumbnailInfo {
                data: Vec::new(), // パスのみ返却のため空データ
                width: thumbnail_info.width,
                height: thumbnail_info.height,
                mime_type: thumbnail_info.mime_type,
                cache_path: Some(cache_path.to_string_lossy().to_string()),
            });
        }

        // キャッシュ保存に失敗した場合はデータを返却
        Ok(thumbnail_info)
    }

    /// メタデータをロードまたは生成（キャッシュ優先）
    fn load_or_generate_metadata(&self, image_path: &str, cache_key: &str) -> Option<CachedMetadata> {
        // キャッシュから読み込み試行
        if let Some(cached) = self.load_cached_metadata(cache_key) {
            return Some(cached);
        }

        // 新しいメタデータを生成
        match self.generate_metadata(image_path) {
            Ok(metadata) => {
                // キャッシュに保存
                let _ = self.save_metadata_cache(cache_key, &metadata);
                Some(metadata)
            }
            Err(_) => None,
        }
    }

    /// メタデータを生成
    fn generate_metadata(&self, image_path: &str) -> Result<CachedMetadata, String> {
        match read_image_metadata_internal(image_path) {
            Ok(image_metadata) => {
                let current_time = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs();

                Ok(CachedMetadata {
                    rating: image_metadata.exif_info.as_ref().and_then(|exif| exif.rating),
                    exif_info: image_metadata.exif_info,
                    cached_at: current_time,
                })
            }
            Err(e) => Err(format!("メタデータ生成に失敗: {}", e)),
        }
    }

    /// サムネイルを生成（最適化版）
    fn generate_thumbnail(&self, image_path: &str) -> Result<ThumbnailInfo, String> {
        let start_time = Instant::now();
        
        // 画像ファイルを最適化された方法で読み込み
        let load_start = Instant::now();
        let img = self.load_image_optimized(image_path)?;
        let load_duration = load_start.elapsed();

        // 段階的リサイズでサムネイル生成（メモリ効率向上）
        let resize_start = Instant::now();
        let thumbnail = self.resize_image_optimized(img, self.config.size);
        let (width, height) = thumbnail.dimensions();
        let resize_duration = resize_start.elapsed();

        // RGBAバイト配列に変換
        let rgba_start = Instant::now();
        let rgba_image = thumbnail.to_rgba8();
        let rgba_data = rgba_image.as_raw();
        let rgba_duration = rgba_start.elapsed();

        // WebPに変換
        let webp_start = Instant::now();
        let encoder = Encoder::from_rgba(rgba_data, width, height);
        let webp_memory = encoder.encode(self.config.quality as f32);
        let webp_data = webp_memory.to_vec();
        let webp_duration = webp_start.elapsed();
        
        let total_duration = start_time.elapsed();
        println!("  ⚙️  生成詳細 - {}: 画像読み込み: {:?}, リサイズ: {:?}, RGBA変換: {:?}, WebP変換: {:?}, 合計: {:?}", 
            std::path::Path::new(image_path).file_name().unwrap_or_default().to_string_lossy(),
            load_duration, resize_duration, rgba_duration, webp_duration, total_duration);

        Ok(ThumbnailInfo {
            data: webp_data,
            width,
            height,
            mime_type: "image/webp".to_string(),
            cache_path: None, // 生成時点ではキャッシュパスは未設定
        })
    }

    /// 最適化された画像読み込み（PNG専用最適化）
    fn load_image_optimized(&self, image_path: &str) -> Result<image::DynamicImage, String> {
        let path_lower = image_path.to_lowercase();
        
        if path_lower.ends_with(".png") {
            // PNG画像：メモリマップド読み込みを使用
            let file = File::open(image_path)
                .map_err(|e| format!("ファイルオープンに失敗: {} - {}", image_path, e))?;
            
            let mmap = unsafe { 
                MmapOptions::new().map(&file)
                    .map_err(|e| format!("メモリマップに失敗: {} - {}", image_path, e))?
            };
            
            image::load_from_memory_with_format(&mmap, ImageFormat::Png)
                .map_err(|e| format!("PNG画像の読み込みに失敗: {} - {}", image_path, e))
        } else {
            // その他の形式：従来の方法（フォールバック）
            image::open(image_path)
                .map_err(|e| format!("画像の読み込みに失敗: {} - {}", image_path, e))
        }
    }

    /// 最適化された段階的リサイズ
    fn resize_image_optimized(&self, img: image::DynamicImage, target_size: u32) -> image::DynamicImage {
        let (width, height) = img.dimensions();
        let max_dimension = width.max(height);
        
        if max_dimension > 512 {
            // 大きな画像：段階的リサイズ（メモリ効率向上）
            let intermediate_size = (target_size * 4).min(512); // 中間サイズを適切に設定
            let intermediate = img.resize(intermediate_size, intermediate_size, FilterType::Triangle);
            intermediate.thumbnail(target_size, target_size)
        } else {
            // 小さな画像：直接リサイズ
            img.thumbnail(target_size, target_size)
        }
    }

    /// キャッシュをクリア
    pub fn clear_cache<R: Runtime>(&self, _app: &AppHandle<R>) -> Result<(), String> {
        // 画像キャッシュをクリア
        if self.cache_dir.exists() {
            let entries = fs::read_dir(&self.cache_dir)
                .map_err(|e| format!("キャッシュディレクトリの読み取りに失敗: {}", e))?;

            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    let _ = fs::remove_file(&path);
                }
            }
        }

        // メタデータキャッシュをクリア
        if self.metadata_cache_dir.exists() {
            let entries = fs::read_dir(&self.metadata_cache_dir)
                .map_err(|e| format!("メタデータキャッシュディレクトリの読み取りに失敗: {}", e))?;

            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    let _ = fs::remove_file(&path);
                }
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