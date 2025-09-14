<script lang="ts">
	import { toastStore, type ToastType } from '$lib/services/toast-store.svelte';
	import Icon from '@iconify/svelte';
	import { scale } from 'svelte/transition';

	const { state: toastState } = toastStore;

	const getToastIcon = (type: ToastType): string => {
		switch (type) {
			case 'success':
				return 'lucide:check-circle';
			case 'warning':
				return 'lucide:alert-triangle';
			case 'error':
				return 'lucide:x-circle';
			case 'info':
				return 'lucide:info';
		}
	};

	const getToastClass = (type: ToastType): string => {
		switch (type) {
			case 'success':
				return 'alert-success';
			case 'warning':
				return 'alert-warning';
			case 'error':
				return 'alert-error';
			case 'info':
				return 'alert-info';
		}
	};
</script>

<div class="toast-bottom toast-end toast z-50">
	{#each toastState.toasts as toast (toast.id)}
		<div class="alert {getToastClass(toast.type)} min-w-64 shadow-lg" out:scale>
			<Icon icon={getToastIcon(toast.type)} class="h-5 w-5" />
			<span class="text-sm">{toast.message}</span>
			<button
				class="btn btn-ghost btn-xs"
				onclick={() => toastStore.actions.removeToast(toast.id)}
				title="Close"
			>
				<Icon icon="lucide:x" class="h-3 w-3" />
			</button>
		</div>
	{/each}
</div>
