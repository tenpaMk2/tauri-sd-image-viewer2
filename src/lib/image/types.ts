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
};

export type ThumbnailInfo = {
	data: number[];
	width: number;
	height: number;
	mime_type: string;
};

export type BatchThumbnailResult = {
	path: string;
	thumbnail: ThumbnailInfo | null;
	error: string | null;
};
