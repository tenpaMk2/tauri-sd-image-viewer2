use super::metadata_info::ImageMetadataInfo;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, SystemTime};
use tauri::{AppHandle, Manager, Runtime};

#[derive(Serialize, Deserialize, Clone)]
struct CacheEntry {
    file_size: u64,
    modified_time: SystemTime,
    metadata: ImageMetadataInfo,
    cached_at: SystemTime,
}

pub struct MetadataCache {
    memory_cache: Mutex<HashMap<String, CacheEntry>>,
    cache_file_path: PathBuf,
}

impl MetadataCache {
    pub fn new<R: Runtime>(app: &AppHandle<R>) -> Result<Self, String> {
        let cache_path = Self::get_cache_file_path(app)?;

        // ディスクキャッシュが存在する場合は読み込み
        let memory_cache = if cache_path.exists() {
            Self::load_from_disk(&cache_path)?
        } else {
            HashMap::new()
        };

        println!(
            "📂 メタデータキャッシュ初期化: {} entries loaded",
            memory_cache.len()
        );

        Ok(Self {
            memory_cache: Mutex::new(memory_cache),
            cache_file_path: cache_path,
        })
    }

    pub fn get_metadata(&self, file_path: &str) -> Option<ImageMetadataInfo> {
        let mut cache = self.memory_cache.lock().unwrap();

        if let Some(entry) = cache.get(file_path) {
            // ファイル変更チェック
            if self.is_file_unchanged(file_path, entry).unwrap_or(false) {
                return Some(entry.metadata.clone());
            }
            // 変更されていたらキャッシュから削除
            cache.remove(file_path);
        }
        None
    }

    pub fn store_metadata(&self, file_path: String, metadata: ImageMetadataInfo) {
        let file_metadata = match fs::metadata(&file_path) {
            Ok(metadata) => metadata,
            Err(e) => {
                eprintln!("Failed to get file metadata for {}: {}", file_path, e);
                return;
            }
        };

        let entry = CacheEntry {
            file_size: file_metadata.len(),
            modified_time: file_metadata.modified().unwrap_or(SystemTime::UNIX_EPOCH),
            metadata,
            cached_at: SystemTime::now(),
        };

        let mut cache = self.memory_cache.lock().unwrap();
        cache.insert(file_path.clone(), entry);

        println!(
            "💾 キャッシュに保存: {} (total: {} entries)",
            file_path.split('/').last().unwrap_or(""),
            cache.len()
        );
    }

    pub fn save_on_shutdown(&self) -> Result<(), String> {
        let cache = self.memory_cache.lock().unwrap();

        if cache.is_empty() {
            println!("📝 キャッシュが空のため、ディスク保存をスキップ");
            return Ok(());
        }

        // JSONにシリアライズ
        let json_data = serde_json::to_string_pretty(&*cache)
            .map_err(|e| format!("Cache serialization error: {}", e))?;

        // 親ディレクトリを作成
        if let Some(parent) = self.cache_file_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Cache directory creation error: {}", e))?;
        }

        // ファイルに書き込み
        fs::write(&self.cache_file_path, json_data)
            .map_err(|e| format!("Cache file write error: {}", e))?;

        println!(
            "💾 終了時キャッシュ保存完了: {} entries → {}",
            cache.len(),
            self.cache_file_path.display()
        );

        Ok(())
    }

    fn load_from_disk(path: &Path) -> Result<HashMap<String, CacheEntry>, String> {
        let content =
            fs::read_to_string(path).map_err(|e| format!("Cache file read error: {}", e))?;

        let cache_data: HashMap<String, CacheEntry> =
            serde_json::from_str(&content).map_err(|e| format!("Cache JSON parse error: {}", e))?;

        // 古いエントリを削除（30日以上）
        let cutoff = SystemTime::now() - Duration::from_secs(30 * 24 * 3600);
        let filtered: HashMap<_, _> = cache_data
            .into_iter()
            .filter(|(_, entry)| entry.cached_at > cutoff)
            .collect();

        println!(
            "📂 ディスクキャッシュ読み込み完了: {} entries (古いエントリを除去)",
            filtered.len()
        );
        Ok(filtered)
    }

    fn is_file_unchanged(
        &self,
        file_path: &str,
        cached_entry: &CacheEntry,
    ) -> Result<bool, String> {
        let current_metadata = fs::metadata(file_path)
            .map_err(|e| format!("Failed to get current file metadata: {}", e))?;

        let current_size = current_metadata.len();
        let current_modified = current_metadata
            .modified()
            .map_err(|e| format!("Failed to get modification time: {}", e))?;

        // ファイルサイズと更新時刻で軽量変更検出
        Ok(
            current_size == cached_entry.file_size
                && current_modified == cached_entry.modified_time,
        )
    }

    fn get_cache_file_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
        app.path()
            .app_cache_dir()
            .map(|cache_dir| cache_dir.join("metadata_cache.json"))
            .map_err(|e| format!("Failed to get metadata cache file path: {}", e))
    }
}
