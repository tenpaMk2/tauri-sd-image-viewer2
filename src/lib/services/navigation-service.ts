import { dirname } from '@tauri-apps/api/path';
import { getImageFiles, loadImage } from '../image/image-loader';
import type { ImageData } from '../image/types';

// ナビゲーション状態の型定義
export type NavigationState = {
	files: string[];
	currentIndex: number;
	isNavigating: boolean;
};

// 画像キャッシュ管理
export class ImageCacheManager {
	private cache = new Map<string, string>();

	async preloadImage(path: string): Promise<string> {
		// キャッシュに存在する場合はそれを返す
		if (this.cache.has(path)) {
			return this.cache.get(path)!;
		}

		const imageData: ImageData = await loadImage(path);
		this.cache.set(path, imageData.url);
		return imageData.url;
	}

	get(path: string): string | undefined {
		return this.cache.get(path);
	}

	has(path: string): boolean {
		return this.cache.has(path);
	}

	clear(): void {
		this.cache.clear();
	}
}

// ナビゲーションサービス
export class NavigationService {
	private cacheManager = new ImageCacheManager();

	// 隣接する画像をプリロード
	async preloadAdjacentImages(files: string[], index: number): Promise<void> {
		const promises: Promise<void>[] = [];

		// 前の画像をプリロード
		if (0 < index) {
			promises.push(
				this.cacheManager
					.preloadImage(files[index - 1])
					.then(() => {})
					.catch((error) => {
						console.warn(`前の画像のプリロードに失敗: ${files[index - 1]}`, error);
					})
			);
		}

		// 次の画像をプリロード
		if (index < files.length - 1) {
			promises.push(
				this.cacheManager
					.preloadImage(files[index + 1])
					.then(() => {})
					.catch((error) => {
						console.warn(`次の画像のプリロードに失敗: ${files[index + 1]}`, error);
					})
			);
		}

		await Promise.all(promises);
	}

	// 同一ディレクトリの画像ファイル一覧を取得して初期化
	async initializeNavigation(imagePath: string): Promise<NavigationState> {
		const dirPath = await dirname(imagePath);
		const files = await getImageFiles(dirPath);
		const currentIndex = files.findIndex((file) => file === imagePath);

		return {
			files,
			currentIndex,
			isNavigating: false
		};
	}

	// 画像を読み込み（キャッシュ対応）
	async loadImage(path: string): Promise<string> {
		return await this.cacheManager.preloadImage(path);
	}

	// キャッシュされた画像URLを取得
	getCachedImageUrl(path: string): string | undefined {
		return this.cacheManager.get(path);
	}

	// キャッシュに画像が存在するかチェック
	isCached(path: string): boolean {
		return this.cacheManager.has(path);
	}

	// キャッシュをクリア
	clearCache(): void {
		this.cacheManager.clear();
	}

	// ディレクトリ名を取得
	async getDirname(path: string): Promise<string> {
		return await dirname(path);
	}
}
