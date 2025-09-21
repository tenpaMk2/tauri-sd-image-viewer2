import {
	createMetadataStore,
	type MetadataStore,
} from '$lib/components/metadata/metadata-store.svelte';
import {
	createNavigationStore,
	type NavigationStore,
} from '$lib/components/viewer/navigation-store';
import { imageCacheStore } from '$lib/services/image-cache-store';
import type { PageLoad } from './$types';

export type ViewerPageData = {
	title: string;
	url: string;
	imagePath: string;
	navigationStore: NavigationStore;
	metadataStore: MetadataStore;
};

export const load: PageLoad = async ({ params }): Promise<ViewerPageData> => {
	const imagePath = decodeURIComponent(params.image_path);

	const metadataStore = createMetadataStore(imagePath);
	const url = await imageCacheStore.actions.load(imagePath);
	const navigationStore = await createNavigationStore(imagePath);

	// metadata読み込みを開始（awaitはしない）
	metadataStore.actions.load();

	return {
		title: imagePath,
		url,
		imagePath,
		navigationStore,
		metadataStore,
	};
};
