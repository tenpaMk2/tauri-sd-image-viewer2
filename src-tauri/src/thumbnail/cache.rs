use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;

use crate::types::CachedMetadata;

/// キャッシュ関連の処理を担当
pub struct CacheManager {
    cache_dir: PathBuf,
    metadata_cache_dir: PathBuf,
}

impl CacheManager {
    pub fn new(cache_dir: PathBuf, metadata_cache_dir: PathBuf) -> Self {
        Self {
            cache_dir,
            metadata_cache_dir,
        }
    }

    /// 画像ファイルパスからキャッシュキーを生成
    pub fn generate_cache_key(&self, image_path: &str, size: u32, quality: u8) -> String {
        let mut hasher = Sha256::new();
        hasher.update(image_path.as_bytes());
        hasher.update(size.to_le_bytes());
        hasher.update(quality.to_le_bytes());
        
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
    pub fn is_cache_valid(&self, cache_path: &PathBuf, original_path: &str) -> bool {
        cache_path.exists() && std::path::Path::new(original_path).exists()
    }

    /// サムネイルキャッシュパスを取得
    pub fn get_thumbnail_cache_path(&self, cache_key: &str) -> PathBuf {
        self.cache_dir.join(format!("{}.webp", cache_key))
    }

    /// メタデータキャッシュのパスを取得
    pub fn get_metadata_cache_path(&self, cache_key: &str) -> PathBuf {
        self.metadata_cache_dir.join(format!("{}.json", cache_key))
    }

    /// メタデータをキャッシュから読み込み
    pub fn load_cached_metadata(&self, cache_key: &str) -> Option<CachedMetadata> {
        let metadata_path = self.get_metadata_cache_path(cache_key);
        if !metadata_path.exists() {
            return None;
        }

        match fs::read_to_string(&metadata_path) {
            Ok(json_str) => serde_json::from_str::<CachedMetadata>(&json_str).ok(),
            Err(_) => None,
        }
    }

    /// メタデータをキャッシュに保存
    pub fn save_metadata_cache(&self, cache_key: &str, metadata: &CachedMetadata) -> Result<(), String> {
        let metadata_path = self.get_metadata_cache_path(cache_key);
        let json_str = serde_json::to_string(metadata)
            .map_err(|e| format!("メタデータのJSON変換に失敗: {}", e))?;
        
        fs::write(&metadata_path, json_str)
            .map_err(|e| format!("メタデータキャッシュの保存に失敗: {}", e))?;
        
        Ok(())
    }

    /// キャッシュをクリア
    pub fn clear_cache(&self) -> Result<(), String> {
        // 画像キャッシュをクリア
        if self.cache_dir.exists() {
            self.clear_directory(&self.cache_dir)?;
        }

        // メタデータキャッシュをクリア
        if self.metadata_cache_dir.exists() {
            self.clear_directory(&self.metadata_cache_dir)?;
        }

        Ok(())
    }

    fn clear_directory(&self, dir: &PathBuf) -> Result<(), String> {
        let entries = fs::read_dir(dir)
            .map_err(|e| format!("ディレクトリの読み取りに失敗: {}", e))?;

        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                let _ = fs::remove_file(&path);
            }
        }

        Ok(())
    }
}