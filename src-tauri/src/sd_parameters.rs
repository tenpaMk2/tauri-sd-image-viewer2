use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};

// 正規表現を一度だけコンパイル（起動時エラーで早期発見）
static TAG_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"\(([^:]+):([0-9]+(?:\.[0-9]+)?)\)").expect("Invalid regex pattern for SD tags")
});

static FIELD_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(Steps|Sampler|Schedule type|CFG scale|Seed|Size|Model|Denoising strength|Clip skip):\s*([^,]+)")
        .expect("Invalid regex pattern for SD fields")
});

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SdTag {
    pub name: String,
    pub weight: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SdParameters {
    pub positive_sd_tags: Vec<SdTag>,
    pub negative_sd_tags: Vec<SdTag>,
    pub steps: Option<String>,
    pub sampler: Option<String>,
    pub schedule_type: Option<String>,
    pub cfg_scale: Option<String>,
    pub seed: Option<String>,
    pub size: Option<String>,
    pub model: Option<String>,
    pub denoising_strength: Option<String>,
    pub clip_skip: Option<String>,
    pub raw: String,
}

impl SdParameters {
    /// SDタグ文字列をパースする
    fn parse_sd_tags(s: &str) -> Vec<SdTag> {
        s.split(',')
            .map(|piece| piece.trim())
            .filter_map(|raw_tag| {
                if raw_tag.is_empty() {
                    return None; // 空文字列はスキップ
                }

                // 正規表現マッチング（安全）
                if let Some(caps) = TAG_REGEX.captures(raw_tag) {
                    // キャプチャグループの安全な取得
                    let name = caps.get(1)?.as_str().trim();
                    let weight_str = caps.get(2)?.as_str().trim();

                    if name.is_empty() {
                        return None; // 空のタグ名はスキップ
                    }

                    let weight = weight_str.parse::<f32>().ok();

                    Some(SdTag {
                        name: name.to_string(),
                        weight,
                    })
                } else {
                    // 通常タグ
                    Some(SdTag {
                        name: raw_tag.to_string(),
                        weight: None,
                    })
                }
            })
            .collect()
    }

    /// 全フィールドの値を一括抽出
    fn extract_all_fields(
        text: &str,
    ) -> (
        Option<String>, // steps
        Option<String>, // sampler
        Option<String>, // schedule_type
        Option<String>, // cfg_scale
        Option<String>, // seed
        Option<String>, // size
        Option<String>, // model
        Option<String>, // denoising_strength
        Option<String>, // clip_skip
    ) {
        let mut steps = None;
        let mut sampler = None;
        let mut schedule_type = None;
        let mut cfg_scale = None;
        let mut seed = None;
        let mut size = None;
        let mut model = None;
        let mut denoising_strength = None;
        let mut clip_skip = None;

        // 1回のスキャンで全フィールドを取得
        for cap in FIELD_REGEX.captures_iter(text) {
            if let (Some(key_match), Some(value_match)) = (cap.get(1), cap.get(2)) {
                let key = key_match.as_str();
                let value = value_match.as_str().trim();

                if value.is_empty() {
                    continue;
                }

                match key {
                    "Steps" => steps = Some(value.to_string()),
                    "Sampler" => sampler = Some(value.to_string()),
                    "Schedule type" => schedule_type = Some(value.to_string()),
                    "CFG scale" => cfg_scale = Some(value.to_string()),
                    "Seed" => seed = Some(value.to_string()),
                    "Size" => size = Some(value.to_string()),
                    "Model" => model = Some(value.to_string()),
                    "Denoising strength" => denoising_strength = Some(value.to_string()),
                    "Clip skip" => clip_skip = Some(value.to_string()),
                    _ => {}
                }
            }
        }

        (
            steps,
            sampler,
            schedule_type,
            cfg_scale,
            seed,
            size,
            model,
            denoising_strength,
            clip_skip,
        )
    }

    /// SD Parameters文字列をパースする
    pub fn parse(parameter: &str) -> Result<SdParameters, String> {
        if parameter.trim().is_empty() {
            return Err("Empty parameter string".to_string());
        }

        // "Negative prompt:" で分割
        let pp_separated: Vec<&str> = parameter.splitn(2, "\nNegative prompt:").collect();
        if pp_separated.len() != 2 {
            return Err("\"Negative prompt:\" section not found".to_string());
        }

        // "Steps:" で分割
        let np_separated: Vec<&str> = pp_separated[1].splitn(2, "\nSteps:").collect();
        if np_separated.len() != 2 {
            return Err("\"Steps:\" section not found".to_string());
        }

        let positive_sd_tags = Self::parse_sd_tags(pp_separated[0]);
        let negative_sd_tags = Self::parse_sd_tags(np_separated[0]);

        // フィールド部分から必要な値を一括抽出
        let fields_section = &format!("Steps:{}", np_separated[1]);
        let (
            steps,
            sampler,
            schedule_type,
            cfg_scale,
            seed,
            size,
            model,
            denoising_strength,
            clip_skip,
        ) = Self::extract_all_fields(fields_section);

        Ok(SdParameters {
            positive_sd_tags,
            negative_sd_tags,
            steps,
            sampler,
            schedule_type,
            cfg_scale,
            seed,
            size,
            model,
            denoising_strength,
            clip_skip,
            raw: parameter.to_string(),
        })
    }
}