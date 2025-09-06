import { imageQueue } from '$lib/services/image-queue';
import { createImageStore } from '$lib/stores/image-store.svelte';
import { createRegistry, type RegistryLogger } from '$lib/utils/base-registry';

const imageLogger: RegistryLogger = {
	onClearUnused: (removedCount: number) => {
		console.log('🗑️ Cleared ' + removedCount + ' unused image entries');
	},
	onClearAll: () => {
		console.log('🗑️ All images cleared');
	},
};

export const imageRegistry = createRegistry(
	createImageStore,
	imageQueue,
	imageLogger
);