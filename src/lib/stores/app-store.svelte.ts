import { path } from '@tauri-apps/api';
import { metadataQueue } from '../services/metadata-queue';
import { metadataRegistry } from '../services/metadata-registry';
import { thumbnailQueue } from '../services/thumbnail-queue';
import { thumbnailRegistry } from '../services/thumbnail-registry';
import { navigationStore } from './navigation-store.svelte';

type ViewMode = 'welcome' | 'grid' | 'viewer';

type MutableAppState = {
	viewMode: ViewMode;
	initialImagePath: string | null;
	directory: string | null;
};

type ViewModeTransitionOptions = {
	initialImagePath?: string | null;
	directory?: string | null;
	skipCleanup?: boolean;
};

export type AppState = Readonly<MutableAppState>;

const INITIAL_APP_STATE: MutableAppState = {
	viewMode: 'welcome',
	initialImagePath: null,
	directory: null,
};

let state = $state<MutableAppState>({
	viewMode: 'welcome',
	initialImagePath: null,
	directory: null,
});

const toWelcome = (): void => {
	state.viewMode = 'welcome';
	state.initialImagePath = null;
	state.directory = null;

	thumbnailQueue.clear();
	metadataQueue.clear();
	thumbnailRegistry.clearAll();
	metadataRegistry.clearAll();
};

/**
 * 内部状態遷移API - 適切なクリーンアップと共に状態を変更
 */
const _transitionTo = async (
	newViewMode: ViewMode,
	options: ViewModeTransitionOptions = {},
): Promise<void> => {
	const currentMode = state.viewMode;
	const { initialImagePath, directory, skipCleanup = false } = options;

	console.log(`🔄 State transition: ${currentMode} -> ${newViewMode}`);

	switch (currentMode) {
		case 'welcome':
			switch (newViewMode) {
				case 'welcome':
					break;
				case 'grid':
					if (!directory) break;

					state.viewMode = 'grid';
					state.initialImagePath = null;
					state.directory = directory;

					// TODO: サムネイルロード開始
					// TODO: メタデータロード開始

					break;
				case 'viewer':
					if (!initialImagePath) break;

					state.viewMode = 'viewer';
					state.initialImagePath = initialImagePath;
					state.directory = await path.dirname(initialImagePath);
					navigationStore.actions.initializeNavigation(initialImagePath);

					// TODO: メタデータロード開始
					// TODO: イメージロード開始

					break;
			}
			break;
		case 'grid':
			switch (newViewMode) {
				case 'welcome':
					toWelcome();
					break;
				case 'grid':
					break;
				case 'viewer':
					if (!initialImagePath) break;

					state.viewMode = 'grid';
					state.initialImagePath = initialImagePath;
					state.directory = await path.dirname(initialImagePath);

					thumbnailQueue.clear();
					metadataQueue.clear();
					thumbnailRegistry.clearAll();
					metadataRegistry.clearAll();
					navigationStore.actions.initializeNavigation(initialImagePath);

					// TODO: メタデータロード開始
					// TODO: イメージロード開始
					break;
			}

			break;
		case 'viewer':
			switch (newViewMode) {
				case 'welcome':
					toWelcome();
					break;
				case 'grid':
					state.viewMode = 'grid';
					state.initialImagePath = null;
					state.directory = directory ?? (await path.dirname(state.initialImagePath!));

					// TODO: サムネイルロード開始
					// TODO: メタデータロード開始

					break;
				case 'viewer':
					break;
			}
			break;
	}

	console.log(`✅ State transition completed: ${newViewMode}`);
};

/**
 * モード遷移API - Welcome画面への遷移
 */
const transitionToWelcome = async (): Promise<void> => {
	await _transitionTo('welcome', {
		initialImagePath: null,
		directory: null,
	});
};

/**
 * モード遷移API - Grid表示への遷移
 */
const transitionToGrid = async (directory?: string): Promise<void> => {
	await _transitionTo('grid', {
		initialImagePath: null,
		directory,
	});
};

/**
 * モード遷移API - Viewer表示への遷移
 */
const transitionToViewer = async (initialImagePath: string): Promise<void> => {
	await _transitionTo('viewer', {
		initialImagePath,
		directory: null,
	});
};

export const appStore = {
	state: state as AppState,
	actions: {
		transitionToWelcome,
		transitionToGrid,
		transitionToViewer,
	},
};
