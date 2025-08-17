use super::image_metadata::ImageMetadata;
use crate::image_file_lock_service::ImageFileLockService;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, SystemTime};
use tauri::{AppHandle, Manager};
use tokio::fs as async_fs;
use tokio::sync::Mutex as AsyncMutex;

#[derive(Serialize, Deserialize, Clone)]
struct CacheEntry {
    file_size: u64,
    modified_time: u64, // UNIXタイムスタンプ
    image_metadata: ImageMetadata,
    cached_at: u64, // UNIXタイムスタンプ
}

pub struct MetadataCache {
    memory_cache: Mutex<HashMap<String, CacheEntry>>,
    cache_file_path: PathBuf,
}

impl MetadataCache {
    /// SystemTimeをUNIXタイムスタンプに変換
    fn system_time_to_unix_timestamp(time: SystemTime) -> u64 {
        time.duration_since(SystemTime::UNIX_EPOCH)
            .unwrap_or(Duration::from_secs(0))
            .as_secs()
    }

    pub fn new(cache_file_path: PathBuf) -> Result<Self, String> {
        // ディスクキャッシュが存在する場合は読み込み
        let memory_cache = if cache_file_path.exists() {
            Self::load_from_disk(&cache_file_path)?
        } else {
            HashMap::new()
        };

        println!(
            "📂 メタデータキャッシュ初期化: {} entries loaded",
            memory_cache.len()
        );

        Ok(Self {
            memory_cache: Mutex::new(memory_cache),
            cache_file_path: cache_file_path,
        })
    }

    pub async fn get_metadata(
        &self,
        file_path: &str,
        app_handle: &AppHandle,
    ) -> Option<ImageMetadata> {
        // First, get entry from cache without holding the lock across await
        let cached_entry = {
            let cache = self.memory_cache.lock().unwrap();
            cache.get(file_path).cloned()
        };

        if let Some(entry) = cached_entry {
            // ファイル変更チェック
            if self
                .is_file_unchanged(file_path, &entry, app_handle)
                .await
                .unwrap_or(false)
            {
                return Some(entry.image_metadata.clone());
            }
            // 変更されていたらキャッシュから削除
            let mut cache = self.memory_cache.lock().unwrap();
            cache.remove(file_path);
        }
        None
    }

    pub async fn store_metadata(
        &self,
        file_path: String,
        image_metadata: ImageMetadata,
        app_handle: &AppHandle,
    ) {
        // Get file lock service from app state
        let mutex = app_handle.state::<AsyncMutex<ImageFileLockService>>();
        let mut image_file_lock_service = mutex.lock().await;

        // Get path-specific mutex
        let path_mutex = image_file_lock_service.get_or_create_path_mutex(&file_path);
        drop(image_file_lock_service); // Release service lock immediately

        // Execute file metadata operation with exclusive access
        let file_metadata_result = ImageFileLockService::with_exclusive_file_access(
            path_mutex,
            file_path.clone(),
            |path| async move {
                async_fs::metadata(&path)
                    .await
                    .map_err(|e| format!("Failed to get file metadata for {}: {}", path, e))
            },
        )
        .await;

        let file_metadata = match file_metadata_result {
            Ok(metadata) => metadata,
            Err(e) => {
                eprintln!("{}", e);
                return;
            }
        };

        let entry = CacheEntry {
            file_size: file_metadata.len(),
            modified_time: Self::system_time_to_unix_timestamp(
                file_metadata.modified().unwrap_or(SystemTime::UNIX_EPOCH),
            ),
            image_metadata,
            cached_at: Self::system_time_to_unix_timestamp(SystemTime::now()),
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
        let now = SystemTime::now();
        let cutoff_timestamp =
            Self::system_time_to_unix_timestamp(now - Duration::from_secs(30 * 24 * 3600));
        let current_timestamp = Self::system_time_to_unix_timestamp(now);

        let original_count = cache_data.len();

        let filtered: HashMap<_, _> = cache_data
            .into_iter()
            .filter(|(file_path, entry)| {
                let age_days = (current_timestamp - entry.cached_at) / (24 * 3600);
                let keep = entry.cached_at > cutoff_timestamp;

                if !keep {
                    println!(
                        "🗑️ Removed cache entry: {} (age: {} days, cached_at: {}, cutoff: {})",
                        file_path.split('/').last().unwrap_or(""),
                        age_days,
                        entry.cached_at,
                        cutoff_timestamp
                    );
                }

                keep
            })
            .collect();

        let removed_count = original_count - filtered.len();
        println!(
            "📂 Disk cache loaded: {} entries (removed {} old entries)",
            filtered.len(),
            removed_count
        );
        Ok(filtered)
    }

    async fn is_file_unchanged(
        &self,
        file_path: &str,
        cached_entry: &CacheEntry,
        app_handle: &AppHandle,
    ) -> Result<bool, String> {
        // Get file lock service from app state
        let mutex = app_handle.state::<AsyncMutex<ImageFileLockService>>();
        let mut image_file_lock_service = mutex.lock().await;

        // Get path-specific mutex
        let path_mutex = image_file_lock_service.get_or_create_path_mutex(file_path);
        drop(image_file_lock_service); // Release service lock immediately

        // Execute file metadata operation with exclusive access
        let current_metadata = ImageFileLockService::with_exclusive_file_access(
            path_mutex,
            file_path.to_string(),
            |path| async move {
                async_fs::metadata(&path)
                    .await
                    .map_err(|e| format!("Failed to get current file metadata: {}", e))
            },
        )
        .await?;

        let current_size = current_metadata.len();
        let current_modified = current_metadata
            .modified()
            .map_err(|e| format!("Failed to get modification time: {}", e))?;
        let current_modified_timestamp = Self::system_time_to_unix_timestamp(current_modified);

        // ファイルサイズと更新時刻で軽量変更検出
        Ok(current_size == cached_entry.file_size
            && current_modified_timestamp == cached_entry.modified_time)
    }
}
