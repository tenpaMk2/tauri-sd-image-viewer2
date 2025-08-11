/// Extract existing XMP metadata from file
pub fn extract_existing_xmp(file_data: &[u8], file_extension: &str) -> Option<String> {
    match file_extension {
        "jpg" | "jpeg" => extract_xmp_from_jpeg(file_data),
        "png" => extract_xmp_from_png(file_data),
        _ => None,
    }
}

/// Extract XMP metadata from JPEG file
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
            // APP1 segment
            let length = u16::from_be_bytes([file_data[pos + 2], file_data[pos + 3]]) as usize;
            let segment_end = pos + 2 + length;

            if segment_end <= file_data.len() {
                let segment_data = &file_data[pos + 4..segment_end];

                // Check XMP identifier
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
            // Skip other segments
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

/// Extract XMP metadata from PNG file
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

            // Extract XMP data from iTXt chunk
            if let Some(xmp_data) = parse_itxt_xmp_chunk(chunk_data) {
                return Some(xmp_data);
            }
        }

        pos += 8 + chunk_length + 4; // length + type + data + CRC
    }
    None
}

/// Extract XMP data from iTXt chunk
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

    // Skip language tag (null terminated string)
    while pos < chunk_data.len() && chunk_data[pos] != 0 {
        pos += 1;
    }
    if pos >= chunk_data.len() {
        return None;
    }
    pos += 1; // language separator

    // Remaining data is XMP
    let xmp_data = &chunk_data[pos..];
    String::from_utf8(xmp_data.to_vec()).ok()
}

/// Merge rating into existing or new XMP
pub fn merge_rating_to_xmp(existing_xmp: Option<String>, rating: u32) -> String {
    match existing_xmp {
        Some(xmp_content) => {
            // Update or add rating in existing XMP
            update_rating_in_xmp(&xmp_content, rating)
        }
        None => {
            // Calculate Rating Percent (same logic as EXIF)
            let percent = match rating {
                0 => 0,
                1 => 1,
                2 => 25,
                3 => 50,
                4 => 75,
                5 => 99,
                _ => 0,
            };

            // Generate new XMP with Rating + RatingPercent
            create_xmp_with_rating(rating, percent)
        }
    }
}

/// Generate XMP string with Rating + RatingPercent
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

/// Update Rating + RatingPercent in existing XMP string
fn update_rating_in_xmp(xmp_content: &str, rating: u32) -> String {
    // Calculate Rating Percent
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

    // Update or add Rating
    if rating_re.is_match(&updated_content) {
        updated_content = rating_re
            .replace(&updated_content, new_rating.as_str())
            .to_string();
    } else {
        // Add Rating property to rdf:Description element
        if let Some(desc_end) = updated_content.find(">") {
            if updated_content[..desc_end].contains("rdf:Description") {
                let before = &updated_content[..desc_end];
                let after = &updated_content[desc_end..];
                updated_content = format!("{} {}{}", before, new_rating, after);
            } else {
                // Fallback: create new XMP
                return create_xmp_with_rating(rating, percent);
            }
        } else {
            // Fallback: create new XMP
            return create_xmp_with_rating(rating, percent);
        }
    }

    // Update or add RatingPercent
    if percent_re.is_match(&updated_content) {
        updated_content = percent_re
            .replace(&updated_content, new_rating_percent.as_str())
            .to_string();
    } else {
        // Add RatingPercent property to rdf:Description element
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

/// Embed XMP in JPEG vec (returns modified vec)
fn embed_xmp_in_jpeg_vec(file_data: &[u8], xmp_data: &str) -> Result<Vec<u8>, String> {
    // Insert XMP as APP1 segment in JPEG file
    let mut output = Vec::new();

    // SOI (Start of Image) marker
    if file_data.len() < 2 || file_data[0..2] != [0xFF, 0xD8] {
        return Err("Invalid JPEG file".to_string());
    }

    // Copy SOI
    output.extend_from_slice(&file_data[0..2]);

    // Add XMP APP1 segment
    output.extend_from_slice(&[0xFF, 0xE1]); // APP1 marker

    let xmp_segment = format!("http://ns.adobe.com/xap/1.0/\0{}", xmp_data);
    let segment_length = (xmp_segment.len() + 2) as u16;
    output.extend_from_slice(&segment_length.to_be_bytes());
    output.extend_from_slice(xmp_segment.as_bytes());

    // Add remaining JPEG data (after SOI)
    output.extend_from_slice(&file_data[2..]);

    Ok(output)
}

/// Embed XMP in PNG vec (returns modified vec)
fn embed_xmp_in_png_vec(file_data: &[u8], xmp_data: &str) -> Result<Vec<u8>, String> {
    use png::{Decoder, Encoder};
    use std::io::Cursor;

    // 1. Read existing PNG
    let cursor = Cursor::new(file_data);
    let decoder = Decoder::new(cursor);
    let mut reader = decoder
        .read_info()
        .map_err(|e| format!("PNG read error: {}", e))?;

    // Get image information
    let info = reader.info().clone();
    let width = info.width;
    let height = info.height;
    let color_type = info.color_type;
    let bit_depth = info.bit_depth;

    // Read image data
    let mut buf = vec![0; reader.output_buffer_size()];
    reader
        .next_frame(&mut buf)
        .map_err(|e| format!("Image data read error: {}", e))?;

    // Preserve existing text metadata
    let existing_text_chunks = info.uncompressed_latin1_text.clone();
    let existing_compressed_latin1_text = info.compressed_latin1_text.clone();
    let existing_utf8_text = info.utf8_text.clone();

    // 2. Write new PNG to vec
    let mut output = Vec::new();
    let mut encoder = Encoder::new(&mut output, width, height);
    encoder.set_color(color_type);
    encoder.set_depth(bit_depth);

    // Add existing tEXt chunks (SD parameters etc.)
    for text_chunk in &existing_text_chunks {
        encoder
            .add_text_chunk(text_chunk.keyword.clone(), text_chunk.text.clone())
            .map_err(|e| format!("tEXt addition error: {}", e))?;
    }

    // Add existing zTXt chunks
    for compressed_chunk in &existing_compressed_latin1_text {
        encoder
            .add_ztxt_chunk(
                compressed_chunk.keyword.clone(),
                compressed_chunk
                    .get_text()
                    .map_err(|e| format!("zTXt expansion error: {}", e))?,
            )
            .map_err(|e| format!("zTXt addition error: {}", e))?;
    }

    // Add existing iTXt chunks (except XMP)
    for utf8_chunk in &existing_utf8_text {
        if utf8_chunk.keyword != "XML:com.adobe.xmp" {
            encoder
                .add_itxt_chunk(
                    utf8_chunk.keyword.clone(),
                    utf8_chunk
                        .get_text()
                        .map_err(|e| format!("iTXt expansion error: {}", e))?,
                )
                .map_err(|e| format!("iTXt addition error: {}", e))?;
        }
    }

    // Add new XMP iTXt chunk
    encoder
        .add_itxt_chunk("XML:com.adobe.xmp".to_string(), xmp_data.to_string())
        .map_err(|e| format!("XMP iTXt addition error: {}", e))?;

    // Write image data
    let mut writer = encoder
        .write_header()
        .map_err(|e| format!("PNG header write error: {}", e))?;
    writer
        .write_image_data(&buf)
        .map_err(|e| format!("Image data write error: {}", e))?;
    writer
        .finish()
        .map_err(|e| format!("PNG write completion error: {}", e))?;

    Ok(output)
}

/// Write XMP Rating to vec (optimized version for pipeline)
pub fn embed_xmp_rating_in_vec(
    file_data: &[u8],
    file_extension: &str,
    rating: u32,
) -> Result<Vec<u8>, String> {
    // Only PNG and JPEG support XMP Rating writing
    if !matches!(file_extension, "jpg" | "jpeg" | "png") {
        return Ok(file_data.to_vec()); // Return original data for unsupported formats
    }

    // Extract existing XMP metadata
    let existing_xmp = extract_existing_xmp(file_data, file_extension);

    // Add/update Rating in existing XMP
    let xmp_data = merge_rating_to_xmp(existing_xmp, rating);

    // Embed XMP according to file format
    match file_extension {
        "jpg" | "jpeg" => embed_xmp_in_jpeg_vec(file_data, &xmp_data),
        "png" => embed_xmp_in_png_vec(file_data, &xmp_data),
        _ => Ok(file_data.to_vec()),
    }
}
