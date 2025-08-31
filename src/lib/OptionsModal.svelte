<script lang="ts">
	import * as imageActions from '$lib/services/image-actions';
	import { gridUiStore } from '$lib/stores/grid-ui-store.svelte';
	import { toastStore } from '$lib/stores/toast-store.svelte';
	import Icon from '@iconify/svelte';

	const { state: gridUiState, actions: gridUiActions } = gridUiStore;

	let dialog: HTMLDialogElement;

	$effect(() => {
		if (gridUiState.optionsModalVisible && dialog) {
			dialog.showModal();
		} else if (!gridUiState.optionsModalVisible && dialog) {
			dialog.close();
		}
	});
</script>

<dialog bind:this={dialog} class="modal">
	<div class="modal-box">
		<h3 class="mb-4 text-lg font-bold">Options</h3>

		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<div>
					<div class="font-medium">Clear Thumbnail Cache</div>
					<div class="text-sm opacity-70">Remove all cached thumbnails.</div>
				</div>
				<button
					class="btn btn-sm btn-secondary"
					onclick={() =>
						imageActions.clearThumbnailCache(
							(message: string) => toastStore.actions.showSuccessToast(message),
							(message: string) => toastStore.actions.showErrorToast(message),
							() => gridUiStore.actions.closeOptionsModal(),
						)}
				>
					<Icon icon="lucide:trash-2" class="h-4 w-4" />
					Clear
				</button>
			</div>

			<div class="flex items-center justify-between">
				<div>
					<div class="font-medium">Clear Metadata Cache</div>
					<div class="text-sm opacity-70">Remove all cached image metadata.</div>
				</div>
				<button
					class="btn btn-sm btn-secondary"
					onclick={() =>
						imageActions.clearMetadataCache(
							(message: string) => toastStore.actions.showSuccessToast(message),
							(message: string) => toastStore.actions.showErrorToast(message),
							() => gridUiStore.actions.closeOptionsModal(),
						)}
				>
					<Icon icon="lucide:database" class="h-4 w-4" />
					Clear
				</button>
			</div>
		</div>

		<div class="modal-action">
			<form method="dialog">
				<button class="btn" onclick={() => gridUiActions.closeOptionsModal()}>Close</button>
			</form>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button onclick={() => gridUiActions.closeOptionsModal()}>close</button>
	</form>
</dialog>
