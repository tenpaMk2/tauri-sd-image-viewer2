import type { ImageMetadataInfo } from '$lib/types/shared-types';
import { invoke } from '@tauri-apps/api/core';

type MutableMetadataState = ImageMetadataInfo & {};

export type MetadataState = Readonly<MutableMetadataState>;

export type MetadataActions = {
	updateRating: (newRating: number) => Promise<boolean>;
};

export type MetadataStore = {
	state: MetadataState;
	actions: MetadataActions;
};

export const createMetadataStore = async (imagePath: string): Promise<MetadataStore> => {
	try {
		const metadata = await invoke<ImageMetadataInfo>('read_image_metadata', {
			path: imagePath,
		});

		const updateRating = async (newRating: number): Promise<boolean> => {
			try {
				// Rust側でRating更新
				await invoke('write_xmp_image_rating', {
					srcPath: imagePath,
					rating: newRating,
				});

				return true;
			} catch (error) {
				return false;
			}
		};

		return {
			state: metadata,
			actions: {
				updateRating,
			},
		};
	} catch (error) {
		console.error('Failed to load image metadata: ', error);
		throw new Error(`Failed to load image metadata: ${imagePath}`);
	}
};
