import type {
	SdParameters,
	ExifInfo,
	BatchThumbnailResult,
	ThumbnailInfo,
	CachedMetadata
} from '../types/shared-types';

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

// Re-export shared types for backwards compatibility
export type { SdParameters, ExifInfo, BatchThumbnailResult, ThumbnailInfo, CachedMetadata };
