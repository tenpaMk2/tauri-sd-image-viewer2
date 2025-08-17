use xmp_toolkit::{OpenFileOptions, XmpFile, XmpMeta, XmpValue};

/// Extract XMP Rating directly from file using xmp-toolkit
pub fn extract_rating_from_file(file_path: &str) -> Option<u32> {
    let mut xmp_file = XmpFile::new().ok()?;

    // Open file for reading only
    if xmp_file
        .open_file(file_path, OpenFileOptions::default().for_read())
        .is_err()
    {
        return None;
    }

    // Get XMP metadata and extract rating directly
    let result = match xmp_file.xmp() {
        Some(xmp_meta) => {
            // Try to get xmp:Rating property directly
            if let Some(rating_property) =
                xmp_meta.property("http://ns.adobe.com/xap/1.0/", "Rating")
            {
                if let Ok(rating) = rating_property.value.parse::<u32>() {
                    if rating <= 5 { Some(rating) } else { None }
                } else {
                    None
                }
            } else {
                // Fallback: try RatingPercent conversion
                if let Some(percent_property) =
                    xmp_meta.property("http://ns.adobe.com/xap/1.0/", "RatingPercent")
                {
                    if let Ok(percent) = percent_property.value.parse::<u32>() {
                        let rating = match percent {
                            0 => 0,
                            1..=24 => 1,
                            25..=49 => 2,
                            50..=74 => 3,
                            75..=98 => 4,
                            99..=100 => 5,
                            _ => 0,
                        };
                        Some(rating)
                    } else {
                        None
                    }
                } else {
                    None
                }
            }
        }
        None => None,
    };

    // Close file
    xmp_file.close();

    result
}

/// Write XMP Rating to file using xmp-toolkit (unified method)
pub fn embed_xmp_rating_unified(file_path: &str, rating: u32) -> Result<(), String> {
    let mut xmp_file = XmpFile::new().map_err(|e| format!("Failed to create XmpFile: {}", e))?;

    // Open file for update
    xmp_file
        .open_file(file_path, OpenFileOptions::default().for_update())
        .map_err(|e| format!("Failed to open file for update: {}", e))?;

    // Get existing XMP or create new one
    let existing_xmp = xmp_file.xmp();

    // Create or update XMP with rating using xmp-toolkit
    let mut xmp_meta = match existing_xmp {
        Some(xmp) => xmp,
        None => XmpMeta::new().map_err(|e| format!("Failed to create new XMP: {}", e))?,
    };

    // Set xmp:Rating
    let rating_value = XmpValue::new(rating.to_string());
    xmp_meta
        .set_property("http://ns.adobe.com/xap/1.0/", "Rating", &rating_value)
        .map_err(|e| format!("Failed to set Rating: {}", e))?;

    // Set xmp:RatingPercent (compatibility)
    let percent = match rating {
        0 => 0,
        1 => 1,
        2 => 25,
        3 => 50,
        4 => 75,
        5 => 99,
        _ => 0,
    };

    let percent_value = XmpValue::new(percent.to_string());
    xmp_meta
        .set_property(
            "http://ns.adobe.com/xap/1.0/",
            "RatingPercent",
            &percent_value,
        )
        .map_err(|e| format!("Failed to set RatingPercent: {}", e))?;

    // Put updated XMP back to file
    xmp_file
        .put_xmp(&xmp_meta)
        .map_err(|e| format!("Failed to put XMP: {}", e))?;

    // Close file (this writes the changes)
    xmp_file.close();

    Ok(())
}
