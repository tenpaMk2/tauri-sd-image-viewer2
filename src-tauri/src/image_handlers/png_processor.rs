use crate::common::{read_file_safe, AppResult};
use crate::sd_parameters::SdParameters;
use crate::types::{PngImageInfo, ImageMetadataInfo};
use crate::exif_info::ExifInfo;
use png::Decoder;
use std::io::Cursor;

/// PNG画像の基本情報
#[derive(Debug, Clone)]
pub struct PngInfo {
    pub width: u32,
    pub height: u32,
    pub bit_depth: u8,
    pub color_type: String,
}

/// PNG画像処理の統合ハンドラー
pub struct PngProcessor;

impl PngProcessor {
    /// バイト配列からSDパラメーターを抽出
    pub fn extract_sd_parameters(data: &[u8]) -> AppResult<Option<SdParameters>> {
        let cursor = Cursor::new(data);
        let decoder = Decoder::new(cursor);
        let reader = decoder.read_info()?;
        let info = reader.info();

        // SD Parameters を検索・解析
        for entry in &info.uncompressed_latin1_text {
            if entry.keyword == "parameters" {
                match SdParameters::parse(&entry.text) {
                    Ok(params) => return Ok(Some(params)),
                    Err(_) => continue,
                }
            }
        }
        
        Ok(None)
    }

    /// バイト配列からPNG情報とSDパラメーターを一括抽出
    pub fn extract_comprehensive_info(data: &[u8]) -> AppResult<(PngInfo, Option<SdParameters>)> {
        let cursor = Cursor::new(data);
        let decoder = Decoder::new(cursor);
        let reader = decoder.read_info()?;
        let info = reader.info();

        let png_info = PngInfo {
            width: info.width,
            height: info.height,
            bit_depth: info.bit_depth as u8,
            color_type: format!("{:?}", info.color_type),
        };

        let sd_parameters = info.uncompressed_latin1_text
            .iter()
            .find(|entry| entry.keyword == "parameters")
            .and_then(|entry| SdParameters::parse(&entry.text).ok());

        Ok((png_info, sd_parameters))
    }

    /// 包括的なメタデータ情報を取得
    pub fn extract_metadata_info(path: &str) -> AppResult<ImageMetadataInfo> {
        let data = read_file_safe(path)?;
        let file_size = data.len() as u64;
        
        let (png_info, sd_parameters) = Self::extract_comprehensive_info(&data)?;
        
        // Exif情報を抽出
        let exif_info = ExifInfo::from_bytes(&data, "png");
        
        Ok(ImageMetadataInfo {
            width: png_info.width,
            height: png_info.height,
            file_size,
            mime_type: "image/png".to_string(),
            sd_parameters,
            exif_info,
        })
    }
}

/// PNG画像情報を読み込み（Tauri API）
#[tauri::command]
pub fn read_png_image_info(path: String) -> Result<PngImageInfo, String> {
    let data = read_file_safe(&path).map_err(|e| e.to_string())?;
    let (png_info, sd_parameters) = PngProcessor::extract_comprehensive_info(&data)
        .map_err(|e| e.to_string())?;
    
    Ok(PngImageInfo {
        width: png_info.width,
        height: png_info.height,
        bit_depth: png_info.bit_depth,
        color_type: png_info.color_type,
        sd_parameters,
    })
}

/// ファイルパスからSDパラメーターのみを読み取り（Tauri API）
#[tauri::command]
pub fn read_png_sd_parameters(path: String) -> Result<Option<SdParameters>, String> {
    let data = read_file_safe(&path).map_err(|e| e.to_string())?;
    PngProcessor::extract_sd_parameters(&data).map_err(|e| e.to_string())
}