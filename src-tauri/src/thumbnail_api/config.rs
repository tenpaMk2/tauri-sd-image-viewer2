use serde::{Deserialize, Serialize};

/// サムネイル生成設定
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ThumbnailConfig {
    pub size: u32,
    pub quality: u8,
    pub format: String, // "webp"
}

// シンプルな構造体のみ - 設定変更APIは削除

impl Default for ThumbnailConfig {
    fn default() -> Self {
        Self {
            size: 256,
            quality: 70,
            format: "webp".to_string(),
        }
    }
}
