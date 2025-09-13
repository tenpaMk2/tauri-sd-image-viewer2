import { createMetadataStore, type MetadataStore } from '$lib/services/metadata-store';
import { detectImageMimeType, type MimeType } from '$lib/services/mime-type';
import { createNavigationStore, type NavigationStore } from '$lib/services/navigation-store';
import * as fs from '@tauri-apps/plugin-fs';
import type { PageLoad } from './$types';

type ImageData = {
	data: Uint8Array<ArrayBuffer>;
	mimeType: MimeType;
	filePath: string;
};

export type ViewerPageData = {
	title: string;
	urlPromise: Promise<string>;
	imagePath: string;
	navigation: NavigationStore;
	metadataStorePromise: Promise<MetadataStore>;
};

const loadImage = async (imagePath: string): Promise<ImageData> => {
	try {
		const imageData = await fs.readFile(imagePath);
		const detectedMimeType = await detectImageMimeType(imagePath);
		if (!detectedMimeType) {
			throw new Error(`Unsupported image format: ${imagePath}`);
		}
		const mimeType: MimeType = detectedMimeType;

		return {
			data: imageData,
			mimeType,
			filePath: imagePath,
		};
	} catch (error) {
		console.error('Failed to load image: ', error);
		throw new Error(`Failed to load image: ${imagePath}`);
	}
};

const loadImageAsUrl = async (imagePath: string): Promise<string> => {
	const imageData = await loadImage(imagePath);
	const blob = new Blob([imageData.data], { type: imageData.mimeType });
	return URL.createObjectURL(blob);
};

export const load: PageLoad = async ({ params }): Promise<ViewerPageData> => {
	const imagePath = decodeURIComponent(params.image_path);

	const urlPromise = loadImageAsUrl(imagePath);
	const metadataStorePromise = createMetadataStore(imagePath);
	const navigation = await createNavigationStore(imagePath);

	return {
		title: imagePath,
		urlPromise,
		imagePath,
		navigation,
		metadataStorePromise,
	};
};
