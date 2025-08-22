export type ToastType = 'success' | 'info' | 'warning' | 'error';

export type Toast = {
	id: string;
	message: string;
	type: ToastType;
	duration?: number;
};

type MutableToastState = {
	toasts: Toast[];
};

export type ToastState = Readonly<MutableToastState>;

export type ToastActions = {
	showToast: (message: string, type?: ToastType, duration?: number) => void;
	removeToast: (id: string) => void;
	showSuccessToast: (message: string, duration?: number) => void;
	showInfoToast: (message: string, duration?: number) => void;
	showWarningToast: (message: string, duration?: number) => void;
	showErrorToast: (message: string, duration?: number) => void;
};

const INITIAL_TOAST_STATE: MutableToastState = {
	toasts: []
};

let state = $state<MutableToastState>({
	toasts: []
});

let toastIdCounter = 0;

const generateToastId = (): string => {
	return `toast-${++toastIdCounter}-${Date.now()}`;
};

const showToast = (message: string, type: ToastType = 'info', duration: number = 3000): void => {
	const id = generateToastId();
	const toast: Toast = { id, message, type, duration };

	state.toasts = [...state.toasts, toast];

	// 自動削除タイマー
	if (0 < duration) {
		setTimeout(() => {
			removeToast(id);
		}, duration);
	}
};

const removeToast = (id: string): void => {
	state.toasts = state.toasts.filter((toast) => toast.id !== id);
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
	state: state as ToastState,
	actions: {
		showToast,
		removeToast,
		showSuccessToast,
		showInfoToast,
		showWarningToast,
		showErrorToast
	}
};
