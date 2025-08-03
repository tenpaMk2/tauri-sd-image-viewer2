import type { ImageMetadata } from '../types';

export const createImageMetadata = (imagePath: string): ImageMetadata => {
	const filename = imagePath.split('/').pop() || 'unknown';
	const extension = filename.split('.').pop()?.toUpperCase() || '';

	return {
		filename,
		size: '不明',
		dimensions: '不明',
		format: extension,
		created: new Date().toLocaleString('ja-JP'),
		modified: new Date().toLocaleString('ja-JP')
	};
};

export const getDirectoryFromPath = (path: string): string => {
	return path.substring(0, path.lastIndexOf('/'));
};
