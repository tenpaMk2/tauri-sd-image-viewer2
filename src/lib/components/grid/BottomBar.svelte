<script lang="ts">
	import { SELECTION_STATE, type SelectionState } from '$lib/components/grid/selection';
	import IconTextButton from '$lib/components/ui/IconTextButton.svelte';
	import { toastStore } from '$lib/components/ui/toast-store.svelte';
	import { copyFiles } from '$lib/services/clipboard';
	import * as fs from '@tauri-apps/plugin-fs';
	import { platform } from '@tauri-apps/plugin-os';
	import { getContext } from 'svelte';

	const selectionState = $derived(getContext<() => SelectionState>(SELECTION_STATE)());
	const selectedPaths = $derived(Array.from(selectionState.selectedImagePaths) as string[]);
	const selectedCount = $derived(selectedPaths.length);

	let deleteConfirmationModal: HTMLDialogElement;

	const handleCopyToClipboard = async () => {
		if (selectedCount === 0) return;

		await copyFiles(selectedPaths);
	};

	const showDeleteConfirmation = () => {
		if (selectedCount === 0) return;

		deleteConfirmationModal.showModal();
	};

	const executeDeleteImages = async () => {
		if (selectedCount === 0) return;

		try {
			for (const imagePath of selectedPaths) {
				await fs.remove(imagePath);
			}

			toastStore.actions.showSuccessToast(`${selectedCount} image(s) deleted successfully`);

			// Clear selection after successful deletion
			selectionState.selectedImagePaths.clear();
			selectionState.lastSelectedIndex = null;
		} catch (error) {
			console.error('Failed to delete images: ' + error);
			toastStore.actions.showErrorToast('Failed to delete images: ' + error);
		} finally {
			deleteConfirmationModal.close();
		}
	};

	const cancelDeleteConfirmation = () => {
		deleteConfirmationModal.close();
	};
</script>

{#if selectedCount > 0}
	<footer class="sticky bottom-0 z-10 flex items-center justify-between bg-base-200 p-4 shadow-lg">
		<div class="flex items-center gap-2">
			<span class="text-sm font-medium text-base-content">
				{selectedCount} file{selectedCount > 1 ? 's' : ''} selected
			</span>
		</div>

		<div class="flex gap-2">
			{#if platform() === 'macos' || platform() === 'windows'}
				<IconTextButton
					text="Copy"
					icon="clipboard-copy"
					size="medium"
					onClick={handleCopyToClipboard}
				/>
			{/if}
			<IconTextButton
				text="Delete"
				icon="trash"
				size="medium"
				variant="error"
				onClick={showDeleteConfirmation}
			/>
		</div>

		<!-- Empty div for centering buttons -->
		<div class="w-20"></div>
	</footer>
{/if}

<!-- Delete Confirmation Modal -->
<dialog bind:this={deleteConfirmationModal} class="modal">
	<div class="modal-box">
		<h3 class="text-lg font-bold">Delete Images</h3>
		<p class="py-4">
			Are you sure you want to delete {selectedCount} image{selectedCount > 1 ? 's' : ''}? This
			action cannot be undone.
		</p>
		<div class="modal-action">
			<button class="btn" onclick={cancelDeleteConfirmation}>Cancel</button>
			<button class="btn btn-error" onclick={executeDeleteImages}>Delete</button>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
