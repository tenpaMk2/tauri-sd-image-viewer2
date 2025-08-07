<script lang="ts">
	import Icon from '@iconify/svelte';
	import { getToasts, removeToast } from './stores/toast.svelte';

	const toasts = $derived(getToasts());

	const getToastIcon = (type: string): string => {
		switch (type) {
			case 'success':
				return 'lucide:check-circle';
			case 'warning':
				return 'lucide:alert-triangle';
			case 'error':
				return 'lucide:x-circle';
			case 'info':
			default:
				return 'lucide:info';
		}
	};

	const getToastClass = (type: string): string => {
		switch (type) {
			case 'success':
				return 'alert-success';
			case 'warning':
				return 'alert-warning';
			case 'error':
				return 'alert-error';
			case 'info':
			default:
				return 'alert-info';
		}
	};
</script>

<div class="toast toast-bottom toast-end z-50">
	{#each toasts as toast (toast.id)}
		<div class="alert {getToastClass(toast.type)} shadow-lg min-w-64">
			<Icon icon={getToastIcon(toast.type)} class="h-5 w-5" />
			<span class="text-sm">{toast.message}</span>
			<button
				class="btn btn-ghost btn-xs"
				onclick={() => removeToast(toast.id)}
				title="閉じる"
			>
				<Icon icon="lucide:x" class="h-3 w-3" />
			</button>
		</div>
	{/each}
</div>