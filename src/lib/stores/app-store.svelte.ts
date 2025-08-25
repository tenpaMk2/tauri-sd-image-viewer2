type ViewMode = 'welcome' | 'grid' | 'viewer';

type MutableAppState = {
	viewMode: ViewMode;
};

export type AppState = Readonly<MutableAppState>;

const INITIAL_APP_STATE: MutableAppState = {
	viewMode: 'welcome',
};

const _state = $state<MutableAppState>({ ...INITIAL_APP_STATE });

const _transitionTo = async (newViewMode: ViewMode): Promise<void> => {
	const currentMode = _state.viewMode;
	console.log(`🔄 State transition: ${currentMode} -> ${newViewMode}`);
	_state.viewMode = newViewMode;
};

/**
 * モード遷移API - Welcome画面への遷移
 */
const transitionToWelcome = async (): Promise<void> => {
	_transitionTo('welcome');
};

/**
 * モード遷移API - Grid表示への遷移
 */
const transitionToGrid = async (): Promise<void> => {
	_transitionTo('grid');
};

/**
 * モード遷移API - Viewer表示への遷移
 */
const transitionToViewer = async (): Promise<void> => {
	_transitionTo('viewer');
};

export const appStore = {
	state: _state as AppState,
	actions: {
		transitionToWelcome,
		transitionToGrid,
		transitionToViewer,
	},
};
