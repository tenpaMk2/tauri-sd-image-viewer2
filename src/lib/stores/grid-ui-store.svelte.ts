type MutableGridUiState = {
	filterPanelVisible: boolean;
	filteredImageCount: number;
	optionsModalVisible: boolean;
};

export type GridUiState = Readonly<MutableGridUiState>;

const INITIAL_GRID_UI_STATE: MutableGridUiState = {
	filterPanelVisible: false,
	filteredImageCount: 0,
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

const setFilteredImageCount = (count: number) => {
	_state.filteredImageCount = count;
};

const reset = () => {
	_state.filterPanelVisible = INITIAL_GRID_UI_STATE.filterPanelVisible;
	_state.filteredImageCount = INITIAL_GRID_UI_STATE.filteredImageCount;
	_state.optionsModalVisible = INITIAL_GRID_UI_STATE.optionsModalVisible;
};

export const gridUiStore = {
	state: _state as GridUiState,
	actions: {
		toggleFilterPanel,
		toggleOptionsModal,
		closeOptionsModal,
		setFilteredImageCount,
		reset,
	},
};
