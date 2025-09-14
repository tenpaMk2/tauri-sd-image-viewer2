import * as fs from '@tauri-apps/plugin-fs';
import { detectImageMimeType } from './mime-type';

type CacheEntry = Readonly<{
	url: string;
	timestamp: number;
}>;

export type ImageCacheState = {
	cache: Map<string, CacheEntry>;
};

export type ImageCacheActions = {
	load: (imagePath: string) => Promise<string | null>;
	clearAll: () => void;
};

const MAX_CACHE_SIZE = 20;
const cache = new Map<string, CacheEntry>();

const cleanupOldCache = () => {
	if (cache.size <= MAX_CACHE_SIZE) return;

	const entries = Array.from(cache.entries()).sort(([, a], [, b]) => a.timestamp - b.timestamp);

	const entriesToRemove = entries.slice(0, cache.size - MAX_CACHE_SIZE);
	entriesToRemove.forEach(([path, entry]) => {
		URL.revokeObjectURL(entry.url);
		cache.delete(path);
		console.log('🗑️ Cleaned up cached image:', path);
	});
};

const load = async (imagePath: string): Promise<string> => {
	if (cache.has(imagePath)) {
		return cache.get(imagePath)!.url;
	}

	try {
		const imageData = await fs.readFile(imagePath);
		const detectedMimeType = await detectImageMimeType(imagePath);
		if (!detectedMimeType) {
			throw new Error('Unsupported image format: ' + imagePath);
		}

		const blob = new Blob([imageData], { type: detectedMimeType });
		const url = URL.createObjectURL(blob);
		cache.set(imagePath, { url, timestamp: Date.now() });
		cleanupOldCache();
		return url;
	} catch (error) {
		console.error('Failed to load image:', imagePath, error);
		throw new Error('Failed to load image: ' + imagePath);
	}
};

const clearAll = () => {
	cache.forEach((entry) => {
		URL.revokeObjectURL(entry.url);
	});
	cache.clear();
	console.log('🗑️ Cleared all image cache');
};

export const imageCacheStore = {
	state: {
		cache,
	},
	actions: {
		load,
		clearAll,
	},
};

setInterval(() => {
	console.warn('🌆size: ' + imageCacheStore.state.cache.size);
}, 5000);
