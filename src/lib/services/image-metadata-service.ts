import type { ImageMetadata } from '../image/types';
import { createImageMetadata } from '../image/utils';
import type { Result } from '../types/result';
import { Err, Ok, asyncTry } from '../types/result';

export class ImageMetadataService {
	private metadataCache = new Map<string, ImageMetadata>();
	private loadingPromises = new Map<string, Promise<ImageMetadata>>();
	private maxCacheSize = 100;

	async getImageMetadata(imagePath: string): Promise<Result<ImageMetadata, string>> {
		if (this.metadataCache.has(imagePath)) {
			return Ok(this.metadataCache.get(imagePath)!);
		}

		if (this.loadingPromises.has(imagePath)) {
			const result = await asyncTry(() => this.loadingPromises.get(imagePath)!);
			return result;
		}

		const loadingPromise = this.loadAndCacheMetadata(imagePath);
		this.loadingPromises.set(imagePath, loadingPromise);

		try {
			const metadata = await loadingPromise;
			return Ok(metadata);
		} catch (error) {
			return Err(error instanceof Error ? error.message : String(error));
		} finally {
			this.loadingPromises.delete(imagePath);
		}
	}

	async getImageMetadataUnsafe(imagePath: string): Promise<ImageMetadata> {
		if (this.metadataCache.has(imagePath)) {
			return this.metadataCache.get(imagePath)!;
		}

		if (this.loadingPromises.has(imagePath)) {
			return await this.loadingPromises.get(imagePath)!;
		}

		const loadingPromise = this.loadAndCacheMetadata(imagePath);
		this.loadingPromises.set(imagePath, loadingPromise);

		try {
			const metadata = await loadingPromise;
			return metadata;
		} finally {
			this.loadingPromises.delete(imagePath);
		}
	}

	private async loadAndCacheMetadata(imagePath: string): Promise<ImageMetadata> {
		const metadata = await createImageMetadata(imagePath);

		if (this.metadataCache.size >= this.maxCacheSize) {
			this.evictOldestEntries(20);
		}

		this.metadataCache.set(imagePath, metadata);
		return metadata;
	}

	private evictOldestEntries(count: number): void {
		const entries = Array.from(this.metadataCache.entries());
		const toEvict = entries.slice(0, count);

		toEvict.forEach(([path]) => {
			this.metadataCache.delete(path);
		});
	}

	invalidateMetadata(imagePath: string): void {
		this.metadataCache.delete(imagePath);
		this.loadingPromises.delete(imagePath);
	}

	async refreshMetadata(imagePath: string): Promise<Result<ImageMetadata, string>> {
		this.invalidateMetadata(imagePath);
		return await this.getImageMetadata(imagePath);
	}

	async refreshMetadataUnsafe(imagePath: string): Promise<ImageMetadata> {
		this.invalidateMetadata(imagePath);
		return await this.getImageMetadataUnsafe(imagePath);
	}

	clearCache(): void {
		this.metadataCache.clear();
		this.loadingPromises.clear();
	}

	getCacheSize(): number {
		return this.metadataCache.size;
	}

	hasCachedMetadata(imagePath: string): boolean {
		return this.metadataCache.has(imagePath);
	}
}

export const imageMetadataService = new ImageMetadataService();
