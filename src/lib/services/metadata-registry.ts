import { metadataQueue } from '$lib/services/metadata-queue';
import { createMetadataStore } from '$lib/stores/metadata-store.svelte';
import { createRegistry } from '$lib/utils/base-registry';

export const metadataRegistry = createRegistry(createMetadataStore, metadataQueue);
