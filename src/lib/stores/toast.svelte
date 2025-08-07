<script lang="ts" module>
	export type ToastType = 'success' | 'info' | 'warning' | 'error';

	export type Toast = {
		id: string;
		message: string;
		type: ToastType;
		duration?: number;
	};

	let toasts = $state<Toast[]>([]);
	let toastIdCounter = 0;

	const generateToastId = (): string => {
		return `toast-${++toastIdCounter}-${Date.now()}`;
	};

	export const showToast = (message: string, type: ToastType = 'info', duration: number = 3000): void => {
		const id = generateToastId();
		const toast: Toast = { id, message, type, duration };
		
		toasts = [...toasts, toast];
		
		// 自動削除タイマー
		if (0 < duration) {
			setTimeout(() => {
				removeToast(id);
			}, duration);
		}
	};

	export const removeToast = (id: string): void => {
		toasts = toasts.filter(toast => toast.id !== id);
	};

	export const getToasts = () => toasts;

	// 便利関数
	export const showSuccessToast = (message: string, duration?: number): void => {
		showToast(message, 'success', duration);
	};

	export const showInfoToast = (message: string, duration?: number): void => {
		showToast(message, 'info', duration);
	};

	export const showWarningToast = (message: string, duration?: number): void => {
		showToast(message, 'warning', duration);
	};

	export const showErrorToast = (message: string, duration?: number): void => {
		showToast(message, 'error', duration);
	};
</script>