import { thumbnailQueue } from '$lib/services/thumbnail-queue';
import { createThumbnailStore } from '$lib/stores/thumbnail-store.svelte';
import { createRegistry, type RegistryLogger } from '$lib/utils/base-registry';

const thumbnailLogger: RegistryLogger = {
	onClearUnused: (removedCount: number) => {
		console.log('🗑️ Cleared ' + removedCount + ' unused thumbnail entries');
	},
	onClearAll: () => {
		console.log('🗑️ All thumbnails cleared');
	},
};

export const thumbnailRegistry = createRegistry(
	createThumbnailStore,
	thumbnailQueue,
	thumbnailLogger
);
