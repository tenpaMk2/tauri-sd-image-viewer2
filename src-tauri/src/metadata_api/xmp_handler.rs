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
    // Use chunk-level manipulation to preserve all existing chunks including EXIF zTXt chunks
    embed_xmp_in_png_chunks(file_data, xmp_data)
}

/// Embed XMP data in PNG using chunk-level manipulation (preserves EXIF zTXt chunks)
fn embed_xmp_in_png_chunks(file_data: &[u8], xmp_data: &str) -> Result<Vec<u8>, String> {
    const ITXT_CHUNK_TYPE: &[u8] = b"iTXt";
    const IEND_CHUNK_TYPE: &[u8] = b"IEND";

    // Parse PNG chunks
    let mut chunks = parse_png_chunks_for_xmp(file_data)?;
    
    // Create iTXt chunk data for XMP
    let itxt_chunk_data = create_itxt_xmp_chunk(xmp_data)?;
    
    // Find existing XMP iTXt chunk or create new one
    let mut found_xmp_chunk = false;
    for chunk in &mut chunks {
        if &chunk.chunk_type == ITXT_CHUNK_TYPE && is_xmp_itxt_chunk(&chunk.data) {
            println!("♻️ Updating existing XMP iTXt chunk");
            chunk.data = itxt_chunk_data.clone();
            chunk.length = chunk.data.len() as u32;
            chunk.crc = calculate_crc_for_xmp(&chunk.chunk_type, &chunk.data);
            found_xmp_chunk = true;
            break;
        }
    }
    
    if !found_xmp_chunk {
        println!("➕ Creating new XMP iTXt chunk");
        // Create new iTXt chunk
        let mut chunk_type_array = [0u8; 4];
        chunk_type_array.copy_from_slice(ITXT_CHUNK_TYPE);
        let new_chunk = PngChunkXmp {
            length: itxt_chunk_data.len() as u32,
            chunk_type: chunk_type_array,
            data: itxt_chunk_data,
            crc: 0, // Will be calculated when rebuilding
        };
        
        // Insert before IEND chunk
        let iend_index = chunks.iter().position(|chunk| &chunk.chunk_type == IEND_CHUNK_TYPE)
            .ok_or("IEND chunk not found")?;
        chunks.insert(iend_index, new_chunk);
        
        // Recalculate CRC for new chunk
        let inserted_index = iend_index;
        chunks[inserted_index].crc = calculate_crc_for_xmp(&chunks[inserted_index].chunk_type, &chunks[inserted_index].data);
        println!("✅ New XMP iTXt chunk created and inserted");
    }
    
    rebuild_png_from_chunks_for_xmp(&chunks)
}

#[derive(Debug)]
struct PngChunkXmp {
    pub length: u32,
    pub chunk_type: [u8; 4],
    pub data: Vec<u8>,
    pub crc: u32,
}

/// Parse PNG chunks from file data (XMP version)
fn parse_png_chunks_for_xmp(data: &[u8]) -> Result<Vec<PngChunkXmp>, String> {
    use std::io::{Cursor, Read, Seek, SeekFrom};
    
    const PNG_SIGNATURE: &[u8] = b"\x89PNG\r\n\x1a\n";
    const IEND_CHUNK_TYPE: &[u8] = b"IEND";
    
    if data.len() < 8 || &data[0..8] != PNG_SIGNATURE {
        return Err("Invalid PNG signature".to_string());
    }
    
    let mut chunks = Vec::new();
    let mut cursor = Cursor::new(data);
    cursor.seek(SeekFrom::Start(8)).map_err(|e| format!("Seek error: {}", e))?; // Skip PNG signature
    
    loop {
        // Read chunk header
        let mut length_bytes = [0u8; 4];
        if cursor.read_exact(&mut length_bytes).is_err() {
            break; // End of file
        }
        let length = u32::from_be_bytes(length_bytes);
        
        let mut type_bytes = [0u8; 4];
        cursor.read_exact(&mut type_bytes).map_err(|e| format!("Chunk type read error: {}", e))?;
        
        // Read chunk data
        let mut chunk_data = vec![0u8; length as usize];
        cursor.read_exact(&mut chunk_data).map_err(|e| format!("Chunk data read error: {}", e))?;
        
        // Read CRC
        let mut crc_bytes = [0u8; 4];
        cursor.read_exact(&mut crc_bytes).map_err(|e| format!("CRC read error: {}", e))?;
        let crc = u32::from_be_bytes(crc_bytes);

        chunks.push(PngChunkXmp {
            length,
            chunk_type: type_bytes,
            data: chunk_data,
            crc,
        });
        
        // Stop at IEND chunk
        if &type_bytes == IEND_CHUNK_TYPE {
            break;
        }
    }
    
    Ok(chunks)
}

/// Check if iTXt chunk contains XMP metadata
fn is_xmp_itxt_chunk(chunk_data: &[u8]) -> bool {
    if let Some(null_pos) = chunk_data.iter().position(|&b| b == 0) {
        if let Ok(keyword) = std::str::from_utf8(&chunk_data[0..null_pos]) {
            return keyword == "XML:com.adobe.xmp";
        }
    }
    false
}

/// Create iTXt chunk data for XMP metadata
fn create_itxt_xmp_chunk(xmp_data: &str) -> Result<Vec<u8>, String> {
    let mut chunk_data = Vec::new();
    
    // Add keyword and null terminator
    chunk_data.extend_from_slice(b"XML:com.adobe.xmp");
    chunk_data.push(0);
    
    // Add compression flag (0 = uncompressed)
    chunk_data.push(0);
    
    // Add compression method (0 = zlib, but not used when uncompressed)
    chunk_data.push(0);
    
    // Add language tag (empty) and null terminator
    chunk_data.push(0);
    
    // Add translated keyword (empty) and null terminator
    chunk_data.push(0);
    
    // Add XMP data (UTF-8)
    chunk_data.extend_from_slice(xmp_data.as_bytes());
    
    Ok(chunk_data)
}

/// Calculate CRC32 for PNG chunk (XMP version)
fn calculate_crc_for_xmp(chunk_type: &[u8; 4], data: &[u8]) -> u32 {
    let mut hasher = crc32fast::Hasher::new();
    hasher.update(chunk_type);
    hasher.update(data);
    hasher.finalize()
}

/// Rebuild PNG file from chunks (XMP version)
fn rebuild_png_from_chunks_for_xmp(chunks: &[PngChunkXmp]) -> Result<Vec<u8>, String> {
    const PNG_SIGNATURE: &[u8] = b"\x89PNG\r\n\x1a\n";
    
    let mut output = Vec::new();
    
    // PNG signature
    output.extend_from_slice(PNG_SIGNATURE);
    
    // Write all chunks
    for chunk in chunks {
        output.extend_from_slice(&chunk.length.to_be_bytes());
        output.extend_from_slice(&chunk.chunk_type);
        output.extend_from_slice(&chunk.data);
        output.extend_from_slice(&chunk.crc.to_be_bytes());
    }
    
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
