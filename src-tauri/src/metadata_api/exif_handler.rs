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
    /// Extract EXIF information from byte array
    pub fn from_bytes(data: &[u8], file_extension: &str) -> Option<Self> {
        let file_ext = determine_file_extension(file_extension);
        read_exif_from_bytes(data, file_ext)
    }
}

/// Determine file extension for EXIF processing
pub fn determine_file_extension(extension: &str) -> FileExtension {
    let ext = extension.to_lowercase();
    match ext.as_str() {
        "jpg" | "jpeg" => FileExtension::JPEG,
        "png" => FileExtension::PNG {
            as_zTXt_chunk: false,
        },
        "webp" => FileExtension::WEBP,
        _ => FileExtension::JPEG, // Default for unsupported formats
    }
}

/// Read EXIF information from byte data
pub fn read_exif_from_bytes(data: &[u8], file_extension: FileExtension) -> Option<ExifInfo> {
    // Handle WebP format errors with panic catching
    match std::panic::catch_unwind(|| Metadata::new_from_vec(&data.to_vec(), file_extension)) {
        Ok(Ok(metadata)) => extract_exif_info_from_metadata(&metadata),
        Ok(Err(_)) => None,
        Err(_) => None,
    }
}

/// Extract information from Metadata object
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
                        // DateTimeDigitized (CreateDate equivalent)
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
                // Rating related tags
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
                            // Convert percent to 5-scale rating
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

    // Return only if some EXIF information was found
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

/// Write rating to EXIF metadata
pub fn write_exif_rating(path: &str, rating: u32) -> Result<(), String> {
    if rating > 5 {
        return Err("Rating must be in the range 0-5".to_string());
    }

    let image_path = Path::new(path);

    // Handle potential panics with error handling
    let mut metadata = match std::panic::catch_unwind(|| Metadata::new_from_path(image_path)) {
        Ok(Ok(metadata)) => metadata,
        Ok(Err(e)) => return Err(format!("Metadata loading error: {}", e)),
        Err(_) => return Err("Panic occurred during metadata loading (possible file format compatibility issue)".to_string()),
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
        .write_to_file(image_path)
        .map_err(|e| format!("EXIF write error: {}", e))?;

    Ok(())
}