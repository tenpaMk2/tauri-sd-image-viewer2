import {
	createMetadataStore,
	type MetadataStore,
} from '$lib/components/metadata/metadata-store.svelte';

export const GRID_METADATA_CONTEXT = Symbol('gridMetadataContext');

type MutableGridMetadataState = {
	metadataStores: Map<string, MetadataStore>;
};

export type GridMetadataState = Readonly<MutableGridMetadataState>;

export type GridMetadataActions = {
	getMetadataStore: (imagePath: string) => MetadataStore | undefined;
	cleanup: () => void;
};

export type GridMetadataContext = {
	state: GridMetadataState;
	actions: GridMetadataActions;
};
