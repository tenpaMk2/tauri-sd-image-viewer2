export type MetadataPanelState = {
	isVisible: boolean;
	isFocused: boolean;
	width: number;
	isResizing: boolean;
};

export type MetadataPanelStoreState = Readonly<MetadataPanelState>;

const INITIAL_METADATA_PANEL_STATE: MetadataPanelState = {
	isVisible: true,
	isFocused: false,
	width: 320,
	isResizing: false,
};

const _state = $state<MetadataPanelState>({ ...INITIAL_METADATA_PANEL_STATE });

// Panel Controls
const toggle = (): void => {
	_state.isVisible = !_state.isVisible;
};

const setFocus = (focused: boolean): void => {
	_state.isFocused = focused;
};

const setWidth = (width: number): void => {
	_state.width = width;
};

const setResizing = (isResizing: boolean): void => {
	_state.isResizing = isResizing;
};

const show = (): void => {
	_state.isVisible = true;
};

const hide = (): void => {
	_state.isVisible = false;
};

// Resize handling
const handleResize = (event: MouseEvent, minWidth: number, maxWidth: number): void => {
	setResizing(true);
	event.preventDefault();

	const handleMouseMove = (e: MouseEvent): void => {
		if (!_state.isResizing) return;

		const containerWidth = window.innerWidth;
		const newWidth = containerWidth - e.clientX;

		if (minWidth <= newWidth && newWidth <= maxWidth) {
			setWidth(newWidth);
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

const reset = (): void => {
	_state.isVisible = INITIAL_METADATA_PANEL_STATE.isVisible;
	_state.isFocused = INITIAL_METADATA_PANEL_STATE.isFocused;
	_state.width = INITIAL_METADATA_PANEL_STATE.width;
	_state.isResizing = INITIAL_METADATA_PANEL_STATE.isResizing;
};

export const metadataPanelStore = {
	state: _state as MetadataPanelStoreState,
	deriveds: {},
	actions: {
		toggle,
		setFocus,
		setWidth,
		setResizing,
		show,
		hide,
		handleResize,
		reset,
	},
};
