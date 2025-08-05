use crate::common::{AppError, AppResult};
use crate::sd_parameters::SdParameters;
use png::Decoder;
use std::io::Cursor;

/// PNG画像の基本情報と拡張情報
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
                    Err(_) => continue, // 解析失敗は無視して次へ
                }
            }
        }
        
        Ok(None)
    }

    /// バイト配列からPNG情報とSDパラメーターを一括抽出（効率的）
    pub fn extract_comprehensive_info(data: &[u8]) -> AppResult<(PngInfo, Option<SdParameters>)> {
        let cursor = Cursor::new(data);
        let decoder = Decoder::new(cursor);
        let reader = decoder.read_info()?;
        let info = reader.info();

        println!("DEBUG: PNG情報読み込み完了 - width: {}, height: {}", info.width, info.height);
        println!("DEBUG: tEXtチャンク数: {}", info.uncompressed_latin1_text.len());

        let png_info = PngInfo {
            width: info.width,
            height: info.height,
            bit_depth: info.bit_depth as u8,
            color_type: format!("{:?}", info.color_type),
        };

        // SD Parameters を検索・解析
        let mut sd_parameters = None;
        for (i, entry) in info.uncompressed_latin1_text.iter().enumerate() {
            println!("DEBUG: tEXtチャンク[{}] - keyword: '{}', text_length: {}", 
                i, entry.keyword, entry.text.len());
            if entry.keyword == "parameters" {
                println!("DEBUG: parametersチャンク発見! 内容の一部: {}...", 
                    &entry.text.chars().take(100).collect::<String>());
                match SdParameters::parse(&entry.text) {
                    Ok(params) => {
                        println!("DEBUG: SDパラメータ解析成功!");
                        sd_parameters = Some(params);
                        break;
                    }
                    Err(e) => {
                        println!("DEBUG: SDパラメータ解析失敗: {}", e);
                        continue; // 解析失敗は無視
                    }
                }
            }
        }

        if sd_parameters.is_none() {
            println!("DEBUG: SDパラメータが見つかりませんでした");
        }

        Ok((png_info, sd_parameters))
    }
}

/// 画像の基本情報を取得（PNG以外の形式）
pub fn extract_basic_image_info(data: &[u8]) -> AppResult<(u32, u32)> {
    match image::load_from_memory(data) {
        Ok(img) => Ok((img.width(), img.height())),
        Err(e) => Err(AppError::ImageError(e)),
    }
}