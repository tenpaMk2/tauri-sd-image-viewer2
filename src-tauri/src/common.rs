use std::fmt;

/// アプリケーション共通のエラー型
#[derive(Debug)]
pub enum AppError {
    IoError(std::io::Error),
    ImageError(image::ImageError),
    PngError(png::DecodingError),
    ExifError(String),
    ParseError(String),
    InvalidInput(String),
    CacheError(String),
    ThumbnailGenerationError(String),
    MetadataError(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::IoError(e) => write!(f, "ファイル読み込みエラー: {}", e),
            AppError::ImageError(e) => write!(f, "画像処理エラー: {}", e),
            AppError::PngError(e) => write!(f, "PNG解析エラー: {}", e),
            AppError::ExifError(e) => write!(f, "Exif処理エラー: {}", e),
            AppError::ParseError(e) => write!(f, "解析エラー: {}", e),
            AppError::InvalidInput(e) => write!(f, "入力エラー: {}", e),
            AppError::CacheError(e) => write!(f, "キャッシュエラー: {}", e),
            AppError::ThumbnailGenerationError(e) => write!(f, "サムネイル生成エラー: {}", e),
            AppError::MetadataError(e) => write!(f, "メタデータエラー: {}", e),
        }
    }
}

impl From<std::io::Error> for AppError {
    fn from(error: std::io::Error) -> Self {
        AppError::IoError(error)
    }
}

impl From<image::ImageError> for AppError {
    fn from(error: image::ImageError) -> Self {
        AppError::ImageError(error)
    }
}

impl From<png::DecodingError> for AppError {
    fn from(error: png::DecodingError) -> Self {
        AppError::PngError(error)
    }
}

impl From<String> for AppError {
    fn from(error: String) -> Self {
        AppError::ParseError(error)
    }
}

impl From<AppError> for String {
    fn from(error: AppError) -> Self {
        error.to_string()
    }
}

pub type AppResult<T> = Result<T, AppError>;

/// ファイル拡張子からMIMEタイプを推定
pub fn detect_mime_type_from_path(path: &str) -> String {
    let extension = path.split('.').last().unwrap_or("").to_lowercase();
    match extension.as_str() {
        "png" => "image/png".to_string(),
        "jpg" | "jpeg" => "image/jpeg".to_string(),
        "webp" => "image/webp".to_string(),
        _ => "application/octet-stream".to_string(),
    }
}

/// 画像データのヘッダーから正確なMIMEタイプを判定
pub fn detect_mime_type_from_content(data: &[u8]) -> String {
    if data.len() < 12 {
        return "application/octet-stream".to_string();
    }

    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if data.len() >= 8 && &data[0..8] == b"\x89PNG\r\n\x1a\n" {
        return "image/png".to_string();
    }

    // JPEG signature: FF D8
    if data.len() >= 2 && data[0] == 0xFF && data[1] == 0xD8 {
        return "image/jpeg".to_string();
    }

    // WebP signature: RIFF....WEBP
    if data.len() >= 12 && &data[0..4] == b"RIFF" && &data[8..12] == b"WEBP" {
        return "image/webp".to_string();
    }

    // フォールバック: 不明な形式
    "application/octet-stream".to_string()
}

