use crate::common::{detect_mime_type_from_path};
use image::{DynamicImage, GenericImageView};
use memmap2::{Mmap, MmapOptions};
use std::fs::File;

/// 統一画像読み込みハンドラー
pub struct ImageReader {
    mmap: Mmap,
    mime_type: String,
}

impl ImageReader {
    /// ファイルから画像を読み込み（全形式でmmap使用）
    pub fn from_file(path: &str) -> Result<Self, String> {
        let file = File::open(path)
            .map_err(|e| format!("ファイルオープンに失敗: {} - {}", path, e))?;

        let mmap = unsafe {
            MmapOptions::new()
                .map(&file)
                .map_err(|e| format!("メモリマップに失敗: {} - {}", path, e))?
        };

        let mime_type = detect_mime_type_from_path(path);

        println!("📖 画像ファイル読み込み: path={}, mime_type={}, size={}bytes", 
                 path, mime_type, mmap.len());

        Ok(Self { mmap, mime_type })
    }

    /// バイト配列としてアクセス（メタデータ処理用）
    pub fn as_bytes(&self) -> &[u8] {
        &self.mmap
    }

    /// MIME型を取得
    pub fn mime_type(&self) -> &str {
        &self.mime_type
    }

    /// 軽量解像度取得（全形式統一、最適化済み）
    pub fn get_dimensions(&self) -> Result<(u32, u32), String> {
        let img = image::load_from_memory(self.as_bytes())
            .map_err(|e| format!("画像デコードに失敗: {}", e))?;
        Ok(img.dimensions())
    }

    /// サムネイル処理用DynamicImage生成（必要時のみ）
    pub fn to_dynamic_image(&self) -> Result<DynamicImage, String> {
        println!("🔄 DynamicImage変換開始: mime_type={}", self.mime_type);
        
        let img = image::load_from_memory(self.as_bytes())
            .map_err(|e| format!("画像のDynamicImage変換に失敗: {}", e))?;
            
        println!("✅ DynamicImage変換完了: dimensions={}x{}", img.width(), img.height());
        Ok(img)
    }
}
