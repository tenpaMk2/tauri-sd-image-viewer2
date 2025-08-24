type MutableGridUiState = {
	showFilterPanel: boolean;
	filteredImageCount: number;
	showOptionsModal: boolean;
};

export type GridUiState = Readonly<MutableGridUiState>;

const INITIAL_GRID_UI_STATE: MutableGridUiState = {
	showFilterPanel: false,
	filteredImageCount: 0,
	showOptionsModal: false,
};

let gridUiState = $state<MutableGridUiState>({
	showFilterPanel: false,
	filteredImageCount: 0,
	showOptionsModal: false,
});

const toggleFilterPanel = () => {
	gridUiState.showFilterPanel = !gridUiState.showFilterPanel;
};

const toggleOptionsModal = () => {
	gridUiState.showOptionsModal = !gridUiState.showOptionsModal;
};

const closeOptionsModal = () => {
	gridUiState.showOptionsModal = false;
};

const setFilteredImageCount = (count: number) => {
	gridUiState.filteredImageCount = count;
};

const reset = () => {
	gridUiState.showFilterPanel = INITIAL_GRID_UI_STATE.showFilterPanel;
	gridUiState.filteredImageCount = INITIAL_GRID_UI_STATE.filteredImageCount;
	gridUiState.showOptionsModal = INITIAL_GRID_UI_STATE.showOptionsModal;
};

export const gridUiStore = {
	state: gridUiState as GridUiState,
	actions: {
		toggleFilterPanel,
		toggleOptionsModal,
		closeOptionsModal,
		setFilteredImageCount,
		reset,
	},
};
