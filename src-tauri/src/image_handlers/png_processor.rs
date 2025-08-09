use crate::common::AppResult;
use crate::sd_parameters::SdParameters;
use png::Decoder;
use std::io::Cursor;

/// PNG画像の基本情報
#[derive(Debug, Clone)]
pub struct PngInfo {
    pub width: u32,
    pub height: u32,
}

/// PNG画像処理の統合ハンドラー
pub struct PngProcessor;

impl PngProcessor {

    /// バイト配列からPNG情報とSDパラメーターを一括抽出
    pub fn extract_comprehensive_info(data: &[u8]) -> AppResult<(PngInfo, Option<SdParameters>)> {
        let cursor = Cursor::new(data);
        let decoder = Decoder::new(cursor);
        let reader = decoder.read_info()?;
        let info = reader.info();

        let png_info = PngInfo {
            width: info.width,
            height: info.height,
        };

        let sd_parameters = info
            .uncompressed_latin1_text
            .iter()
            .find(|entry| entry.keyword == "parameters")
            .and_then(|entry| SdParameters::parse(&entry.text).ok());

        Ok((png_info, sd_parameters))
    }

}

