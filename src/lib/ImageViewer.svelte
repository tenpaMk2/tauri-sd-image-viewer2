<script lang="ts">
	import { onMount } from 'svelte';
	import { getImageFiles, loadImage, type ImageData } from './image-loader';
	import ImageDisplay from './ImageDisplay.svelte';
	import ImageInfoPanel from './ImageInfoPanel.svelte';
	import NavigationButtons from './NavigationButtons.svelte';
	import ToolbarOverlay from './ToolbarOverlay.svelte';

	type ImageMetadata = {
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

	const {
		metadata,
		imagePath,
		onImageChange,
		openFileDialog
	}: {
		metadata: ImageMetadata;
		imagePath: string;
		onImageChange: (newPath: string) => void;
		openFileDialog: () => void;
	} = $props();

	let imageUrl = $state<string>('');
	let isLoading = $state<boolean>(true);
	let error = $state<string>('');
	let imageFiles = $state<string[]>([]);
	let currentIndex = $state<number>(0);
	let isNavigating = $state<boolean>(false);

	// プリロード用のキャッシュ
	const imageCache = new Map<string, string>();
	let preloadImage: HTMLImageElement | null = null;

	// プリロード機能付きの画像読み込み
	const preloadImageData = async (path: string): Promise<string> => {
		// キャッシュに存在する場合はそれを返す
		if (imageCache.has(path)) {
			return imageCache.get(path)!;
		}

		const imageData: ImageData = await loadImage(path);
		imageCache.set(path, imageData.url);
		return imageData.url;
	};

	const loadCurrentImage = async (path: string) => {
		try {
			isLoading = true;
			error = '';
			const url = await preloadImageData(path);
			imageUrl = url;
		} catch (err) {
			error = err instanceof Error ? err.message : '画像の読み込みに失敗しました';
			console.error('Failed to load image:', err);
		} finally {
			isLoading = false;
		}
	};

	// 隣接する画像をプリロード
	const preloadAdjacentImages = async (index: number) => {
		const promises: Promise<void>[] = [];

		// 前の画像をプリロード
		if (index > 0) {
			promises.push(preloadImageData(imageFiles[index - 1]).catch(() => {}));
		}

		// 次の画像をプリロード
		if (index < imageFiles.length - 1) {
			promises.push(preloadImageData(imageFiles[index + 1]).catch(() => {}));
		}

		await Promise.all(promises);
	};

	const navigateToImage = async (index: number) => {
		if (index >= 0 && index < imageFiles.length && !isNavigating) {
			isNavigating = true;
			currentIndex = index;
			const newPath = imageFiles[index];

			// 画像が既にキャッシュされている場合は即座に切り替え
			if (imageCache.has(newPath)) {
				imageUrl = imageCache.get(newPath)!;
				onImageChange(newPath);
				isNavigating = false;
				// バックグラウンドで隣接画像をプリロード
				preloadAdjacentImages(index);
			} else {
				// キャッシュにない場合は読み込み状態を表示
				await loadCurrentImage(newPath);
				onImageChange(newPath);
				isNavigating = false;
				// 読み込み完了後に隣接画像をプリロード
				preloadAdjacentImages(index);
			}
		}
	};

	const goToPrevious = async () => {
		if (currentIndex > 0 && !isNavigating) {
			await navigateToImage(currentIndex - 1);
		}
	};

	const goToNext = async () => {
		if (currentIndex < imageFiles.length - 1 && !isNavigating) {
			await navigateToImage(currentIndex + 1);
		}
	};

	const initializeImages = async (path: string) => {
		// 同一ディレクトリの画像ファイル一覧を取得
		imageFiles = await getImageFiles(path);
		currentIndex = imageFiles.findIndex((file) => file === path);

		// 初期画像を読み込み
		await loadCurrentImage(path);

		// 初期化完了後に隣接画像をプリロード
		if (currentIndex >= 0) {
			preloadAdjacentImages(currentIndex);
		}
	};

	onMount(async () => {
		await initializeImages(imagePath);
	});

	// imagePathが変更された時に再初期化
	$effect(() => {
		if (imagePath) {
			initializeImages(imagePath);
		}
	});
</script>

<div class="relative flex h-screen">
	<!-- 画像表示エリア (全面) -->
	<div class="relative flex-1 bg-black">
		<ToolbarOverlay {imageFiles} {currentIndex} {openFileDialog} />
		<ImageDisplay {imageUrl} {isLoading} {error} {metadata} />
		<NavigationButtons {imageFiles} {currentIndex} {isNavigating} {goToPrevious} {goToNext} />
	</div>

	<ImageInfoPanel {metadata} />
</div>
