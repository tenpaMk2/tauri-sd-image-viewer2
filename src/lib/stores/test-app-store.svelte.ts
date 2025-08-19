import { open } from '@tauri-apps/plugin-dialog';
import { getDirectoryFromPath, isImageFile } from '../image/utils';

export type TestViewMode = 'welcome' | 'viewer';

export type TestAppState = {
	viewMode: TestViewMode;
	selectedImagePath: string | null;
};

export type TestAppActions = {
	openFileDialog: () => Promise<void>;
	handleImageChange: (newPath: string) => Promise<void>;
};

// Svelte 5の$stateを使用（最小限構成）
let appState = $state<TestAppState>({
	viewMode: 'welcome',
	selectedImagePath: null
});

const openFileDialog = async (): Promise<void> => {
	console.log('🔄 [Test] openFileDialog called');
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

		console.log('📁 [Test] File selected:', selected);

		if (selected && typeof selected === 'string') {
			appState.selectedImagePath = selected;
			appState.viewMode = 'viewer';
			console.log('✅ [Test] App state updated to viewer mode');
		} else {
			console.log('❌ [Test] No file selected');
		}
	} catch (error) {
		console.error('❌ [Test] File selection error:', error);
	}
};

const handleImageChange = async (newPath: string): Promise<void> => {
	console.log('🔄 [Test] handleImageChange called with:', newPath.split('/').pop());
	appState.selectedImagePath = newPath;
};

export const testAppStore = {
	get state() { return appState; },
	actions: {
		openFileDialog,
		handleImageChange
	}
};