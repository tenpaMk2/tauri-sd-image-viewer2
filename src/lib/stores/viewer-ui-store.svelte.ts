export type ViewerUIState = {
	isVisible: boolean;
	isAutoNavActive: boolean;
};

export type ViewerUIStoreState = Readonly<ViewerUIState>;

const INITIAL_VIEWER_UI_STATE: ViewerUIState = {
	isVisible: true,
	isAutoNavActive: false,
};

const _state = $state<ViewerUIState>({ ...INITIAL_VIEWER_UI_STATE });

// Timer management
let uiTimer: number | null = null;
let autoNavTimer: number | null = null;

// UI Controls
const showUI = (): void => {
	_state.isVisible = true;
	resetUITimer();
};

const hideUI = (): void => {
	_state.isVisible = false;
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
	if (_state.isAutoNavActive) {
		stopAutoNavigation();
	} else {
		_state.isAutoNavActive = true;
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
	_state.isAutoNavActive = false;
};

// Mouse Event Handlers
const handleMouseMove = (): void => {
	if (_state.isVisible) {
		resetUITimer();
	} else {
		showUI();
	}
};

const reset = (): void => {
	// Reset to initial state
	_state.isVisible = INITIAL_VIEWER_UI_STATE.isVisible;
	_state.isAutoNavActive = INITIAL_VIEWER_UI_STATE.isAutoNavActive;
};

export const viewerUIStore = {
	state: _state as ViewerUIStoreState,
	deriveds: {},
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
