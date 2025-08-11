use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;
use crate::image_info::read_image_metadata_internal;
use crate::types::ThumbnailConfig;
use crate::types::{ImageFileInfo, ThumbnailCacheInfo};

/// 新しいキャッシュシステム - ファイルパスベースのキャッシュ管理
pub struct CacheManager {
    cache_dir: PathBuf,
}

impl CacheManager {
    pub fn new(cache_dir: PathBuf) -> Self {
        Self { cache_dir }
    }

    /// ファイルパスからキャッシュキーを生成
    pub fn generate_cache_key(&self, image_path: &str) -> String {
        // ファイルパスのハッシュを計算してキャッシュキーとして使用
        let mut hasher = Sha256::new();
        hasher.update(image_path.as_bytes());
        hex::encode(hasher.finalize())[..16].to_string()
    }

    /// キャッシュ情報ファイルのパスを取得
    pub fn get_cache_info_path(&self, cache_key: &str) -> PathBuf {
        self.cache_dir.join(format!("{}.json", cache_key))
    }

    /// サムネイル画像ファイルのパスを取得
    pub fn get_thumbnail_file_path(&self, cache_key: &str) -> PathBuf {
        self.cache_dir.join(format!("{}.webp", cache_key))
    }

    /// キャッシュが有効かチェック（厳密な判定）
    pub fn is_cache_valid(
        &self,
        cache_key: &str,
        original_path: &str,
        config: &ThumbnailConfig,
    ) -> Option<ThumbnailCacheInfo> {
        let cache_info_path = self.get_cache_info_path(cache_key);
        let thumbnail_path = self.get_thumbnail_file_path(cache_key);

        println!("🔍 キャッシュ有効性チェック開始: path={}, cache_key={}", original_path, cache_key);

        // キャッシュファイルが存在するかチェック
        if !cache_info_path.exists() || !thumbnail_path.exists() {
            println!("❌ キャッシュファイル不存在: info_exists={}, thumb_exists={}", 
                     cache_info_path.exists(), thumbnail_path.exists());
            return None;
        }

        println!("✅ キャッシュファイル存在確認完了");

        // キャッシュ情報を読み込み
        let cache_info = match self.load_cache_info(cache_key) {
            Some(info) => {
                println!("✅ キャッシュ情報読み込み成功");
                info
            },
            None => {
                println!("❌ キャッシュ情報読み込み失敗");
                return None;
            }
        };

        // 元ファイルの現在の情報を取得
        let current_file_info = match self.get_original_file_info(original_path) {
            Ok(info) => {
                println!("✅ 現在ファイル情報取得成功: size={}, modified={}", 
                         info.file_size, info.modified_time);
                info
            },
            Err(e) => {
                println!("❌ 現在ファイル情報取得失敗: {}", e);
                return None;
            }
        };

        // ファイル変更をチェック（軽量版：解像度なしの比較）
        let file_changed = self.is_file_changed_lightweight(&cache_info.original_file_info, &current_file_info);
        let config_changed = cache_info.thumbnail_config != *config;

        println!("🔄 変更検出結果: file_changed={}, config_changed={}", file_changed, config_changed);
        println!("📊 キャッシュファイル情報: size={}, modified={}", 
                 cache_info.original_file_info.file_size, cache_info.original_file_info.modified_time);
        println!("📊 現在ファイル情報: size={}, modified={}", 
                 current_file_info.file_size, current_file_info.modified_time);

        if file_changed || config_changed {
            println!("❌ キャッシュ無効（変更検出）");
            return None;
        }

        println!("✅ キャッシュ有効");
        Some(cache_info)
    }

    /// 現在のファイル情報を取得（高速解像度付き）
    fn get_original_file_info(&self, image_path: &str) -> Result<ImageFileInfo, String> {
        use crate::image_loader::ImageReader;
                
        // ImageReaderで高速解像度とMIMEタイプ取得
        let reader = ImageReader::from_file(image_path)?;
        
        // ImageFileInfoを構築
        ImageFileInfo::from_reader(&reader, image_path)
    }

    /// 画像の解像度を取得
    /// NOTE: キャッシュ判定では使用しなくなったが、他の用途のため残存
    #[allow(dead_code)]
    fn get_image_dimensions(&self, image_path: &str) -> Result<(u32, u32), String> {
        match read_image_metadata_internal(image_path) {
            Ok(metadata) => Ok((metadata.width, metadata.height)),
            Err(e) => Err(format!("画像解像度の取得に失敗: {}", e)),
        }
    }

    /// ファイルが変更されたかチェック（軽量版：更新時刻のみ）
    fn is_file_changed_lightweight(
        &self,
        cached_info: &ImageFileInfo,
        current_info: &ImageFileInfo,
    ) -> bool {
        cached_info.modified_time != current_info.modified_time
    }

    /// キャッシュ情報を読み込み
    pub fn load_cache_info(&self, cache_key: &str) -> Option<ThumbnailCacheInfo> {
        let cache_info_path = self.get_cache_info_path(cache_key);
        if !cache_info_path.exists() {
            return None;
        }

        match fs::read_to_string(&cache_info_path) {
            Ok(json_str) => serde_json::from_str::<ThumbnailCacheInfo>(&json_str).ok(),
            Err(_) => None,
        }
    }

    /// キャッシュ情報を保存
    pub fn save_cache_info(
        &self,
        cache_key: &str,
        cache_info: &ThumbnailCacheInfo,
    ) -> Result<(), String> {
        let cache_info_path = self.get_cache_info_path(cache_key);
        println!("💾 キャッシュ情報保存開始: cache_key={}, path={}", cache_key, cache_info_path.display());

        let json_str = serde_json::to_string_pretty(cache_info)
            .map_err(|e| format!("キャッシュ情報のJSON変換に失敗: {}", e))?;

        fs::write(&cache_info_path, json_str)
            .map_err(|e| {
                println!("❌ キャッシュ情報保存失敗: {}", e);
                format!("キャッシュ情報の保存に失敗: {}", e)
            })?;

        println!("✅ キャッシュ情報保存成功");
        Ok(())
    }

    /// サムネイル画像を保存
    pub fn save_thumbnail_image(&self, cache_key: &str, image_data: &[u8]) -> Result<(), String> {
        let thumbnail_path = self.get_thumbnail_file_path(cache_key);
        println!("💾 サムネイル画像保存開始: cache_key={}, path={}, size={}bytes", 
                 cache_key, thumbnail_path.display(), image_data.len());

        fs::write(&thumbnail_path, image_data)
            .map_err(|e| {
                println!("❌ サムネイル画像保存失敗: {}", e);
                format!("サムネイル画像の保存に失敗: {}", e)
            })?;

        println!("✅ サムネイル画像保存成功");
        Ok(())
    }

    /// サムネイル画像を読み込み
    #[allow(dead_code)]
    pub fn load_thumbnail_image(&self, cache_key: &str) -> Result<Vec<u8>, String> {
        let thumbnail_path = self.get_thumbnail_file_path(cache_key);
        fs::read(&thumbnail_path).map_err(|e| format!("サムネイル画像の読み込みに失敗: {}", e))
    }

    /// キャッシュをクリア
    pub fn clear_cache(&self) -> Result<(), String> {
        if self.cache_dir.exists() {
            self.clear_directory(&self.cache_dir)?;
        }
        Ok(())
    }

    fn clear_directory(&self, dir: &PathBuf) -> Result<(), String> {
        let entries =
            fs::read_dir(dir).map_err(|e| format!("ディレクトリの読み取りに失敗: {}", e))?;

        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                let _ = fs::remove_file(&path);
            }
        }

        Ok(())
    }
}
