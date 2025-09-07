type MutableGridUiState = {
	filterPanelVisible: boolean;
	optionsModalVisible: boolean;
};

export type GridUiState = Readonly<MutableGridUiState>;

const INITIAL_GRID_UI_STATE: MutableGridUiState = {
	filterPanelVisible: false,
	optionsModalVisible: false,
};

const _state = $state<MutableGridUiState>({ ...INITIAL_GRID_UI_STATE });

const toggleFilterPanel = () => {
	_state.filterPanelVisible = !_state.filterPanelVisible;
};

const toggleOptionsModal = () => {
	_state.optionsModalVisible = !_state.optionsModalVisible;
};

const closeOptionsModal = () => {
	_state.optionsModalVisible = false;
};

const reset = () => {
	_state.filterPanelVisible = INITIAL_GRID_UI_STATE.filterPanelVisible;
	_state.optionsModalVisible = INITIAL_GRID_UI_STATE.optionsModalVisible;
};

export const gridUiStore = {
	state: _state as GridUiState,
	actions: {
		toggleFilterPanel,
		toggleOptionsModal,
		closeOptionsModal,
		reset,
	},
};
