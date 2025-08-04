use crate::sd_parameters::SdParameters;
use png::Decoder;
use std::io::Cursor;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PngImageInfo {
    pub width: u32,
    pub height: u32,
    pub bit_depth: u8,
    pub color_type: String,
    pub sd_parameters: Option<SdParameters>,
}

/// PNG画像情報を読み込み（Tauri API）
#[tauri::command]
pub fn read_png_image_info(path: String) -> Result<PngImageInfo, String> {
    let data = std::fs::read(&path).map_err(|e| format!("ファイル読み込みエラー: {}", e))?;
    read_png_info_from_bytes(&data)
}

/// バイトデータからPNG情報を読み取り（中核処理）
pub fn read_png_info_from_bytes(data: &[u8]) -> Result<PngImageInfo, String> {
    let cursor = Cursor::new(data);
    let decoder = Decoder::new(cursor);
    let reader = decoder
        .read_info()
        .map_err(|e| format!("PNG解析エラー: {}", e))?;
    let info = reader.info();

    // SD Parameters を検索・解析
    let mut sd_parameters = None;
    for entry in &info.uncompressed_latin1_text {
        if entry.keyword == "parameters" {
            match SdParameters::parse(&entry.text) {
                Ok(params) => sd_parameters = Some(params),
                Err(_) => {} // 解析失敗は無視
            }
            break;
        }
    }

    Ok(PngImageInfo {
        width: info.width,
        height: info.height,
        bit_depth: info.bit_depth as u8,
        color_type: format!("{:?}", info.color_type),
        sd_parameters,
    })
}

/// バイトデータからSDパラメーターのみを読み取り（軽量版）
pub fn read_png_sd_parameters_from_bytes(data: &[u8]) -> Option<SdParameters> {
    let cursor = Cursor::new(data);
    let decoder = Decoder::new(cursor);
    let reader = decoder.read_info().ok()?;
    let info = reader.info();

    // SD Parameters のみを検索
    for entry in &info.uncompressed_latin1_text {
        if entry.keyword == "parameters" {
            if let Ok(params) = SdParameters::parse(&entry.text) {
                return Some(params);
            }
            break;
        }
    }
    None
}

/// ファイルパスからSDパラメーターのみを読み取り（Tauri API）
#[tauri::command]
pub fn read_png_sd_parameters(path: String) -> Result<Option<SdParameters>, String> {
    let data = std::fs::read(&path).map_err(|e| format!("ファイル読み込みエラー: {}", e))?;
    Ok(read_png_sd_parameters_from_bytes(&data))
}