<script lang="ts">
	import IconTextButton from '$lib/components/ui/IconTextButton.svelte';
	import { toastStore } from '$lib/components/ui/toast-store.svelte';
	import { invoke } from '@tauri-apps/api/core';

	type Props = {
		isOptionsModalOpen: boolean;
		onClose: () => void;
	};

	let { isOptionsModalOpen, onClose }: Props = $props();
	let optionsModal: HTMLDialogElement;

	$effect(() => {
		if (isOptionsModalOpen) {
			optionsModal.showModal();
		} else {
			optionsModal.close();
		}
	});

	const clearThumbnailCache = async () => {
		try {
			console.log('Clearing thumbnail cache...');
			await invoke('clear_thumbnail_cache');
			toastStore.actions.showSuccessToast('Thumbnail cache cleared successfully');
			console.log('Thumbnail cache cleared successfully');
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			toastStore.actions.showErrorToast(`Failed to clear thumbnail cache: ${errorMessage}`);
			console.error('Failed to clear thumbnail cache:', errorMessage);
		}
	};

	const clearMetadataCache = async () => {
		try {
			console.log('Clearing metadata cache...');
			const result = await invoke<string>('clear_metadata_cache');
			toastStore.actions.showSuccessToast('Metadata cache cleared successfully');
			console.log('Metadata cache cleared successfully: ' + result);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			toastStore.actions.showErrorToast(`Failed to clear metadata cache: ${errorMessage}`);
			console.error('Failed to clear metadata cache:', errorMessage);
		}
	};

	const clearAllCaches = async () => {
		await clearThumbnailCache();
		await clearMetadataCache();
	};
</script>

<dialog bind:this={optionsModal} class="modal select-text" onclose={onClose}>
	<div class="modal-box w-11/12 max-w-3xl">
		<h3 class="mb-6 text-xl font-bold">Options</h3>

		<div class="grid gap-6">
			<div class="grid grid-cols-[1fr_auto] items-center gap-4">
				<div class="space-y-1">
					<div class="text-base font-medium">Clear Thumbnail Cache</div>
					<div class="text-sm opacity-70">Remove all cached thumbnails to free up disk space</div>
				</div>
				<IconTextButton
					text="Clear"
					icon="image"
					size="medium"
					variant="outline"
					onClick={clearThumbnailCache}
				/>
			</div>

			<div class="grid grid-cols-[1fr_auto] items-center gap-4">
				<div class="space-y-1">
					<div class="text-base font-medium">Clear Metadata Cache</div>
					<div class="text-sm opacity-70">
						Remove all cached metadata to refresh image information
					</div>
				</div>
				<IconTextButton
					text="Clear"
					icon="database"
					size="medium"
					variant="outline"
					onClick={clearMetadataCache}
				/>
			</div>

			<div class="divider my-2"></div>

			<div class="grid grid-cols-[1fr_auto] items-center gap-4">
				<div class="space-y-1">
					<div class="text-base font-medium">Clear All Caches</div>
					<div class="text-sm opacity-70">Remove both thumbnail and metadata caches</div>
				</div>
				<IconTextButton
					text="Clear All"
					icon="trash-2"
					size="medium"
					variant="error"
					extraClass="btn-outline"
					onClick={clearAllCaches}
				/>
			</div>
		</div>

		<div class="modal-action">
			<IconTextButton text="Close" variant="ghost" onClick={onClose} />
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
