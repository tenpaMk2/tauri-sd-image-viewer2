export type MimeType =
	| 'image/jpeg'
	| 'image/png'
	| 'image/webp'
	| 'image/gif'
	| 'image/bmp'
	| 'image/avif';

export type ImageData = {
	url: string;
	mimeType: MimeType;
	filePath: string;
};

// ==========================================
// フロントエンド専用の型定義
// Rust同期が必要な型は ../types/shared-types.ts を使用
// ==========================================

import type {
	SdParameters,
	ExifInfo,
	BatchThumbnailResult,
	ThumbnailInfo
} from '../types/shared-types';

// 共有型をre-export（後方互換性のため）
export type { BatchThumbnailResult, ThumbnailInfo };

export type ImageMetadata = {
	filename: string;
	size: string;
	dimensions: string;
	format: string;
	created: string;
	modified: string;
	camera?: string;
	lens?: string;
	settings?: string;
	sdParameters?: SdParameters;
	exifInfo?: ExifInfo;
};
