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
        let file_ext = determine_file_extension(file_extension);
        read_exif_from_bytes(data, file_ext)
    }
}

/// ファイル拡張子を判定
///
/// 対応形式:
/// - PNG: フル機能（EXIF、XMP Rating書き込み、SD Parameters）
/// - JPEG: 限定機能（EXIF、XMP Rating書き込み）
/// - WebP: 基本機能（EXIF読み取りのみ）
pub fn determine_file_extension(extension: &str) -> FileExtension {
    let ext = extension.to_lowercase();
    match ext.as_str() {
        "jpg" | "jpeg" => FileExtension::JPEG,
        "png" => FileExtension::PNG {
            as_zTXt_chunk: false,
        },
        "webp" => FileExtension::WEBP,
        _ => FileExtension::JPEG, // デフォルト（未対応形式）
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
                    36867 => {
                        // DateTimeOriginal
                        exif_info.date_time_original = Some(value.clone());
                    }
                    306 => {
                        // DateTime
                        if exif_info.date_time_original.is_none() {
                            exif_info.date_time_original = Some(value.clone());
                        }
                    }
                    36868 => {
                        // DateTimeDigitized (CreateDate相当)
                        exif_info.create_date = Some(value.clone());
                    }
                    18246 => {
                        // Rating (Windows XP)
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
                    18246 => {
                        // Rating (Windows XP)
                        if !values.is_empty() {
                            exif_info.rating = Some(values[0] as u8);
                        }
                    }
                    18249 => {
                        // RatingPercent (Windows XP)
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
        || exif_info.rating.is_some()
    {
        Some(exif_info)
    } else {
        None
    }
}

/// 既存のXMPメタデータを読み取り
fn extract_existing_xmp(file_data: &[u8], file_extension: &str) -> Option<String> {
    match file_extension {
        "jpg" | "jpeg" => extract_xmp_from_jpeg(file_data),
        "png" => extract_xmp_from_png(file_data),
        _ => None,
    }
}

/// JPEGファイルから既存XMPメタデータを抽出
fn extract_xmp_from_jpeg(file_data: &[u8]) -> Option<String> {
    if file_data.len() < 4 || &file_data[0..2] != &[0xFF, 0xD8] {
        return None;
    }

    let mut pos = 2;
    while pos + 4 < file_data.len() {
        if file_data[pos] != 0xFF {
            break;
        }

        let marker = file_data[pos + 1];
        if marker == 0xE1 {
            // APP1セグメント
            let length = u16::from_be_bytes([file_data[pos + 2], file_data[pos + 3]]) as usize;
            let segment_end = pos + 2 + length;

            if segment_end <= file_data.len() {
                let segment_data = &file_data[pos + 4..segment_end];

                // XMP識別子をチェック
                let xmp_identifier = b"http://ns.adobe.com/xap/1.0/\0";
                if segment_data.len() > xmp_identifier.len()
                    && &segment_data[0..xmp_identifier.len()] == xmp_identifier
                {
                    let xmp_data = &segment_data[xmp_identifier.len()..];
                    return String::from_utf8(xmp_data.to_vec()).ok();
                }
            }
            pos = segment_end;
        } else {
            // 他のセグメントをスキップ
            if pos + 4 < file_data.len() {
                let length = u16::from_be_bytes([file_data[pos + 2], file_data[pos + 3]]) as usize;
                pos += 2 + length;
            } else {
                break;
            }
        }
    }
    None
}

/// PNGファイルから既存XMPメタデータを抽出
fn extract_xmp_from_png(file_data: &[u8]) -> Option<String> {
    if file_data.len() < 8 || &file_data[0..8] != b"\x89PNG\r\n\x1a\n" {
        return None;
    }

    let mut pos = 8;
    while pos + 8 < file_data.len() {
        let chunk_length = u32::from_be_bytes([
            file_data[pos],
            file_data[pos + 1],
            file_data[pos + 2],
            file_data[pos + 3],
        ]) as usize;

        let chunk_type = &file_data[pos + 4..pos + 8];

        if chunk_type == b"iTXt" {
            let chunk_data = &file_data[pos + 8..pos + 8 + chunk_length];

            // iTXtチャンクからXMPデータを抽出
            if let Some(xmp_data) = parse_itxt_xmp_chunk(chunk_data) {
                return Some(xmp_data);
            }
        }

        pos += 8 + chunk_length + 4; // length + type + data + CRC
    }
    None
}

/// iTXtチャンクからXMPデータを抽出
fn parse_itxt_xmp_chunk(chunk_data: &[u8]) -> Option<String> {
    let keyword = b"XML:com.adobe.xmp";

    if chunk_data.len() < keyword.len() || &chunk_data[0..keyword.len()] != keyword {
        return None;
    }

    // keyword + null + compression + compression_method + language + null -> XMP data
    let mut pos = keyword.len();
    if pos >= chunk_data.len() || chunk_data[pos] != 0 {
        return None;
    }
    pos += 1; // keyword separator

    if pos >= chunk_data.len() {
        return None;
    }
    pos += 1; // compression flag

    if pos >= chunk_data.len() {
        return None;
    }
    pos += 1; // compression method

    // language tagをスキップ（null terminatedstring）
    while pos < chunk_data.len() && chunk_data[pos] != 0 {
        pos += 1;
    }
    if pos >= chunk_data.len() {
        return None;
    }
    pos += 1; // language separator

    // 残りがXMPデータ
    let xmp_data = &chunk_data[pos..];
    String::from_utf8(xmp_data.to_vec()).ok()
}

/// 既存XMPにRatingを追加/更新
fn merge_rating_to_xmp(existing_xmp: Option<String>, rating: u32) -> String {
    match existing_xmp {
        Some(xmp_content) => {
            // 既存XMP内のratingを更新または追加
            update_rating_in_xmp(&xmp_content, rating)
        }
        None => {
            // Rating Percentを計算（Exifと同じロジック）
            let percent = match rating {
                0 => 0,
                1 => 1,
                2 => 25,
                3 => 50,
                4 => 75,
                5 => 99,
                _ => 0,
            };

            // 新しいXMPを直接生成（Rating + RatingPercent）
            create_xmp_with_rating(rating, percent)
        }
    }
}

/// Rating + RatingPercentを含むXMP文字列を生成
fn create_xmp_with_rating(rating: u32, percent: u32) -> String {
    format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="XMP Core 6.0.0">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmp:Rating="{}"
    xmp:RatingPercent="{}"/>
 </rdf:RDF>
</x:xmpmeta>"#,
        rating, percent
    )
}

/// 既存XMP文字列内のRating + RatingPercentを更新
fn update_rating_in_xmp(xmp_content: &str, rating: u32) -> String {
    // Rating Percentを計算
    let percent = match rating {
        0 => 0,
        1 => 1,
        2 => 25,
        3 => 50,
        4 => 75,
        5 => 99,
        _ => 0,
    };

    let rating_pattern = r#"xmp:Rating="[^"]*""#;
    let rating_percent_pattern = r#"xmp:RatingPercent="[^"]*""#;
    let new_rating = format!(r#"xmp:Rating="{}""#, rating);
    let new_rating_percent = format!(r#"xmp:RatingPercent="{}""#, percent);

    let rating_re = regex::Regex::new(rating_pattern).unwrap();
    let percent_re = regex::Regex::new(rating_percent_pattern).unwrap();

    let mut updated_content = xmp_content.to_string();

    // Ratingを更新または追加
    if rating_re.is_match(&updated_content) {
        updated_content = rating_re
            .replace(&updated_content, new_rating.as_str())
            .to_string();
    } else {
        // Ratingプロパティが存在しない場合、rdf:Description要素に追加
        if let Some(desc_end) = updated_content.find(">") {
            if updated_content[..desc_end].contains("rdf:Description") {
                let before = &updated_content[..desc_end];
                let after = &updated_content[desc_end..];
                updated_content = format!("{} {}{}", before, new_rating, after);
            } else {
                // フォールバック: 新しいXMPを作成
                return create_xmp_with_rating(rating, percent);
            }
        } else {
            // フォールバック: 新しいXMPを作成
            return create_xmp_with_rating(rating, percent);
        }
    }

    // RatingPercentを更新または追加
    if percent_re.is_match(&updated_content) {
        updated_content = percent_re
            .replace(&updated_content, new_rating_percent.as_str())
            .to_string();
    } else {
        // RatingPercentプロパティが存在しない場合、rdf:Description要素に追加
        if let Some(desc_end) = updated_content.find(">") {
            if updated_content[..desc_end].contains("rdf:Description") {
                let before = &updated_content[..desc_end];
                let after = &updated_content[desc_end..];
                updated_content = format!("{} {}{}", before, new_rating_percent, after);
            }
        }
    }

    updated_content
}

/// XMPメタデータにRatingを書き込み
///
/// 対応形式: PNG（フル機能）、JPEG（限定機能）
/// WebPはXMP対応が困難なため除外
fn write_xmp_rating_to_file(path: &Path, rating: u32) -> Result<(), String> {
    // ファイル拡張子を取得
    let extension = path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_lowercase();

    // PNGとJPEGのみXMP Rating書き込み対応
    if !matches!(extension.as_str(), "jpg" | "jpeg" | "png") {
        return Ok(()); // WebPなど非対応形式の場合は無視
    }

    // 既存ファイルを読み込み
    let file_data = std::fs::read(path).map_err(|e| format!("ファイル読み込みエラー: {}", e))?;

    // 既存XMPメタデータを抽出
    let existing_xmp = extract_existing_xmp(&file_data, &extension);

    // 既存XMPにRatingを追加/更新
    let xmp_data = merge_rating_to_xmp(existing_xmp, rating);

    // ファイル形式に応じてXMPを埋め込み
    match extension.as_str() {
        "jpg" | "jpeg" => write_xmp_to_jpeg(path, &file_data, &xmp_data),
        "png" => write_xmp_to_png(path, &file_data, &xmp_data),
        _ => Ok(()),
    }
}

/// JPEGファイルにXMPを埋め込み
fn write_xmp_to_jpeg(path: &Path, file_data: &[u8], xmp_data: &str) -> Result<(), String> {
    // JPEGファイルの場合、APP1セグメントとしてXMPを挿入
    let mut output = Vec::new();

    // SOI (Start of Image) マーカー
    if file_data.len() < 2 || file_data[0..2] != [0xFF, 0xD8] {
        return Err("無効なJPEGファイル".to_string());
    }

    // SOIをコピー
    output.extend_from_slice(&file_data[0..2]);

    // XMP APP1セグメントを追加
    output.extend_from_slice(&[0xFF, 0xE1]); // APP1マーカー

    let xmp_segment = format!("http://ns.adobe.com/xap/1.0/\0{}", xmp_data);
    let segment_length = (xmp_segment.len() + 2) as u16;
    output.extend_from_slice(&segment_length.to_be_bytes());
    output.extend_from_slice(xmp_segment.as_bytes());

    // 残りのJPEGデータを追加（SOIの後から）
    output.extend_from_slice(&file_data[2..]);

    // ファイルに書き戻し
    std::fs::write(path, output).map_err(|e| format!("JPEG XMP書き込みエラー: {}", e))
}

/// PNGファイルにXMPを埋め込み（pngクレート使用、安全版）
fn write_xmp_to_png(path: &Path, file_data: &[u8], xmp_data: &str) -> Result<(), String> {
    use png::{Decoder, Encoder};
    use std::io::Cursor;

    // 1. 既存PNGを読み込み
    let cursor = Cursor::new(file_data);
    let decoder = Decoder::new(cursor);
    let mut reader = decoder
        .read_info()
        .map_err(|e| format!("PNG読み込みエラー: {}", e))?;

    // 画像情報を取得
    let info = reader.info().clone();
    let width = info.width;
    let height = info.height;
    let color_type = info.color_type;
    let bit_depth = info.bit_depth;

    // 画像データを読み込み
    let mut buf = vec![0; reader.output_buffer_size()];
    reader
        .next_frame(&mut buf)
        .map_err(|e| format!("画像データ読み込みエラー: {}", e))?;

    // 既存のテキストメタデータを保持
    let existing_text_chunks = info.uncompressed_latin1_text.clone();
    let existing_compressed_latin1_text = info.compressed_latin1_text.clone();
    let existing_utf8_text = info.utf8_text.clone();

    // 2. 新しいPNGファイルを書き込み
    let output_file =
        std::fs::File::create(path).map_err(|e| format!("ファイル作成エラー: {}", e))?;
    let ref mut w = std::io::BufWriter::new(output_file);

    let mut encoder = Encoder::new(w, width, height);
    encoder.set_color(color_type);
    encoder.set_depth(bit_depth);

    // 既存のtEXtチャンクを追加（SDパラメータ等）
    for text_chunk in &existing_text_chunks {
        encoder
            .add_text_chunk(text_chunk.keyword.clone(), text_chunk.text.clone())
            .map_err(|e| format!("tEXt追加エラー: {}", e))?;
    }

    // 既存のzTXtチャンクを追加
    for compressed_chunk in &existing_compressed_latin1_text {
        encoder
            .add_ztxt_chunk(
                compressed_chunk.keyword.clone(),
                compressed_chunk
                    .get_text()
                    .map_err(|e| format!("zTXt展開エラー: {}", e))?,
            )
            .map_err(|e| format!("zTXt追加エラー: {}", e))?;
    }

    // 既存のiTXtチャンクを追加（XMP以外）
    for utf8_chunk in &existing_utf8_text {
        if utf8_chunk.keyword != "XML:com.adobe.xmp" {
            encoder
                .add_itxt_chunk(
                    utf8_chunk.keyword.clone(),
                    utf8_chunk
                        .get_text()
                        .map_err(|e| format!("iTXt展開エラー: {}", e))?,
                )
                .map_err(|e| format!("iTXt追加エラー: {}", e))?;
        }
    }

    // 新しいXMP iTXtチャンクを追加
    encoder
        .add_itxt_chunk("XML:com.adobe.xmp".to_string(), xmp_data.to_string())
        .map_err(|e| format!("XMP iTXt追加エラー: {}", e))?;

    // 画像データを書き込み
    let mut writer = encoder
        .write_header()
        .map_err(|e| format!("PNGヘッダー書き込みエラー: {}", e))?;
    writer
        .write_image_data(&buf)
        .map_err(|e| format!("画像データ書き込みエラー: {}", e))?;
    writer
        .finish()
        .map_err(|e| format!("PNG書き込み完了エラー: {}", e))?;

    Ok(())
}

/// 画像のレーティングをEXIFに書き込み（Tauri API 非同期版）
#[tauri::command]
pub async fn write_exif_image_rating(path: String, rating: u32) -> Result<(), String> {
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
        .map_err(|e| format!("Exif書き込みエラー: {}", e))?;

    // XMPタグにもRatingを書き込み（安全版）
    if let Err(e) = write_xmp_rating_to_file(&image_path, rating) {
        // XMP書き込みに失敗してもExifは成功しているので警告レベルで記録
        eprintln!("XMP書き込み警告: {}", e);
    }

    Ok(())
}
