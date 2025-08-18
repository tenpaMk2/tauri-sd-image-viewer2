import { open } from '@tauri-apps/plugin-dialog';
import { writable } from 'svelte/store';
import type { ImageMetadata } from '../image/types';
import { getDirectoryFromPath, isDirectory, isImageFile } from '../image/utils';
import type { AsyncThumbnailQueue } from '../services/async-thumbnail-queue';
import { imageMetadataStore } from './image-metadata-store.svelte';
import { metadataService } from '../services/metadata-service.svelte';
import type { ViewMode } from '../ui/types';

export type AppState = {
	viewMode: ViewMode;
	selectedImagePath: string | null;
	imageMetadata: ImageMetadata | null;
	selectedDirectory: string | null;
};

export type AppActions = {
	openFileDialog: () => Promise<void>;
	openDirectoryDialog: () => Promise<void>;
	updateSelectedImage: (imagePath: string) => Promise<void>;
	handleImageChange: (newPath: string) => Promise<void>;
	handleSwitchToGrid: () => Promise<void>;
	handleImageSelect: (imagePath: string) => Promise<void>;
	handleBackToGrid: () => Promise<void>;
	handleBackToWelcome: () => Promise<void>;
	refreshCurrentImageMetadata: () => Promise<void>;
	handleDroppedPaths: (paths: string[]) => Promise<void>;
};

// アクティブなサムネイルキューの管理
let activeQueue: AsyncThumbnailQueue | null = null;

export const setActiveQueue = (queue: AsyncThumbnailQueue): void => {
	// 以前のキューを停止
	if (activeQueue && activeQueue !== queue) {
		console.log('Stopping previous thumbnail queue');
		activeQueue.stop();
	}
	activeQueue = queue;
};

export const stopActiveQueue = (): void => {
	if (activeQueue) {
		console.log('Stopping active thumbnail queue');
		activeQueue.stop();
	}
};

export const clearActiveQueue = (): void => {
	if (activeQueue) {
		activeQueue.stop();
		activeQueue = null;
	}
};

// 従来のwritableストアを使用
const initialState: AppState = {
	viewMode: 'welcome',
	selectedImagePath: null,
	imageMetadata: null,
	selectedDirectory: null
};

const appState = writable(initialState);

const openFileDialog = async (): Promise<void> => {
	try {
		const selected = await open({
			multiple: false,
			filters: [
				{
					name: 'Image Files',
					extensions: ['png', 'jpg', 'jpeg', 'webp']
				}
			]
		});

		if (selected && typeof selected === 'string') {
			// ファイル選択でビューアーモードに移行する時は、サムネイル生成キューを停止
			stopActiveQueue();

			const reactiveMetadata = metadataService.getReactiveMetadata(selected);
		// 基本情報のみ先に取得
		if (!reactiveMetadata.isLoaded && !reactiveMetadata.isLoading) {
			await reactiveMetadata.load();
		}
		const imageMetadata = {
			filename: reactiveMetadata.filename || 'Unknown',
			size: reactiveMetadata.fileSize ? Math.round(reactiveMetadata.fileSize / 1024) + ' KB' : 'Unknown',
			dimensions: reactiveMetadata.width && reactiveMetadata.height 
				? reactiveMetadata.width + ' × ' + reactiveMetadata.height 
				: 'Unknown',
			format: reactiveMetadata.mimeType || 'Unknown',
			created: 'Unknown',
			modified: 'Unknown',
			sdParameters: reactiveMetadata.sdParameters,
			rating: reactiveMetadata.rating
		};
			const selectedDirectory = await getDirectoryFromPath(selected);

			appState.update((state) => ({
				...state,
				selectedImagePath: selected,
				imageMetadata,
				selectedDirectory,
				viewMode: 'viewer'
			}));
		}
	} catch (error) {
		console.error('ファイル選択エラー: ' + error);
	}
};

const openDirectoryDialog = async (): Promise<void> => {
	try {
		const selected = await open({
			directory: true,
			multiple: false
		});

		if (selected && typeof selected === 'string') {
			appState.update((state) => ({
				...state,
				selectedDirectory: selected,
				viewMode: 'grid'
			}));
		}
	} catch (error) {
		console.error('フォルダ選択エラー: ' + error);
	}
};

const updateSelectedImage = async (imagePath: string): Promise<void> => {
	// リアクティブメタデータから基本情報を取得
	const reactiveMetadata = metadataService.getReactiveMetadata(imagePath);
	if (!reactiveMetadata.isLoaded && !reactiveMetadata.isLoading) {
		await reactiveMetadata.load();
	}
	const newMetadata = {
		filename: reactiveMetadata.filename || 'Unknown',
		size: reactiveMetadata.fileSize ? Math.round(reactiveMetadata.fileSize / 1024) + ' KB' : 'Unknown',
		dimensions: reactiveMetadata.width && reactiveMetadata.height 
			? reactiveMetadata.width + ' × ' + reactiveMetadata.height 
			: 'Unknown',
		format: reactiveMetadata.mimeType || 'Unknown',
		created: 'Unknown',
		modified: 'Unknown',
		sdParameters: reactiveMetadata.sdParameters,
		rating: reactiveMetadata.rating
	};

	appState.update((state) => ({
		...state,
		selectedImagePath: imagePath,
		imageMetadata: newMetadata
	}));
};

const handleImageChange = async (newPath: string): Promise<void> => {
	await updateSelectedImage(newPath);
};

const handleSwitchToGrid = async (): Promise<void> => {
	// Rating書き込み処理を待機（クラッシュ防止）
	await imageMetadataStore.waitForAllRatingWrites();

	// グリッドモードに戻る時は、前のキューが動いていても継続させる
	appState.update((state) => ({
		...state,
		viewMode: 'grid'
	}));
};

const handleImageSelect = async (imagePath: string): Promise<void> => {
	// Rating書き込み処理を待機（クラッシュ防止）
	await imageMetadataStore.waitForAllRatingWrites();

	// ビューアーモードに切り替える時は、サムネイル生成キューを停止
	stopActiveQueue();

	await updateSelectedImage(imagePath);
	appState.update((state) => ({
		...state,
		viewMode: 'viewer'
	}));
};

const handleBackToGrid = async (): Promise<void> => {
	// Rating書き込み処理を待機（クラッシュ防止）
	await imageMetadataStore.waitForAllRatingWrites();

	appState.update((state) => ({
		...state,
		viewMode: 'grid'
	}));
};

const handleBackToWelcome = async (): Promise<void> => {
	// Rating書き込み処理を待機（クラッシュ防止）
	await imageMetadataStore.waitForAllRatingWrites();

	// ウェルカム画面に戻る時は、サムネイル生成キューを停止してクリア
	clearActiveQueue();
	appState.set(initialState);
};

const refreshCurrentImageMetadata = async (): Promise<void> => {
	let currentImagePath: string | null = null;

	appState.subscribe((state) => {
		currentImagePath = state.selectedImagePath;
	})();

	if (currentImagePath) {
		const reactiveMetadata = metadataService.getReactiveMetadata(currentImagePath);
		// リフレッシュ実行
		await reactiveMetadata.forceReload();
		const refreshedMetadata = {
			filename: reactiveMetadata.filename || 'Unknown',
			size: reactiveMetadata.fileSize ? Math.round(reactiveMetadata.fileSize / 1024) + ' KB' : 'Unknown',
			dimensions: reactiveMetadata.width && reactiveMetadata.height 
				? reactiveMetadata.width + ' × ' + reactiveMetadata.height 
				: 'Unknown',
			format: reactiveMetadata.mimeType || 'Unknown',
			created: 'Unknown',
			modified: 'Unknown',
			sdParameters: reactiveMetadata.sdParameters,
			rating: reactiveMetadata.rating
		};
		appState.update((state) => ({
			...state,
			imageMetadata: refreshedMetadata
		}));
	}
};

const handleDroppedPaths = async (paths: string[]): Promise<void> => {
	if (paths.length === 0) return;

	const firstPath = paths[0];

	try {
		if (await isDirectory(firstPath)) {
			clearActiveQueue();
			appState.update((state) => ({
				...state,
				selectedDirectory: firstPath,
				viewMode: 'grid'
			}));
		} else if (isImageFile(firstPath)) {
			stopActiveQueue();

			const reactiveMetadata = metadataService.getReactiveMetadata(firstPath);
			// 基本情報のみ先に取得
			if (!reactiveMetadata.isLoaded && !reactiveMetadata.isLoading) {
				await reactiveMetadata.load();
			}
			const imageMetadata = {
				filename: reactiveMetadata.filename || 'Unknown',
				size: reactiveMetadata.fileSize ? Math.round(reactiveMetadata.fileSize / 1024) + ' KB' : 'Unknown',
				dimensions: reactiveMetadata.width && reactiveMetadata.height 
					? reactiveMetadata.width + ' × ' + reactiveMetadata.height 
					: 'Unknown',
				format: reactiveMetadata.mimeType || 'Unknown',
				created: 'Unknown',
				modified: 'Unknown',
				sdParameters: reactiveMetadata.sdParameters,
				rating: reactiveMetadata.rating
			};
			const selectedDirectory = await getDirectoryFromPath(firstPath);

			appState.update((state) => ({
				...state,
				selectedImagePath: firstPath,
				imageMetadata,
				selectedDirectory,
				viewMode: 'viewer'
			}));
		}
	} catch (error) {
		console.error('Error processing dropped path: ' + error);
	}
};

export const appStore = {
	subscribe: appState.subscribe,
	actions: {
		openFileDialog,
		openDirectoryDialog,
		updateSelectedImage,
		handleImageChange,
		handleSwitchToGrid,
		handleImageSelect,
		handleBackToGrid,
		handleBackToWelcome,
		refreshCurrentImageMetadata,
		handleDroppedPaths
	}
};
