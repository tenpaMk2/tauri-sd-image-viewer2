use chrono::Local;
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

/// Timestamp付きロギング関数
///
/// # 引数
/// * `identifier` - 最大30文字のログ識別子（超過時は末尾3文字を...に置換）
/// * `message` - ログメッセージ
///
/// # フォーマット
/// [YYYY-MM-DD HH:MM:SS.mmm] [identifier] message
pub fn log_with_timestamp(file_path: &str, message: &str) {
    let now = Local::now();
    let timestamp = now.format("%Y-%m-%d %H:%M:%S%.3f");

    let file_name = std::path::Path::new(file_path)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or(file_path);

    let truncated_identifier = if file_name.chars().count() <= 30 {
        file_name.to_string()
    } else {
        let mut result = String::new();
        for (i, ch) in file_name.chars().enumerate() {
            if i < 27 {
                result.push(ch);
            } else {
                break;
            }
        }
        format!("{}...", result)
    };

    println!("[{}] [{}] {}", timestamp, truncated_identifier, message);
}
