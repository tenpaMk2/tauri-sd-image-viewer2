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
	name: string; // Rust: String
	weight?: number; // Rust: Option<f32>
};

/**
 * Stable Diffusionの生成パラメータ
 * 対応: `struct SdParameters`
 */
export type SdParameters = {
	positive_sd_tags: SdTag[]; // Rust: Vec<SdTag>
	negative_sd_tags: SdTag[]; // Rust: Vec<SdTag>
	steps?: string; // Rust: Option<String>
	sampler?: string; // Rust: Option<String>
	schedule_type?: string; // Rust: Option<String>
	cfg_scale?: string; // Rust: Option<String>
	seed?: string; // Rust: Option<String>
	size?: string; // Rust: Option<String>
	model?: string; // Rust: Option<String>
	denoising_strength?: string; // Rust: Option<String>
	clip_skip?: string; // Rust: Option<String>
	raw: string; // Rust: String
};

// ==========================================
// PNG画像情報
// 対応ファイル: src-tauri/src/png_handler.rs
// ==========================================


// ==========================================
// Exif情報
// 対応ファイル: src-tauri/src/exif_info.rs (予定)
// ==========================================

/**
 * Exif情報
 * 対応: `struct ExifInfo`
 */
export type ExifInfo = {
	date_time_original?: string; // Rust: Option<String>
	create_date?: string; // Rust: Option<String>
	modify_date?: string; // Rust: Option<String>
	rating?: number; // Rust: Option<u8>
};

// ==========================================
// 画像メタデータ情報（軽量版）
// 対応ファイル: src-tauri/src/image_info.rs
// ==========================================

/**
 * 画像のメタデータのみを効率的に取得
 * 対応: `struct ImageMetadataInfo`
 * 注意: 画像データは含まず、メタデータのみで軽量
 */
export type ImageMetadataInfo = {
	width: number; // Rust: u32
	height: number; // Rust: u32
	file_size: number; // Rust: u64
	mime_type: string; // Rust: String
	sd_parameters?: SdParameters; // Rust: Option<SdParameters>
	exif_info?: ExifInfo; // Rust: Option<ExifInfo>
	// image_data は除外（パフォーマンス最適化のため）
};

// ==========================================
// サムネイル関連
// 対応ファイル: src-tauri/src/types/thumbnail_types.rs
// ==========================================

/**
 * サムネイル生成設定
 * 対応: `struct ThumbnailConfig`
 */
export type ThumbnailConfig = {
	size: number; // Rust: u32
	quality: number; // Rust: u8
	format: string; // Rust: String
};

/**
 * 元画像のファイル情報
 * 対応: `struct OriginalFileInfo`
 */
export type OriginalFileInfo = {
	path: string; // Rust: String
	file_size: number; // Rust: u64
	width: number; // Rust: u32
	height: number; // Rust: u32
	modified_time: number; // Rust: u64 (UNIXタイムスタンプ)
};

/**
 * 包括的キャッシュ情報（JSONファイルで保存）
 * 対応: `struct ThumbnailCacheInfo`
 */
export type ThumbnailCacheInfo = {
	thumbnail_config: ThumbnailConfig; // Rust: ThumbnailConfig
	original_file_info: OriginalFileInfo; // Rust: OriginalFileInfo
	thumbnail_filename: string; // Rust: String
	rating?: number; // Rust: Option<u8>
	exif_info?: ExifInfo; // Rust: Option<ExifInfo>
	sd_parameters?: SdParameters; // Rust: Option<SdParameters>
	cached_at: number; // Rust: u64 (UNIXタイムスタンプ)
};

/**
 * サムネイル情報（レスポンス用）
 * 対応: `struct ThumbnailInfo`
 */
export type ThumbnailInfo = {
	data: number[]; // Rust: Vec<u8>
	width: number; // Rust: u32
	height: number; // Rust: u32
	mime_type: string; // Rust: String
	cache_path?: string; // Rust: Option<String> - キャッシュファイルのパス
};

/**
 * サムネイルパス情報（最適化版レスポンス用）
 * 対応: `struct ThumbnailPathInfo`
 */
export type ThumbnailPathInfo = {
	width: number; // Rust: u32
	height: number; // Rust: u32
	mime_type: string; // Rust: String
	cache_path: string; // Rust: String - キャッシュファイルのパス
};

/**
 * バッチサムネイル結果
 * 対応: `struct BatchThumbnailResult`
 */
export type BatchThumbnailResult = {
	path: string; // Rust: String
	thumbnail?: ThumbnailInfo; // Rust: Option<ThumbnailInfo>
	cache_info?: ThumbnailCacheInfo; // Rust: Option<ThumbnailCacheInfo>
	error?: string; // Rust: Option<String>
};

/**
 * バッチサムネイルパス結果（最適化版）
 * 対応: `struct BatchThumbnailPathResult`
 */
export type BatchThumbnailPathResult = {
	path: string; // Rust: String
	thumbnail?: ThumbnailPathInfo; // Rust: Option<ThumbnailPathInfo>
	cache_info?: ThumbnailCacheInfo; // Rust: Option<ThumbnailCacheInfo>
	error?: string; // Rust: Option<String>
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
