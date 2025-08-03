import { path } from '@tauri-apps/api';
import type { MimeType } from './types';

export const SUPPORTED_IMAGE_EXTS = [
	'jpg',
	'jpeg',
	'png',
	'webp',
	'gif',
	'bmp',
	'avif'
] as const satisfies string[];

export const detectImageMimeType = async (filename: string): Promise<MimeType | null> => {
	const ext = (await path.extname(filename)).toLowerCase();
	switch (ext) {
		case 'jpg':
		case 'jpeg':
			return 'image/jpeg';
		case 'png':
			return 'image/png';
		case 'webp':
			return 'image/webp';
		case 'gif':
			return 'image/gif';
		case 'bmp':
			return 'image/bmp';
		case 'avif':
			return 'image/avif';
		default:
			return null;
	}
};
