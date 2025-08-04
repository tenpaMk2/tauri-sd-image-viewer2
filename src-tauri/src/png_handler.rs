use crate::common::{read_file_safe, AppResult};
use crate::image_processor::PngProcessor;
use crate::sd_parameters::SdParameters;
use crate::types::PngImageInfo;

/// PNG画像情報を読み込み（Tauri API）
#[tauri::command]
pub fn read_png_image_info(path: String) -> Result<PngImageInfo, String> {
    read_png_info_internal(&path).map_err(|e| e.to_string())
}

fn read_png_info_internal(path: &str) -> AppResult<PngImageInfo> {
    let data = read_file_safe(path)?;
    let (png_info, sd_parameters) = PngProcessor::extract_comprehensive_info(&data)?;
    
    Ok(PngImageInfo {
        width: png_info.width,
        height: png_info.height,
        bit_depth: png_info.bit_depth,
        color_type: png_info.color_type,
        sd_parameters,
    })
}


/// バイトデータからSDパラメーターのみを読み取り（軽量版）
pub fn read_png_sd_parameters_from_bytes(data: &[u8]) -> Option<SdParameters> {
    PngProcessor::extract_sd_parameters(data).ok().flatten()
}

/// ファイルパスからSDパラメーターのみを読み取り（Tauri API）
#[tauri::command]
pub fn read_png_sd_parameters(path: String) -> Result<Option<SdParameters>, String> {
    let data = read_file_safe(&path).map_err(|e| e.to_string())?;
    Ok(read_png_sd_parameters_from_bytes(&data))
}