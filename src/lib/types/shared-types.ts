// ==========================================
// Rust側との型定義同期専用ファイル
// 
// 🚨 重要: このファイルの型はRust側の構造体と完全一致させること
// 変更時は必ず対応するRustファイルも同時に修正すること
// ==========================================

// ==========================================
// SD Parameters関連
// 対応ファイル: src-tauri/src/sd_parameters.rs
// ==========================================

/**
 * Stable Diffusionのタグ情報
 * 対応: `struct SdTag`
 */
export type SdTag = {
	name: string;           // Rust: String
	weight?: number;        // Rust: Option<f32>
};

/**
 * Stable Diffusionの生成パラメータ
 * 対応: `struct SdParameters`
 */
export type SdParameters = {
	positive_sd_tags: SdTag[];      // Rust: Vec<SdTag>
	negative_sd_tags: SdTag[];      // Rust: Vec<SdTag>
	steps?: string;                 // Rust: Option<String>
	sampler?: string;               // Rust: Option<String>
	schedule_type?: string;         // Rust: Option<String>
	cfg_scale?: string;             // Rust: Option<String>
	seed?: string;                  // Rust: Option<String>
	size?: string;                  // Rust: Option<String>
	model?: string;                 // Rust: Option<String>
	denoising_strength?: string;    // Rust: Option<String>
	clip_skip?: string;             // Rust: Option<String>
	raw: string;                    // Rust: String
};

// ==========================================
// PNG画像情報
// 対応ファイル: src-tauri/src/png_handler.rs
// ==========================================

/**
 * PNG画像の基本情報とSD情報
 * 対応: `struct PngImageInfo`
 */
export type PngImageInfo = {
	width: number;                  // Rust: u32
	height: number;                 // Rust: u32
	bit_depth: number;              // Rust: u8
	color_type: string;             // Rust: String (formatted from enum)
	sd_parameters?: SdParameters;   // Rust: Option<SdParameters>
};

// ==========================================
// 統合画像情報（1回のIO操作で取得）
// 対応ファイル: src-tauri/src/image_info.rs
// ==========================================

/**
 * 1回のIO操作で取得する包括的な画像情報
 * 対応: `struct ComprehensiveImageInfo`
 */
export type ComprehensiveImageInfo = {
	width: number;                  // Rust: u32
	height: number;                 // Rust: u32
	file_size: number;              // Rust: u64
	mime_type: string;              // Rust: String
	sd_parameters?: SdParameters;   // Rust: Option<SdParameters>
	image_data: number[];           // Rust: Vec<u8>
};

// ==========================================
// Rust型とTypeScript型の対応表（参考）
// ==========================================
// Rust型          | TypeScript型    | 注意点
// String          | string         | -
// Option<T>       | T | undefined  | nullではなくundefined
// Vec<T>          | T[]            | -
// u32, u64        | number         | JS数値精度に注意
// f32, f64        | number         | -
// bool            | boolean        | -
// Vec<u8>         | number[]       | バイト配列
// ==========================================