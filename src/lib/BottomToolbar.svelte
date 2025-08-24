<script lang="ts">
	import { gridStore } from '$lib/stores/grid-store.svelte';
	import Icon from '@iconify/svelte';

	const selectedImages = gridStore.state.selectedImages;
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
					onclick={() => gridStore.actions.copySelectedToClipboard()}
					title="Copy to Clipboard"
				>
					<Icon icon="lucide:copy" class="h-4 w-4" />
				</button>
				<button
					class="btn text-white btn-ghost btn-sm"
					onclick={() => gridStore.actions.deleteSelectedImages()}
					title="Delete"
				>
					<Icon icon="lucide:trash-2" class="h-4 w-4" />
				</button>
			</div>
		</div>
	</div>
{/if}
