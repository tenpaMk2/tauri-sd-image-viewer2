use crate::common::AppResult;
use crate::sd_parameters::SdParameters;
use png::Decoder;
use std::io::Cursor;

/// PNG画像からSDパラメーターのみを抽出
pub fn extract_sd_parameters(data: &[u8]) -> AppResult<Option<SdParameters>> {
    let cursor = Cursor::new(data);
    let decoder = Decoder::new(cursor);
    let reader = decoder.read_info()?;
    let info = reader.info();

    let sd_parameters = info
        .uncompressed_latin1_text
        .iter()
        .find(|entry| entry.keyword == "parameters")
        .and_then(|entry| SdParameters::parse(&entry.text).ok());

    Ok(sd_parameters)
}
