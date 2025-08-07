use crate::common::{AppError, AppResult};

/// 汎用画像処理ハンドラー（PNG以外の形式用）
pub struct GenericImageProcessor;

impl GenericImageProcessor {
    /// 画像の基本情報を取得（PNG以外の形式）
    pub fn extract_basic_image_info(data: &[u8]) -> AppResult<(u32, u32)> {
        match image::load_from_memory(data) {
            Ok(img) => Ok((img.width(), img.height())),
            Err(e) => Err(AppError::ImageError(e)),
        }
    }

}
