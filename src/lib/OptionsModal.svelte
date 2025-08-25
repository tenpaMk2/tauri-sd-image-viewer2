<script lang="ts">
	import * as imageActions from '$lib/services/image-actions';
	import { gridUiStore } from '$lib/stores/grid-ui-store.svelte';
	import { toastStore } from '$lib/stores/toast-store.svelte';
	import Icon from '@iconify/svelte';

	const { state: gridUiState, actions: gridUiActions } = gridUiStore;

	const optionsModalVisible = $derived(gridUiState.optionsModalVisible);
</script>

{#if optionsModalVisible}
	<div class="modal-open modal">
		<div class="modal-box">
			<h3 class="mb-4 text-lg font-bold">Options</h3>

			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<div>
						<div class="font-medium">Clear Thumbnail Cache</div>
						<div class="text-sm opacity-70">Remove all cached thumbnails to free up disk space</div>
					</div>
					<button
						class="btn btn-outline btn-sm"
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
			</div>

			<div class="modal-action">
				<button class="btn" onclick={() => gridUiActions.toggleOptionsModal()}>Close</button>
			</div>
		</div>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="modal-backdrop" onclick={() => gridUiActions.toggleOptionsModal()}></div>
	</div>
{/if}
