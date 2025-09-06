<script lang="ts">
	import ToolbarButton from '$lib/components/ui/ToolbarButton.svelte';
	import * as imageActions from '$lib/services/image-actions';
	import { imageSelectionStore } from '$lib/stores/image-selection-store.svelte';
	import { toastStore } from '$lib/stores/toast-store.svelte';

	const { state: imageSelectionState, actions: imageSelectionActions } = imageSelectionStore;
	const { actions: toastActions } = toastStore;

	const selectedImages = $derived(imageSelectionState.selectedImages);
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
				<ToolbarButton
					icon="copy"
					title="Copy to Clipboard"
					onClick={() =>
						imageActions.copyImagesToClipboard(
							Array.from(selectedImages),
							(message: string) => toastActions.showSuccessToast(message),
							(message: string) => toastActions.showErrorToast(message),
						)}
					variant="white"
				/>

				<ToolbarButton
					icon="trash-2"
					title="Delete"
					onClick={async () => {
						const shouldClear = await imageActions.deleteImages(
							Array.from(selectedImages),
							async (count: number) => {
								return confirm(`Delete ${count} images?\n\nDeleted images cannot be restored.`);
							},
							(message: string) => toastActions.showSuccessToast(message),
							(message: string) => toastActions.showWarningToast(message),
							(message: string) => toastActions.showErrorToast(message),
						);
						if (shouldClear) {
							imageSelectionActions.clearSelection();
						}
					}}
					variant="white"
				/>
			</div>
		</div>
	</div>
{/if}
