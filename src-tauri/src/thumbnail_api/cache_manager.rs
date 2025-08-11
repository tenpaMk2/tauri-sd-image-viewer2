use super::{ImageMetadataCache, ThumbnailConfig};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;

/// Thumbnail and image metadata cache management system
pub struct ThumbnailCacheManager {
    cache_dir: PathBuf,
}

impl ThumbnailCacheManager {
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
    pub fn get_image_metadata_cache_path(&self, cache_key: &str) -> PathBuf {
        self.cache_dir.join(format!("{}.json", cache_key))
    }

    /// サムネイル画像ファイルのパスを取得
    pub fn get_thumbnail_path(&self, cache_key: &str) -> PathBuf {
        self.cache_dir.join(format!("{}.webp", cache_key))
    }

    /// サムネイルキャッシュを再生成すべきかチェック
    pub fn should_regenerate_thumbnail_cache(
        &self,
        cache_key: &str,
        original_path: &str,
        config: &ThumbnailConfig,
    ) -> bool {
        let image_metadata_cache_path = self.get_image_metadata_cache_path(cache_key);
        let thumbnail_path = self.get_thumbnail_path(cache_key);

        println!(
            "🔍 Thumbnail cache validity check started: path={}, cache_key={}",
            original_path, cache_key
        );

        // キャッシュファイルが存在するかチェック
        if !image_metadata_cache_path.exists() || !thumbnail_path.exists() {
            println!(
                "❌ Thumbnail cache files not found: metadata_exists={}, thumbnail_exists={}",
                image_metadata_cache_path.exists(),
                thumbnail_path.exists()
            );
            return true;
        }

        println!("✅ Thumbnail cache files exist");

        // image metadata cacheを読み込み
        let image_metadata_cache = match self.load_cached_image_metadata(cache_key) {
            Some(info) => {
                println!("✅ Image metadata cache loaded successfully");
                info
            }
            None => {
                println!("❌ Failed to load image metadata cache");
                return false;
            }
        };

        // Get filesystem information
        let original_metadata = match fs::metadata(original_path) {
            Ok(metadata) => metadata,
            Err(e) => {
                println!("❌ Failed to get original file metadata: {}", e);
                return false;
            }
        };
        let original_modified_time: u64 = original_metadata
            .modified()
            .map(|t| {
                t.duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_secs())
                    .unwrap_or_else(|e| {
                        println!("❌ Failed to get original file modification time: {}", e);
                        0
                    })
            })
            .unwrap_or_else(|e| {
                println!("❌ Failed to get original file modification time: {}", e);
                0
            });

        // ファイル変更をチェック（軽量版：解像度なしの比較）
        let file_changed = image_metadata_cache.cached_at < original_modified_time;
        let config_changed = image_metadata_cache.thumbnail_config != *config;

        println!(
            "🔄 Change detection result: file_changed={}, config_changed={}",
            file_changed, config_changed
        );

        file_changed || config_changed
    }

    /// Load image metadata cache (assumes cache validity has been checked)
    pub fn load_cached_image_metadata_with_result(
        &self,
        cache_key: &str,
    ) -> Result<ImageMetadataCache, String> {
        self.load_cached_image_metadata(cache_key)
            .ok_or_else(|| format!("Failed to load image metadata cache for key: {}", cache_key))
    }

    /// image metadata cacheを読み込み
    pub fn load_cached_image_metadata(&self, cache_key: &str) -> Option<ImageMetadataCache> {
        let cache_info_path = self.get_image_metadata_cache_path(cache_key);
        if !cache_info_path.exists() {
            return None;
        }

        match fs::read_to_string(&cache_info_path) {
            Ok(json_str) => serde_json::from_str::<ImageMetadataCache>(&json_str).ok(),
            Err(_) => None,
        }
    }

    /// image metadata cacheを保存
    pub fn save_image_metadata_cache(
        &self,
        cache_key: &str,
        cache_info: &ImageMetadataCache,
    ) -> Result<(), String> {
        let cache_info_path = self.get_image_metadata_cache_path(cache_key);
        println!(
            "💾 Saving image metadata cache: cache_key={}, path={}",
            cache_key,
            cache_info_path.display()
        );

        let json_str = serde_json::to_string_pretty(cache_info)
            .map_err(|e| format!("Failed to convert image metadata cache to JSON: {}", e))?;

        fs::write(&cache_info_path, json_str).map_err(|e| {
            println!("❌ Failed to save image metadata cache: {}", e);
            format!("Failed to save image metadata cache: {}", e)
        })?;

        println!("✅ Image metadata cache saved successfully");
        Ok(())
    }

    /// サムネイル画像ファイルを保存
    pub fn save_thumbnail_file(&self, cache_key: &str, image_data: &[u8]) -> Result<(), String> {
        let thumbnail_path = self.get_thumbnail_path(cache_key);
        println!(
            "💾 Saving thumbnail file: cache_key={}, path={}, size={}bytes",
            cache_key,
            thumbnail_path.display(),
            image_data.len()
        );

        fs::write(&thumbnail_path, image_data).map_err(|e| {
            println!("❌ Failed to save thumbnail file: {}", e);
            format!("Failed to save thumbnail file: {}", e)
        })?;

        println!("✅ Thumbnail file saved successfully");
        Ok(())
    }

    /// thumbnail cacheをクリア
    pub fn clear_thumbnail_cache(&self) -> Result<(), String> {
        if self.cache_dir.exists() {
            self.clear_directory(&self.cache_dir)?;
        }
        Ok(())
    }

    fn clear_directory(&self, dir: &PathBuf) -> Result<(), String> {
        let entries = fs::read_dir(dir).map_err(|e| format!("Failed to read directory: {}", e))?;

        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                let _ = fs::remove_file(&path);
            }
        }

        Ok(())
    }
}
