use std::fmt;
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::{BufReader, Read};

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

/// 安全なファイル読み込み処理
pub fn read_file_safe(path: &str) -> AppResult<Vec<u8>> {
    if path.trim().is_empty() {
        return Err(AppError::InvalidInput(
            "空のファイルパスが指定されました".to_string(),
        ));
    }

    if !std::path::Path::new(path).exists() {
        return Err(AppError::InvalidInput(format!(
            "ファイルが存在しません: {}",
            path
        )));
    }

    std::fs::read(path).map_err(AppError::from)
}

/// ファイルのSHA256ハッシュ値を計算
pub fn calculate_file_hash(path: &str) -> AppResult<String> {
    if path.trim().is_empty() {
        return Err(AppError::InvalidInput(
            "空のファイルパスが指定されました".to_string(),
        ));
    }

    let path_obj = std::path::Path::new(path);
    if !path_obj.exists() {
        return Err(AppError::InvalidInput(format!(
            "ファイルが存在しません: {}",
            path
        )));
    }

    let file = File::open(path)?;
    let mut reader = BufReader::new(file);
    let mut hasher = Sha256::new();
    let mut buffer = [0; 8192]; // 8KBずつ読み込み

    loop {
        let bytes_read = reader.read(&mut buffer)?;
        if bytes_read == 0 {
            break;
        }
        hasher.update(&buffer[..bytes_read]);
    }

    Ok(hex::encode(hasher.finalize()))
}

/// ファイルハッシュ計算（Tauri API）
#[tauri::command]
pub async fn calculate_file_hash_api(path: String) -> Result<String, String> {
    calculate_file_hash(&path).map_err(|e| e.to_string())
}
