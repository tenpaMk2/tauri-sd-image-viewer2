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
// 画像メタデータ情報（軽量版）
// 対応ファイル: src-tauri/src/image_info.rs
// ==========================================

/**
 * 画像ファイル情報
 * 対応: `struct ImageFileInfo`
 */
export type ImageFileInfo = {
	path: string; // Rust: String
	file_size: number; // Rust: u64
	modified_time: number; // Rust: u64 (UNIXタイムスタンプ)
	width: number; // Rust: u32
	height: number; // Rust: u32
	mime_type: string; // Rust: String
};

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
	created_time?: number; // Rust: Option<u64> (UNIXタイムスタンプ)
	modified_time: number; // Rust: u64 (UNIXタイムスタンプ)
	sd_parameters?: SdParameters; // Rust: Option<SdParameters>
	rating?: number; // Rust: Option<u8> - XMP Rating from xmp_handler
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

// OriginalFileInfo は削除されました - ImageFileInfo を直接使用

/**
 * 画像メタデータキャッシュ（JSONファイルで保存）
 * 対応: `struct ImageMetadataCache`
 */
export type ImageMetadataCache = {
	thumbnail_config: ThumbnailConfig; // Rust: ThumbnailConfig
	original_file_info: ImageFileInfo; // Rust: ImageFileInfo
	thumbnail_filename: string; // Rust: String
	thumbnail_width: number; // Rust: u32
	thumbnail_height: number; // Rust: u32
	thumbnail_mime_type: string; // Rust: String
	rating?: number; // Rust: Option<u8> - XMP Rating
	sd_parameters?: SdParameters; // Rust: Option<SdParameters>
	cached_at: number; // Rust: u64 (UNIXタイムスタンプ)
};

// ThumbnailInfo は削除されました - ImageMetadataCache に統合

// ThumbnailPathInfo は削除されました - ImageMetadataCache に統合

/**
 * サムネイルキャッシュ情報 (フロントエンド用エイリアス)
 * ImageMetadataCache のサブセット
 */
export type ThumbnailCacheInfo = ImageMetadataCache;

/**
 * サムネイル生成結果
 * 対応: `struct ThumbnailResult`
 */
export type ThumbnailResult = {
	original_path: string; // Rust: String
	thumbnail_path?: string; // Rust: Option<String>
	error?: string; // Rust: Option<String>
};

/**
 * バッチサムネイル結果
 * 対応: `struct BatchThumbnailResult`
 */
export type BatchThumbnailResult = {
	path: string; // Rust: String
	metadata_cache?: ImageMetadataCache; // Rust: Option<ImageMetadataCache>
	error?: string; // Rust: Option<String>
};

// BatchThumbnailPathResult は削除されました - BatchThumbnailResult に統合

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
