<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { toastStore } from '$lib/services/toast-store.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';

	type Props = {
		isOptionsModalOpen: boolean;
		onClose: () => void;
	};

	let { isOptionsModalOpen, onClose }: Props = $props();

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

{#if isOptionsModalOpen}
	<div class="modal-open modal">
		<div class="modal-box">
			<h3 class="mb-4 text-lg font-bold">Options</h3>

			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<div>
						<div class="font-medium">Clear Thumbnail Cache</div>
						<div class="text-sm opacity-70">Remove all cached thumbnails to free up disk space</div>
					</div>
					<IconButton
						icon="image"
						title="Clear thumbnail cache"
						size="small"
						onClick={clearThumbnailCache}
						extraClass="btn-outline"
					/>
				</div>

				<div class="flex items-center justify-between">
					<div>
						<div class="font-medium">Clear Metadata Cache</div>
						<div class="text-sm opacity-70">
							Remove all cached metadata to refresh image information
						</div>
					</div>
					<IconButton
						icon="database"
						title="Clear metadata cache"
						size="small"
						onClick={clearMetadataCache}
						extraClass="btn-outline"
					/>
				</div>

				<div class="divider"></div>

				<div class="flex items-center justify-between">
					<div>
						<div class="font-medium">Clear All Caches</div>
						<div class="text-sm opacity-70">Remove both thumbnail and metadata caches</div>
					</div>
					<IconButton
						icon="trash-2"
						title="Clear all caches"
						size="small"
						onClick={clearAllCaches}
						extraClass="btn-outline btn-warning"
					/>
				</div>
			</div>

			<div class="modal-action">
				<button class="btn" onclick={onClose}>Close</button>
			</div>
		</div>
		<form method="dialog" class="modal-backdrop">
			<button type="button" onclick={onClose}>close</button>
		</form>
	</div>
{/if}
