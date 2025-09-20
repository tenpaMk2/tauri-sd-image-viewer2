import {
	createNavigationStore,
	type NavigationStore,
} from '$lib/components/viewer/navigation-store';
import { imageCacheStore } from '$lib/services/image-cache-store';
import { createMetadataStore, type MetadataStore } from '$lib/services/metadata-store';
import type { PageLoad } from './$types';

export type ViewerPageData = {
	title: string;
	url: string;
	imagePath: string;
	navigationStore: NavigationStore;
	metadataStorePromise: Promise<MetadataStore>;
};

export const load: PageLoad = async ({ params }): Promise<ViewerPageData> => {
	const imagePath = decodeURIComponent(params.image_path);

	const metadataStorePromise = createMetadataStore(imagePath);
	const url = await imageCacheStore.actions.load(imagePath);
	const navigationStore = await createNavigationStore(imagePath);

	return {
		title: imagePath,
		url,
		imagePath,
		navigationStore,
		metadataStorePromise,
	};
};
