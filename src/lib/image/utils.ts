import { dirname } from '@tauri-apps/api/path';
import { stat } from '@tauri-apps/plugin-fs';
import type { SdParameters } from '../types/shared-types';

export type ImageMetadata = {
	filename: string;
	size: Promise<string>;
	dimensions: Promise<string>;
	format: Promise<string | undefined>;
	created: Promise<string | undefined>;
	modified: Promise<string | undefined>;
	sdParameters: Promise<SdParameters | undefined>;
	rating: Promise<number | undefined>;
};

const formatFileSize = (bytes: number): string => {
	if (bytes === 0) return '0 B';

	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const getDirectoryFromPath = async (path: string): Promise<string> => {
	return await dirname(path);
};

export const isDirectory = async (path: string): Promise<boolean> => {
	try {
		const fileStats = await stat(path);
		return fileStats.isDirectory;
	} catch {
		return false;
	}
};

export const isImageFile = (path: string): boolean => {
	const supportedExtensions = ['png', 'jpg', 'jpeg', 'webp'];
	const extension = path.split('.').pop()?.toLowerCase();
	return extension ? supportedExtensions.includes(extension) : false;
};
