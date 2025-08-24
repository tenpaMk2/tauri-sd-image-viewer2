<script lang="ts">
	import * as imageActions from '$lib/services/image-actions';
	import { imageSelectionStore } from '$lib/stores/image-selection-store.svelte';
	import { toastStore } from '$lib/stores/toast-store.svelte';
	import Icon from '@iconify/svelte';

	const selectedImages = imageSelectionStore.state.selectedImages;
</script>

{#if 0 < selectedImages.size}
	<div
		class="fixed right-0 bottom-0 left-0 z-20 border-t border-gray-700 bg-gray-900/95 p-4 backdrop-blur-sm"
	>
		<div class="mx-auto flex max-w-4xl items-center justify-between">
			<div class="text-white">
				{selectedImages.size} images selected
			</div>
			<div class="flex items-center gap-4">
				<button
					class="btn text-white btn-ghost btn-sm"
					onclick={() =>
						imageActions.copyImagesToClipboard(
							Array.from(selectedImages),
							(message: string) => toastStore.actions.showSuccessToast(message),
							(message: string) => toastStore.actions.showErrorToast(message),
						)}
					title="Copy to Clipboard"
				>
					<Icon icon="lucide:copy" class="h-4 w-4" />
				</button>
				<button
					class="btn text-white btn-ghost btn-sm"
					onclick={async () => {
						const shouldClear = await imageActions.deleteImages(
							Array.from(selectedImages),
							async (count: number) => {
								return confirm(`Delete ${count} images?\n\nDeleted images cannot be restored.`);
							},
							(message: string) => toastStore.actions.showSuccessToast(message),
							(message: string) => toastStore.actions.showWarningToast(message),
							(message: string) => toastStore.actions.showErrorToast(message),
						);
						if (shouldClear) {
							imageSelectionStore.actions.clearSelection();
						}
					}}
					title="Delete"
				>
					<Icon icon="lucide:trash-2" class="h-4 w-4" />
				</button>
			</div>
		</div>
	</div>
{/if}
