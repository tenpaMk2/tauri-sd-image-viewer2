import { loadImage as loadImageData, type ImageData } from '../image/image-loader';

// 画像キャッシュサービスクラス
export class ImageCacheService {
	private cache = new Map<string, string>();
	private preloadingPromises = new Map<string, Promise<string>>();
	private maxCacheSize = 50;

	private safeRevokeUrl = (url: string): void => {
		try {
			if (url.startsWith('blob:')) {
				URL.revokeObjectURL(url);
			}
		} catch (error) {
			console.warn('Failed to revoke URL: ' + url + ' ' + error);
		}
	};

	private evictOldestEntries = (count: number): void => {
		const entries = Array.from(this.cache.entries());
		const toEvict = entries.slice(0, count);

		toEvict.forEach(([path, url]) => {
			this.safeRevokeUrl(url);
			this.cache.delete(path);
		});
	};

	loadImage = async (path: string): Promise<string> => {
		if (this.cache.has(path)) {
			return this.cache.get(path)!;
		}

		if (this.preloadingPromises.has(path)) {
			return await this.preloadingPromises.get(path)!;
		}

		const preloadPromise = (async () => {
			const imageData: ImageData = await loadImageData(path);

			if (this.maxCacheSize <= this.cache.size) {
				this.evictOldestEntries(10);
			}

			this.cache.set(path, imageData.url);
			return imageData.url;
		})();

		this.preloadingPromises.set(path, preloadPromise);

		try {
			const url = await preloadPromise;
			return url;
		} finally {
			this.preloadingPromises.delete(path);
		}
	};

	// TODO: ↓は責務違反
	preloadAdjacentImages = async (
		files: string[],
		index: number,
		preloadCount: number = 2,
	): Promise<void> => {
		const promises: Promise<void>[] = [];
		const startIndex = Math.max(0, index - preloadCount);
		const endIndex = Math.min(files.length - 1, index + preloadCount);

		for (let i = startIndex; i <= endIndex; i++) {
			if (i !== index && !this.has(files[i])) {
				promises.push(
					this.loadImage(files[i])
						.then(() => {})
						.catch((error: any) => {
							console.warn('Failed to preload image: ' + files[i] + ' ' + error);
						}),
				);
			}
		}

		if (0 < promises.length) {
			await Promise.allSettled(promises);
		}
	};

	has = (path: string): boolean => this.cache.has(path);

	clear = (): void => {
		this.cache.forEach((url) => this.safeRevokeUrl(url));
		this.cache.clear();
		this.preloadingPromises.clear();
	};
}

// グローバルインスタンス
export const imageCacheService = new ImageCacheService();
