import { imageRegistry } from '$lib/services/image-registry';
import { directoryImagePathsStore } from './directory-image-paths-store.svelte';

// currentFilePathの変更コールバック型
export type CurrentFilePathChangeCallback = (newPath: string) => void | Promise<void>;

type MutableNavigationState = {
	currentImagePath: string;
	isNavigating: boolean;
	oldImagePath: string | undefined;
};
// TODO: リセットがいる。 `oldImagePath` のクリアしないといけない。

export type NavigationState = Readonly<MutableNavigationState>;

const INITIAL_NAVIGATION_STATE: NavigationState = {
	currentImagePath: '',
	isNavigating: false,
	oldImagePath: undefined,
};

const _state = $state<MutableNavigationState>({ ...INITIAL_NAVIGATION_STATE });

// directoryImagePathsStore からディレクトリデータを取得
const directoryImages = $derived(directoryImagePathsStore.state.imagePaths || []);

const currentIndex = $derived.by(() => {
	const paths = directoryImages;
	const targetPath = _state.currentImagePath;
	const idx = paths.findIndex((path) => path === targetPath);
	return idx === -1 ? 0 : idx; // もし見つからなければ0にフォールバック
});
const lastIndex = $derived(directoryImages.length - 1);
const hasPrevious = $derived(0 < currentIndex);
const hasNext = $derived(currentIndex < directoryImages.length - 1);
const previousImagePath = $derived(hasPrevious ? directoryImages[currentIndex - 1] : null);
const nextImagePath = $derived(hasNext ? directoryImages[currentIndex + 1] : null);
const lastImagePath = $derived(0 < lastIndex ? directoryImages[lastIndex] : null);

// 隣接画像のプリロード
const preloadAdjacentImages = async (currentPath: string): Promise<void> => {
	// 次の画像と前の画像をプリロード
	const preloadPaths: string[] = [];
	if (hasPrevious) {
		preloadPaths.push(previousImagePath!); // 前の画像
	}
	if (hasNext) {
		preloadPaths.push(nextImagePath!); // 次の画像
	}

	// プリロード実行（エラーは無視）
	for (const path of preloadPaths) {
		try {
			const store = imageRegistry.getOrCreateStore(path);
			await store.actions.ensureLoaded();
		} catch (error) {
			console.warn('Preload failed (ignored): ' + path.split('/').pop() + ' ' + error);
		}
	}
};

// 指定された画像パスにナビゲーションする（フル機能）
const navigateTo = async (imagePath: string): Promise<void> => {
	console.log('🔄 NavigationStore.navigateTo called: ' + imagePath.split('/').pop());

	// 同じディレクトリ内で画像が存在するかチェック
	const targetIndex = directoryImages.findIndex((path) => path === imagePath);
	if (targetIndex < 0) {
		console.error('❌ Image path not found in current directory: ' + imagePath);
		return;
	}

	// ナビゲーション開始
	_state.isNavigating = true;

	_state.oldImagePath = _state.currentImagePath;
	_state.currentImagePath = imagePath;
	_state.isNavigating = false;

	// 画像表示完了後に隣接画像をプリロード（非同期）
	preloadAdjacentImages(imagePath).catch(() => {
		// プリロードエラーは無視
	});
};

export const navigationStore = {
	state: _state as NavigationState,

	deriveds: {
		get directoryImageCount() {
			return lastIndex;
		},
		get currentIndex() {
			return currentIndex;
		},
		get hasPrevious() {
			return hasPrevious;
		},
		get hasNext() {
			return hasNext;
		},
		get nextImagePath() {
			return nextImagePath;
		},
		get previousImagePath() {
			return previousImagePath;
		},
		get lastImagePath() {
			return lastImagePath;
		},
	},

	actions: {
		navigateTo,
	},
};
