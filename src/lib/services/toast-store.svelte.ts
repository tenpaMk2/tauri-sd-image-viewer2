export type ToastType = 'success' | 'info' | 'warning' | 'error';

type Toast = {
	id: string;
	message: string;
	type: ToastType;
	duration?: number;
};

type MutableToastState = {
	toasts: Toast[];
	idCounter: number;
};

export type ToastState = Readonly<MutableToastState>;

const INITIAL_TOAST_STATE: ToastState = {
	toasts: [],
	idCounter: 0,
};

const _state = $state<MutableToastState>({ ...INITIAL_TOAST_STATE });

const generateToastId = (): string => {
	return `toast-${++_state.idCounter}-${Date.now()}`;
};

const showToast = (message: string, type: ToastType = 'info', duration: number = 3000): void => {
	const id = generateToastId();
	const toast: Toast = { id, message, type, duration };

	_state.toasts = [..._state.toasts, toast];

	if (0 < duration) {
		setTimeout(() => {
			removeToast(id);
		}, duration);
	}
};

const removeToast = (id: string): void => {
	_state.toasts = _state.toasts.filter((toast) => toast.id !== id);
};

const showSuccessToast = (message: string, duration?: number): void => {
	showToast(message, 'success', duration);
};

const showInfoToast = (message: string, duration?: number): void => {
	showToast(message, 'info', duration);
};

const showWarningToast = (message: string, duration?: number): void => {
	showToast(message, 'warning', duration);
};

const showErrorToast = (message: string, duration?: number): void => {
	showToast(message, 'error', duration);
};

export const toastStore = {
	state: _state as ToastState,
	actions: {
		removeToast,
		showSuccessToast,
		showInfoToast,
		showWarningToast,
		showErrorToast,
	},
};
