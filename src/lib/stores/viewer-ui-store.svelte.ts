export type ViewerUIState = {
	isVisible: boolean;
	isAutoNavActive: boolean;
};

export type ViewerUIStoreState = Readonly<ViewerUIState>;

const INITIAL_VIEWER_UI_STATE: ViewerUIState = {
	isVisible: true,
	isAutoNavActive: false,
};

let state = $state<ViewerUIState>({ ...INITIAL_VIEWER_UI_STATE });

// Timer management
let uiTimer: number | null = null;
let autoNavTimer: number | null = null;

// UI Controls
const showUI = (): void => {
	state.isVisible = true;
	resetUITimer();
};

const hideUI = (): void => {
	state.isVisible = false;
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
	if (state.isAutoNavActive) {
		stopAutoNavigation();
	} else {
		state.isAutoNavActive = true;
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
	state.isAutoNavActive = false;
};

// Mouse Event Handlers
const handleMouseMove = (): void => {
	if (!state.isVisible) {
		showUI();
	} else {
		resetUITimer();
	}
};

const reset = (): void => {
	// Reset to initial state
	state.isVisible = INITIAL_VIEWER_UI_STATE.isVisible;
	state.isAutoNavActive = INITIAL_VIEWER_UI_STATE.isAutoNavActive;
};

export const viewerUIStore = {
	state: state as ViewerUIStoreState,
	actions: {
		showUI,
		hideUI,
		resetUITimer,
		startAutoNavigation,
		stopAutoNavigation,
		handleMouseMove,
		reset,
	},
};
