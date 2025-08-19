import { dirname } from '@tauri-apps/api/path';
import { getImageFiles, loadImage as loadImageData, type ImageData } from '../image/image-loader';

// 型定義
export type NavigationState = {
	files: string[];
	currentFilePath: string;
	isNavigating: boolean;
};

// 画像キャッシュクラス
class ImageCacheManager {
	private cache = new Map<string, string>();
	private preloadingPromises = new Map<string, Promise<string>>();
	private maxCacheSize = 50;

	private safeRevokeUrl = (url: string) => {
		try {
			if (url.startsWith('blob:')) {
				URL.revokeObjectURL(url);
			}
		} catch (error) {
			console.warn('Failed to revoke URL:', url, error);
		}
	};

	private evictOldestEntries = (count: number) => {
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

	has = (path: string): boolean => this.cache.has(path);

	clear = (): void => {
		this.cache.forEach((url) => this.safeRevokeUrl(url));
		this.cache.clear();
		this.preloadingPromises.clear();
	};
}

// ナビゲーションサービスクラス
class NavigationServiceClass {
	private cacheManager = new ImageCacheManager();

	// リアクティブ状態
	private _state = $state<NavigationState>({
		files: [],
		currentFilePath: '',
		isNavigating: false
	});

	// 計算プロパティ
	get currentIndex(): number {
		const files = this._state.files;
		const currentPath = this._state.currentFilePath;
		if (!files.length || !currentPath) return -1;
		return files.findIndex((path) => path === currentPath);
	}

	get hasPrevious(): boolean {
		return 0 < this.currentIndex;
	}

	get hasNext(): boolean {
		return 0 <= this.currentIndex && this.currentIndex < this._state.files.length - 1;
	}

	// 状態アクセサー
	get navigationState(): NavigationState {
		return this._state;
	}

	get files(): string[] {
		return this._state.files;
	}

	get currentFilePath(): string {
		return this._state.currentFilePath;
	}

	get isNavigating(): boolean {
		return this._state.isNavigating;
	}

	// ヘルパー関数
	private preloadAdjacentImages = async (
		files: string[],
		index: number,
		preloadCount: number = 2
	): Promise<void> => {
		const promises: Promise<void>[] = [];
		const startIndex = Math.max(0, index - preloadCount);
		const endIndex = Math.min(files.length - 1, index + preloadCount);

		for (let i = startIndex; i <= endIndex; i++) {
			if (i !== index && !this.cacheManager.has(files[i])) {
				promises.push(
					this.cacheManager
						.loadImage(files[i])
						.then(() => {})
						.catch((error: any) => {
							console.warn(`Failed to preload image: ${files[i]}`, error);
						})
				);
			}
		}

		if (0 < promises.length) {
			await Promise.allSettled(promises);
		}
	};

	// パブリックメソッド
	navigateNext = async (): Promise<void> => {
		if (!this.hasNext) return;

		const nextIndex = this.currentIndex + 1;
		this._state.currentFilePath = this._state.files[nextIndex];
		await this.preloadAdjacentImages(this._state.files, nextIndex);
	};

	navigatePrevious = async (): Promise<void> => {
		if (!this.hasPrevious) return;

		const prevIndex = this.currentIndex - 1;
		this._state.currentFilePath = this._state.files[prevIndex];
		await this.preloadAdjacentImages(this._state.files, prevIndex);
	};

	initializeNavigation = async (imagePath: string): Promise<void> => {
		this._state.isNavigating = true;

		try {
			const dirPath = await dirname(imagePath);
			const files = await getImageFiles(dirPath);

			this._state.files = files;
			this._state.currentFilePath = imagePath;
		} finally {
			this._state.isNavigating = false;
		}
	};

	loadImage = async (path: string): Promise<string> => {
		return await this.cacheManager.loadImage(path);
	};

	clearCache = (): void => {
		this.cacheManager.clear();
	};
}

// グローバルインスタンス
export const navigationService = new NavigationServiceClass();
