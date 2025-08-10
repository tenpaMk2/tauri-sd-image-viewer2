import { dirname } from '@tauri-apps/api/path';
import { getImageFiles, loadImage } from '../image/image-loader';
import type { ImageData } from '../image/types';

export type NavigationState = {
	files: string[];
	currentIndex: number;
	isNavigating: boolean;
};

export class ImageCacheManager {
	private cache = new Map<string, string>();
	private preloadingPromises = new Map<string, Promise<string>>();
	private maxCacheSize = 50;

	async preloadImage(path: string): Promise<string> {
		if (this.cache.has(path)) {
			return this.cache.get(path)!;
		}

		if (this.preloadingPromises.has(path)) {
			return await this.preloadingPromises.get(path)!;
		}

		const preloadPromise = this.loadAndCache(path);
		this.preloadingPromises.set(path, preloadPromise);

		try {
			const url = await preloadPromise;
			return url;
		} finally {
			this.preloadingPromises.delete(path);
		}
	}

	private async loadAndCache(path: string): Promise<string> {
		const imageData: ImageData = await loadImage(path);

		if (this.cache.size >= this.maxCacheSize) {
			this.evictOldestEntries(10);
		}

		this.cache.set(path, imageData.url);
		return imageData.url;
	}

	private evictOldestEntries(count: number): void {
		const entries = Array.from(this.cache.entries());
		const toEvict = entries.slice(0, count);

		toEvict.forEach(([path, url]) => {
			this.safeRevokeUrl(url);
			this.cache.delete(path);
		});
	}

	private safeRevokeUrl(url: string): void {
		try {
			if (url.startsWith('blob:')) {
				URL.revokeObjectURL(url);
			}
		} catch (error) {
			console.warn('Failed to revoke URL:', url, error);
		}
	}

	get(path: string): string | undefined {
		return this.cache.get(path);
	}

	has(path: string): boolean {
		return this.cache.has(path);
	}

	clear(): void {
		this.cache.forEach((url) => this.safeRevokeUrl(url));
		this.cache.clear();
		this.preloadingPromises.clear();
	}

	revokeUrl(path: string): void {
		const url = this.cache.get(path);
		if (url) {
			this.safeRevokeUrl(url);
			this.cache.delete(path);
		}
	}
}

export class NavigationService {
	private cacheManager = new ImageCacheManager();

	async preloadAdjacentImages(
		files: string[],
		index: number,
		preloadCount: number = 2
	): Promise<void> {
		const promises: Promise<void>[] = [];
		const startIndex = Math.max(0, index - preloadCount);
		const endIndex = Math.min(files.length - 1, index + preloadCount);

		for (let i = startIndex; i <= endIndex; i++) {
			if (i !== index && !this.cacheManager.has(files[i])) {
				promises.push(
					this.cacheManager
						.preloadImage(files[i])
						.then(() => {})
						.catch((error) => {
							console.warn(`画像のプリロードに失敗: ${files[i]}`, error);
						})
				);
			}
		}

		if (promises.length > 0) {
			await Promise.allSettled(promises);
		}
	}

	/**
	 * パス基準でのプリロード処理
	 * ナビゲーション状態更新後に隣接画像をプリロード
	 */
	async preloadAdjacentByPath(currentPath: string, preloadCount: number = 2): Promise<void> {
		try {
			const updatedNavigation = await this.updateNavigationWithCurrentPath(currentPath);
			await this.preloadAdjacentImages(updatedNavigation.files, updatedNavigation.currentIndex, preloadCount);
		} catch (error) {
			console.warn('プリロード処理に失敗:', currentPath, error);
		}
	}

	async initializeNavigation(imagePath: string): Promise<NavigationState> {
		const dirPath = await dirname(imagePath);
		const files = await getImageFiles(dirPath);
		const currentIndex = files.findIndex((file) => file === imagePath);

		return {
			files,
			currentIndex: currentIndex === -1 ? 0 : currentIndex,
			isNavigating: false
		};
	}

	/**
	 * 現在のパスを基準にナビゲーション状態を更新
	 * 新しい画像が追加された場合でも現在の画像位置を正確に保持
	 */
	async updateNavigationWithCurrentPath(currentPath: string): Promise<NavigationState> {
		const dirPath = await dirname(currentPath);
		const files = await getImageFiles(dirPath);
		const currentIndex = files.findIndex((file) => file === currentPath);

		return {
			files,
			currentIndex: currentIndex === -1 ? 0 : currentIndex,
			isNavigating: false
		};
	}

	/**
	 * パス基準でインデックスを検索
	 */
	findIndexByPath(files: string[], targetPath: string): number {
		const index = files.findIndex((file) => file === targetPath);
		return index === -1 ? 0 : index;
	}

	async loadImage(path: string): Promise<string> {
		return await this.cacheManager.preloadImage(path);
	}

	getCachedImageUrl(path: string): string | undefined {
		return this.cacheManager.get(path);
	}

	isCached(path: string): boolean {
		return this.cacheManager.has(path);
	}

	clearCache(): void {
		this.cacheManager.clear();
	}

	revokeImageUrl(path: string): void {
		this.cacheManager.revokeUrl(path);
	}

	async getDirname(path: string): Promise<string> {
		return await dirname(path);
	}

	getCacheSize(): number {
		return this.cacheManager['cache'].size;
	}
}
