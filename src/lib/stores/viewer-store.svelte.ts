import { navigationStore } from './navigation-store.svelte';

export type ViewerUIState = {
	isVisible: boolean;
	isInfoPanelVisible: boolean;
	isInfoPanelFocused: boolean;
	infoPanelWidth: number;
	isResizing: boolean;
};

export type ViewerAutoNavState = {
	isActive: boolean;
};

export type ViewerImageState = {
	imageUrl: string;
	isLoading: boolean;
	error: string;
};

type MutableViewerState = {
	imageState: ViewerImageState;
	ui: ViewerUIState;
	autoNav: ViewerAutoNavState;
};

export type ViewerState = Readonly<MutableViewerState>;

const INITIAL_VIEWER_STATE: MutableViewerState = {
	imageState: {
		imageUrl: '',
		isLoading: false,
		error: ''
	},
	ui: {
		isVisible: true,
		isInfoPanelVisible: true,
		isInfoPanelFocused: false,
		infoPanelWidth: 320,
		isResizing: false
	},
	autoNav: {
		isActive: false
	}
};

let state = $state<MutableViewerState>({
	imageState: {
		imageUrl: '',
		isLoading: false,
		error: ''
	},
	ui: {
		isVisible: true,
		isInfoPanelVisible: true,
		isInfoPanelFocused: false,
		infoPanelWidth: 320,
		isResizing: false
	},
	autoNav: {
		isActive: false
	}
});

// Timer management
let uiTimer: number | null = null;
let autoNavTimer: number | null = null;

const loadImage = async (imagePath: string): Promise<void> => {
	console.log(
		'📸 loadImage called with path: ' + (imagePath ? imagePath.split('/').pop() : 'null')
	);

	try {
		state.imageState.error = '';

		console.log('🔄 Loading image...');
		const url = await navigationStore.actions.loadImage(imagePath);
		console.log('✅ Image loaded, URL: ' + (url ? 'blob:...' : 'null'));

		// Success state update
		state.imageState.imageUrl = url;
		state.imageState.isLoading = false;
		state.imageState.error = '';

		console.log('✅ Image state updated successfully');
	} catch (err) {
		console.error('❌ loadImage failed: ' + err);
		// Error state update
		state.imageState.imageUrl = '';
		state.imageState.isLoading = false;
		state.imageState.error = err instanceof Error ? err.message : 'Failed to load image';
	}
};

// UI Controls
const toggleInfoPanel = (): void => {
	state.ui.isInfoPanelVisible = !state.ui.isInfoPanelVisible;
};

const setInfoPanelFocus = (focused: boolean): void => {
	state.ui.isInfoPanelFocused = focused;
};

const setInfoPanelWidth = (width: number): void => {
	state.ui.infoPanelWidth = width;
};

const setResizing = (isResizing: boolean): void => {
	state.ui.isResizing = isResizing;
};

const showUI = (): void => {
	state.ui.isVisible = true;
	resetUITimer();
};

const hideUI = (): void => {
	state.ui.isVisible = false;
};

const resetUITimer = (): void => {
	if (uiTimer !== null) {
		clearTimeout(uiTimer);
	}
	uiTimer = setTimeout(() => {
		hideUI();
	}, 1500);
};

// Auto Navigation
const startAutoNavigation = (onNavigate: () => Promise<void>): void => {
	if (state.autoNav.isActive) {
		stopAutoNavigation();
	} else {
		state.autoNav.isActive = true;
		autoNavTimer = setInterval(async () => {
			await onNavigate();
		}, 2000);
	}
};

const stopAutoNavigation = (): void => {
	if (autoNavTimer !== null) {
		clearInterval(autoNavTimer);
		autoNavTimer = null;
	}
	state.autoNav.isActive = false;
};

// Mouse Event Handlers
const handleMouseMove = (): void => {
	if (!state.ui.isVisible) {
		showUI();
	} else {
		resetUITimer();
	}
};

const handleResize = (event: MouseEvent, minWidth: number, maxWidth: number): void => {
	setResizing(true);
	event.preventDefault();

	const handleMouseMove = (e: MouseEvent): void => {
		if (!state.ui.isResizing) return;

		const containerWidth = window.innerWidth;
		const newWidth = containerWidth - e.clientX;

		if (minWidth <= newWidth && newWidth <= maxWidth) {
			setInfoPanelWidth(newWidth);
		}
	};

	const handleMouseUp = (): void => {
		setResizing(false);
		document.removeEventListener('mousemove', handleMouseMove);
		document.removeEventListener('mouseup', handleMouseUp);
	};

	document.addEventListener('mousemove', handleMouseMove);
	document.addEventListener('mouseup', handleMouseUp);
};

// Cleanup
const cleanup = (): void => {
	// Clear UI timer
	if (uiTimer !== null) {
		clearTimeout(uiTimer);
		uiTimer = null;
	}
	// Stop auto navigation
	stopAutoNavigation();
};

const reset = (): void => {
	cleanup();
	// Reset to initial state
	state.imageState = {
		imageUrl: INITIAL_VIEWER_STATE.imageState.imageUrl,
		isLoading: INITIAL_VIEWER_STATE.imageState.isLoading,
		error: INITIAL_VIEWER_STATE.imageState.error
	};
	state.ui = {
		isVisible: INITIAL_VIEWER_STATE.ui.isVisible,
		isInfoPanelVisible: INITIAL_VIEWER_STATE.ui.isInfoPanelVisible,
		isInfoPanelFocused: INITIAL_VIEWER_STATE.ui.isInfoPanelFocused,
		infoPanelWidth: INITIAL_VIEWER_STATE.ui.infoPanelWidth,
		isResizing: INITIAL_VIEWER_STATE.ui.isResizing
	};
	state.autoNav = {
		isActive: INITIAL_VIEWER_STATE.autoNav.isActive
	};
};

export const viewerStore = {
	state: state as ViewerState,
	actions: {
		loadImage,
		toggleInfoPanel,
		setInfoPanelFocus,
		setInfoPanelWidth,
		setResizing,
		showUI,
		hideUI,
		resetUITimer,
		startAutoNavigation,
		stopAutoNavigation,
		handleMouseMove,
		handleResize,
		cleanup,
		reset
	}
};
