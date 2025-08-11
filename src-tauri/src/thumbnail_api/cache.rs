use super::{ImageMetadataCache, ThumbnailConfig};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;

/// New cache system - file path based cache management
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
    pub fn get_image_metadata_cache_path(&self, cache_key: &str) -> PathBuf {
        self.cache_dir.join(format!("{}.json", cache_key))
    }

    /// サムネイル画像ファイルのパスを取得
    pub fn get_thumbnail_path(&self, cache_key: &str) -> PathBuf {
        self.cache_dir.join(format!("{}.webp", cache_key))
    }

    /// キャッシュ作成すべきかチェック
    pub fn should_cache_generate(
        &self,
        cache_key: &str,
        original_path: &str,
        config: &ThumbnailConfig,
    ) -> bool {
        let image_metadata_cache_path = self.get_image_metadata_cache_path(cache_key);
        let thumbnail_path = self.get_thumbnail_path(cache_key);

        println!(
            "🔍 キャッシュ有効性チェック開始: path={}, cache_key={}",
            original_path, cache_key
        );

        // キャッシュファイルが存在するかチェック
        if !image_metadata_cache_path.exists() || !thumbnail_path.exists() {
            println!(
                "❌ キャッシュファイル不存在: info_exists={}, thumb_exists={}",
                image_metadata_cache_path.exists(),
                thumbnail_path.exists()
            );
            return true;
        }

        println!("✅ キャッシュファイル存在確認完了");

        // キャッシュ情報を読み込み
        let image_metadata_cache = match self.load_image_metadata_cache(cache_key) {
            Some(info) => {
                println!("✅ キャッシュ情報読み込み成功");
                info
            }
            None => {
                println!("❌ キャッシュ情報読み込み失敗");
                return false;
            }
        };

        // Get filesystem information
        let original_metadata = match fs::metadata(original_path) {
            Ok(metadata) => metadata,
            Err(e) => {
                println!("❌ オリジナルファイルのメタデータ取得失敗: {}", e);
                return false;
            }
        };
        let original_modified_time: u64 = original_metadata
            .modified()
            .map(|t| {
                t.duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_secs())
                    .unwrap_or_else(|e| {
                        println!("❌ オリジナルファイルの変更時刻取得失敗: {}", e);
                        0
                    })
            })
            .unwrap_or_else(|e| {
                println!("❌ オリジナルファイルの変更時刻取得失敗: {}", e);
                0
            });

        // ファイル変更をチェック（軽量版：解像度なしの比較）
        let file_changed = image_metadata_cache.cached_at < original_modified_time;
        let config_changed = image_metadata_cache.thumbnail_config != *config;

        println!("🔄 変更検出結果: file_changed={}, config_changed={}", file_changed, config_changed);

        file_changed || config_changed
    }

    /// Load cache data (assumes cache validity has been checked)
    pub fn load_image_metadata_cache2(
        &self,
        cache_key: &str,
    ) -> Result<ImageMetadataCache, String> {
        self.load_image_metadata_cache(cache_key)
            .ok_or_else(|| format!("Failed to load cache data for key: {}", cache_key))
    }



    /// キャッシュ情報を読み込み
    pub fn load_image_metadata_cache(&self, cache_key: &str) -> Option<ImageMetadataCache> {
        let cache_info_path = self.get_image_metadata_cache_path(cache_key);
        if !cache_info_path.exists() {
            return None;
        }

        match fs::read_to_string(&cache_info_path) {
            Ok(json_str) => serde_json::from_str::<ImageMetadataCache>(&json_str).ok(),
            Err(_) => None,
        }
    }

    /// キャッシュ情報を保存
    pub fn save_cache_info(
        &self,
        cache_key: &str,
        cache_info: &ImageMetadataCache,
    ) -> Result<(), String> {
        let cache_info_path = self.get_image_metadata_cache_path(cache_key);
        println!(
            "💾 キャッシュ情報保存開始: cache_key={}, path={}",
            cache_key,
            cache_info_path.display()
        );

        let json_str = serde_json::to_string_pretty(cache_info)
            .map_err(|e| format!("キャッシュ情報のJSON変換に失敗: {}", e))?;

        fs::write(&cache_info_path, json_str).map_err(|e| {
            println!("❌ キャッシュ情報保存失敗: {}", e);
            format!("キャッシュ情報の保存に失敗: {}", e)
        })?;

        println!("✅ キャッシュ情報保存成功");
        Ok(())
    }

    /// サムネイル画像を保存
    pub fn save_thumbnail_image(&self, cache_key: &str, image_data: &[u8]) -> Result<(), String> {
        let thumbnail_path = self.get_thumbnail_path(cache_key);
        println!(
            "💾 サムネイル画像保存開始: cache_key={}, path={}, size={}bytes",
            cache_key,
            thumbnail_path.display(),
            image_data.len()
        );

        fs::write(&thumbnail_path, image_data).map_err(|e| {
            println!("❌ サムネイル画像保存失敗: {}", e);
            format!("サムネイル画像の保存に失敗: {}", e)
        })?;

        println!("✅ サムネイル画像保存成功");
        Ok(())
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
