use little_exif::exif_tag::ExifTag;
use little_exif::filetype::FileExtension;
use little_exif::ifd::ExifTagGroup;
use little_exif::metadata::Metadata;
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExifInfo {
    pub date_time_original: Option<String>,
    pub create_date: Option<String>,
    pub modify_date: Option<String>,
    pub rating: Option<u8>,
}

impl ExifInfo {
    /// バイト配列からExif情報を抽出
    pub fn from_bytes(data: &[u8], file_extension: &str) -> Option<Self> {
        let file_ext = determine_file_extension_from_str(file_extension);
        read_exif_from_bytes(data, file_ext)
    }
}

/// ファイル拡張子を判定
pub fn determine_file_extension_from_str(extension: &str) -> FileExtension {
    let ext = extension.to_lowercase();
    match ext.as_str() {
        "jpg" | "jpeg" => FileExtension::JPEG,
        "png" => FileExtension::PNG {
            as_zTXt_chunk: false,
        },
        "tiff" | "tif" => FileExtension::TIFF,
        "webp" => FileExtension::WEBP,
        "heif" | "heic" => FileExtension::HEIF,
        "jxl" => FileExtension::JXL,
        _ => FileExtension::JPEG, // デフォルト
    }
}

/// バイトデータからEXIF情報を読み取り（中核処理）
pub fn read_exif_from_bytes(data: &[u8], file_extension: FileExtension) -> Option<ExifInfo> {
    // WebPファイルの場合、VP8形式とVP8X形式の違いによりエラーが発生する可能性があるため、
    // エラーをキャッチして適切に処理する
    match std::panic::catch_unwind(|| Metadata::new_from_vec(&data.to_vec(), file_extension)) {
        Ok(Ok(metadata)) => extract_exif_info_from_metadata(&metadata),
        Ok(Err(_)) => None,
        Err(_) => None,
    }
}

/// Metadataオブジェクトから情報を抽出（共通処理）
fn extract_exif_info_from_metadata(metadata: &Metadata) -> Option<ExifInfo> {
    let mut exif_info = ExifInfo {
        date_time_original: None,
        create_date: None,
        modify_date: None,
        rating: None,
    };

    for tag in metadata {
        match tag {
            ExifTag::DateTimeOriginal(value) => {
                exif_info.date_time_original = Some(value.clone());
            }
            ExifTag::CreateDate(value) => {
                exif_info.create_date = Some(value.clone());
            }
            ExifTag::ModifyDate(value) => {
                exif_info.modify_date = Some(value.clone());
            }
            ExifTag::UnknownSTRING(value, tag_id, _) => {
                match *tag_id {
                    36867 => {  // DateTimeOriginal
                        exif_info.date_time_original = Some(value.clone());
                    }
                    306 => {    // DateTime
                        if exif_info.date_time_original.is_none() {
                            exif_info.date_time_original = Some(value.clone());
                        }
                    }
                    36868 => {  // DateTimeDigitized (CreateDate相当)
                        exif_info.create_date = Some(value.clone());
                    }
                    18246 => {  // Rating (Windows XP)
                        if let Ok(rating) = value.parse::<u8>() {
                            exif_info.rating = Some(rating);
                        }
                    }
                    _ => {}
                }
            }
            ExifTag::UnknownINT16U(values, tag_id, _) => {
                // Rating関連のタグ
                match *tag_id {
                    18246 => {  // Rating (Windows XP)
                        if !values.is_empty() {
                            exif_info.rating = Some(values[0] as u8);
                        }
                    }
                    18249 => {  // RatingPercent (Windows XP)
                        if !values.is_empty() && exif_info.rating.is_none() {
                            // パーセントから5段階に変換
                            let rating = match values[0] {
                                0 => 0,
                                1..=20 => 1,
                                21..=40 => 2,
                                41..=60 => 3,
                                61..=80 => 4,
                                81..=100 => 5,
                                _ => 0,
                            };
                            exif_info.rating = Some(rating);
                        }
                    }
                    _ => {}
                }
            }
            ExifTag::UnknownINT8U(values, tag_id, _) => {
                if *tag_id == 18246 && !values.is_empty() {
                    exif_info.rating = Some(values[0]);
                }
            }
            ExifTag::UnknownINT32U(values, tag_id, _) => {
                if *tag_id == 18246 && !values.is_empty() {
                    exif_info.rating = Some(values[0] as u8);
                }
            }
            _ => {}
        }
    }

    // 何らかのExif情報が取得できた場合のみ返す
    if exif_info.date_time_original.is_some() 
        || exif_info.create_date.is_some()
        || exif_info.modify_date.is_some()
        || exif_info.rating.is_some() {
        Some(exif_info)
    } else {
        None
    }
}

/// 画像のレーティングをEXIFに書き込み（Tauri API）
#[tauri::command]
pub fn write_exif_image_rating(path: String, rating: u32) -> Result<(), String> {
    if 5 < rating {
        return Err("レーティングは0-5の範囲で指定してください".to_string());
    }

    let image_path = Path::new(&path);

    // パニックを防ぐためのエラーハンドリング
    let mut metadata = match std::panic::catch_unwind(|| Metadata::new_from_path(&image_path)) {
        Ok(Ok(metadata)) => metadata,
        Ok(Err(e)) => return Err(format!("メタデータ読み込みエラー: {}", e)),
        Err(_) => return Err(
            "メタデータ読み込み中にパニックが発生しました（ファイル形式の互換性の問題の可能性）"
                .to_string(),
        ),
    };

    // Rating tag (18246)
    metadata.set_tag(ExifTag::UnknownINT16U(
        vec![rating as u16],
        18246,
        ExifTagGroup::GENERIC,
    ));

    // RatingPercent tag (18249)
    let percent = match rating {
        0 => 0,
        1 => 1,
        2 => 25,
        3 => 50,
        4 => 75,
        5 => 99,
        _ => unreachable!(),
    };

    metadata.set_tag(ExifTag::UnknownINT16U(
        vec![percent],
        18249,
        ExifTagGroup::GENERIC,
    ));

    metadata
        .write_to_file(&image_path)
        .map_err(|e| format!("書き込みエラー: {}", e))?;

    Ok(())
}