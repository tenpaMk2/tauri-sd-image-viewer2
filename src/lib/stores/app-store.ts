import type { ImageMetadata } from '../image/types';
import type { ViewMode } from '../ui/types';
import { getDirectoryFromPath } from '../image/utils';
import { imageMetadataService } from '../services/image-metadata-service';
import { open } from '@tauri-apps/plugin-dialog';

type AppState = {
	viewMode: ViewMode;
	selectedImagePath: string | null;
	imageMetadata: ImageMetadata | null;
	selectedDirectory: string | null;
};

type AppActions = {
	openFileDialog: () => Promise<void>;
	openDirectoryDialog: () => Promise<void>;
	updateSelectedImage: (imagePath: string) => Promise<void>;
	handleImageChange: (newPath: string) => Promise<void>;
	handleSwitchToGrid: () => void;
	handleImageSelect: (imagePath: string) => Promise<void>;
	handleBackToGrid: () => void;
	handleBackToWelcome: () => void;
	refreshCurrentImageMetadata: () => Promise<void>;
};

const createAppStore = () => {
	let state = $state<AppState>({
		viewMode: 'welcome',
		selectedImagePath: null,
		imageMetadata: null,
		selectedDirectory: null
	});

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
				state.selectedImagePath = selected;
				state.imageMetadata = await imageMetadataService.getImageMetadataUnsafe(selected);
				state.selectedDirectory = await getDirectoryFromPath(selected);
				state.viewMode = 'viewer';
			}
		} catch (error) {
			console.error('ファイル選択エラー:', error);
		}
	};

	const openDirectoryDialog = async (): Promise<void> => {
		try {
			const selected = await open({
				directory: true,
				multiple: false
			});

			if (selected && typeof selected === 'string') {
				state.selectedDirectory = selected;
				state.viewMode = 'grid';
			}
		} catch (error) {
			console.error('フォルダ選択エラー:', error);
		}
	};

	const updateSelectedImage = async (imagePath: string): Promise<void> => {
		console.log('メタデータ更新開始:', imagePath);
		state.selectedImagePath = imagePath;
		const newMetadata = await imageMetadataService.getImageMetadataUnsafe(imagePath);
		console.log('メタデータ更新完了:', {
			sdParameters: newMetadata.sdParameters,
			exifRating: newMetadata.exifInfo?.rating
		});
		state.imageMetadata = newMetadata;
	};

	const handleImageChange = async (newPath: string): Promise<void> => {
		await updateSelectedImage(newPath);
	};

	const handleSwitchToGrid = (): void => {
		if (state.selectedDirectory) {
			state.viewMode = 'grid';
		}
	};

	const handleImageSelect = async (imagePath: string): Promise<void> => {
		await updateSelectedImage(imagePath);
		state.viewMode = 'viewer';
	};

	const handleBackToGrid = (): void => {
		state.viewMode = 'grid';
	};

	const handleBackToWelcome = (): void => {
		state.viewMode = 'welcome';
		state.selectedImagePath = null;
		state.imageMetadata = null;
		state.selectedDirectory = null;
	};

	const refreshCurrentImageMetadata = async (): Promise<void> => {
		if (state.selectedImagePath) {
			const refreshedMetadata = await imageMetadataService.refreshMetadataUnsafe(
				state.selectedImagePath
			);
			state.imageMetadata = refreshedMetadata;
		}
	};

	return {
		get state() {
			return state;
		},
		actions: {
			openFileDialog,
			openDirectoryDialog,
			updateSelectedImage,
			handleImageChange,
			handleSwitchToGrid,
			handleImageSelect,
			handleBackToGrid,
			handleBackToWelcome,
			refreshCurrentImageMetadata
		} as AppActions
	};
};

export const appStore = createAppStore();
export type { AppState, AppActions };
