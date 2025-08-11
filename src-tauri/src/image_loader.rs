use image::{DynamicImage, GenericImageView};
use memmap2::{Mmap, MmapOptions};
use std::fs::File;

/// 統一画像読み込みハンドラー
pub struct ImageReader {
    mmap: Mmap,
    path: String,
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

        println!("📖 画像ファイル読み込み: path={}, size={}bytes", 
                 path, mmap.len());

        Ok(Self { 
            mmap, 
            path: path.to_string() 
        })
    }

    /// バイト配列としてアクセス（メタデータ処理用）
    pub fn as_bytes(&self) -> &[u8] {
        &self.mmap
    }

    /// MIME型を取得（パスから判定）
    pub fn mime_type(&self) -> String {
        crate::common::detect_mime_type_from_path(&self.path)
    }

    /// 軽量解像度取得（ヘッダーパース最適化）
    pub fn get_dimensions(&self) -> Result<(u32, u32), String> {
        // 各形式のヘッダーから高速取得を試行
        match self.mime_type().as_str() {
            "image/png" => self.parse_png_dimensions(),
            "image/jpeg" => self.parse_jpeg_dimensions(),
            "image/webp" => self.parse_webp_dimensions(),
            _ => {
                // フォールバック: 従来の方法
                println!("⚠️ 未対応形式、フォールバック実行: {}", self.mime_type());
                let img = image::load_from_memory(self.as_bytes())
                    .map_err(|e| format!("画像デコードに失敗: {}", e))?;
                Ok(img.dimensions())
            }
        }
    }

    /// サムネイル処理用DynamicImage生成（必要時のみ）
    pub fn to_dynamic_image(&self) -> Result<DynamicImage, String> {
        println!("🔄 DynamicImage変換開始: mime_type={}", self.mime_type());
        
        let img = image::load_from_memory(self.as_bytes())
            .map_err(|e| format!("画像のDynamicImage変換に失敗: {}", e))?;
            
        println!("✅ DynamicImage変換完了: dimensions={}x{}", img.width(), img.height());
        Ok(img)
    }

    /// PNG形式の解像度をIHDRチャンクから高速取得
    fn parse_png_dimensions(&self) -> Result<(u32, u32), String> {
        let data = self.as_bytes();
        
        // PNG signature check (8 bytes)
        if data.len() < 24 || &data[0..8] != b"\x89PNG\r\n\x1a\n" {
            return Err("Invalid PNG signature".to_string());
        }

        // IHDR chunk should be the first chunk after signature
        // Length (4) + Type "IHDR" (4) + Width (4) + Height (4) = at offset 16-23
        if &data[12..16] != b"IHDR" {
            return Err("IHDR chunk not found at expected position".to_string());
        }

        // Width and Height are stored as big-endian u32
        let width = u32::from_be_bytes([data[16], data[17], data[18], data[19]]);
        let height = u32::from_be_bytes([data[20], data[21], data[22], data[23]]);

        println!("🚀 PNG解像度高速取得: {}x{}", width, height);
        Ok((width, height))
    }

    /// JPEG形式の解像度をSOFセグメントから高速取得
    fn parse_jpeg_dimensions(&self) -> Result<(u32, u32), String> {
        let data = self.as_bytes();
        
        // JPEG signature check
        if data.len() < 4 || data[0] != 0xFF || data[1] != 0xD8 {
            return Err("Invalid JPEG signature".to_string());
        }

        let mut pos = 2;
        while pos + 4 < data.len() {
            if data[pos] != 0xFF {
                return Err("Invalid JPEG marker".to_string());
            }

            let marker = data[pos + 1];
            
            // SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2) markers
            if marker == 0xC0 || marker == 0xC1 || marker == 0xC2 {
                if pos + 9 < data.len() {
                    // Height and Width are stored as big-endian u16 at offset +5 and +7
                    let height = u16::from_be_bytes([data[pos + 5], data[pos + 6]]) as u32;
                    let width = u16::from_be_bytes([data[pos + 7], data[pos + 8]]) as u32;
                    
                    println!("🚀 JPEG解像度高速取得: {}x{}", width, height);
                    return Ok((width, height));
                }
            }

            // Skip to next segment
            if pos + 2 >= data.len() {
                break;
            }
            let segment_length = u16::from_be_bytes([data[pos + 2], data[pos + 3]]) as usize;
            pos += 2 + segment_length;
        }

        Err("SOF segment not found in JPEG".to_string())
    }

    /// WebP形式の解像度をヘッダーから高速取得
    fn parse_webp_dimensions(&self) -> Result<(u32, u32), String> {
        let data = self.as_bytes();
        
        // WebP signature check
        if data.len() < 20 || &data[0..4] != b"RIFF" || &data[8..12] != b"WEBP" {
            return Err("Invalid WebP signature".to_string());
        }

        // Check for VP8, VP8L, or VP8X chunks
        if data.len() >= 30 && &data[12..16] == b"VP8 " {
            // VP8 format
            let width = ((data[26] as u32) | ((data[27] as u32) << 8)) & 0x3FFF;
            let height = ((data[28] as u32) | ((data[29] as u32) << 8)) & 0x3FFF;
            
            println!("🚀 WebP(VP8)解像度高速取得: {}x{}", width + 1, height + 1);
            Ok((width + 1, height + 1))
        } else if data.len() >= 25 && &data[12..16] == b"VP8L" {
            // VP8L format
            let bits = u32::from_le_bytes([data[21], data[22], data[23], data[24]]);
            let width = (bits & 0x3FFF) + 1;
            let height = ((bits >> 14) & 0x3FFF) + 1;
            
            println!("🚀 WebP(VP8L)解像度高速取得: {}x{}", width, height);
            Ok((width, height))
        } else if data.len() >= 24 && &data[12..16] == b"VP8X" {
            // VP8X format (extended)
            let width = (u32::from_le_bytes([data[20], data[21], data[22], 0]) & 0xFFFFFF) + 1;
            let height = (u32::from_le_bytes([data[23], data[24], data[25], 0]) & 0xFFFFFF) + 1;
            
            println!("🚀 WebP(VP8X)解像度高速取得: {}x{}", width, height);
            Ok((width, height))
        } else {
            Err("Unsupported WebP variant".to_string())
        }
    }
}
