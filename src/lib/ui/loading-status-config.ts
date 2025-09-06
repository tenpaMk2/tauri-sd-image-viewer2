export type LoadingStatusType = 'unloaded' | 'queued' | 'loading' | 'loaded' | 'error';

type StatusDisplayConfig = {
	icon?: string; // Lucide icon name
	loadingIcon?: 'loading-ring' | 'loading-spinner' | 'loading-dots' | 'loading-ball'; // DaisyUI loading classes
	text: string;
};

export const LOADING_STATUS_CONFIG: Record<LoadingStatusType, StatusDisplayConfig> = {
	unloaded: { icon: 'folder', text: 'Unloaded' },
	queued: { loadingIcon: 'loading-ring', text: 'Queued' },
	loading: { loadingIcon: 'loading-spinner', text: 'Loading...' },
	loaded: { text: 'Loaded' }, // アイコンなし（実際のコンテンツが表示されるため）
	error: { icon: 'triangle-alert', text: 'Error' }
};
