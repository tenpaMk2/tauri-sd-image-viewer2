<script lang="ts">
	import { lastViewedImageStore } from '$lib/components/app/last-viewed-image-store.svelte';
	import type { ThumbnailStore } from '$lib/components/grid/thumbnail-store.svelte';
	import type { MetadataStore } from '$lib/components/metadata/metadata-store.svelte';
	import RatingComponent from '$lib/components/metadata/RatingComponent.svelte';
	import { navigateToViewer } from '$lib/services/app-navigation';
	import { getContext } from 'svelte';
	import {
		DIRECTORY_IMAGE_PATHS_CONTEXT,
		type DirectoryImagePathsContext,
	} from './directory-image-paths';
	import { SCROLL_TARGET_CONTEXT, type ScrollTargetContext } from './scroll-target';
	import { SELECTION_CONTEXT, type SelectionContext } from './selection';
	import Thumbnail from './Thumbnail.svelte';

	type Props = {
		imagePath: string;
		thumbnailStore: ThumbnailStore;
		metadataStore: MetadataStore;
	};

	let { imagePath, thumbnailStore, metadataStore }: Props = $props();
	let buttonElement: HTMLButtonElement;
	const directoryImagePathsContext = $derived(
		getContext<() => DirectoryImagePathsContext>(DIRECTORY_IMAGE_PATHS_CONTEXT)(),
	);
	const imagePaths = $derived(directoryImagePathsContext.state.imagePaths);
	const selectionContext = $derived(getContext<() => SelectionContext>(SELECTION_CONTEXT)());
	const scrollTargetContext = $derived(
		getContext<() => ScrollTargetContext>(SCROLL_TARGET_CONTEXT)(),
	);

	const selected = $derived(selectionContext.state.selectedImagePaths.has(imagePath));

	const handleImageClick = (event: MouseEvent): void => {
		console.log(
			'Click detected:',
			imagePath,
			'ctrlKey:',
			event.ctrlKey,
			'metaKey:',
			event.metaKey,
			'shiftKey:',
			event.shiftKey,
		);

		const currentIndex = imagePaths.indexOf(imagePath);

		if (event.shiftKey && selectionContext.state.lastSelectedIndex !== null) {
			// Shift+クリック: 範囲選択
			const startIndex = Math.min(selectionContext.state.lastSelectedIndex, currentIndex);
			const endIndex = Math.max(selectionContext.state.lastSelectedIndex, currentIndex);

			selectionContext.actions.selectRange(startIndex, endIndex, imagePaths);
			console.log('Range selection from', startIndex, 'to', endIndex);
		} else if (event.ctrlKey || event.metaKey) {
			// Ctrl/Cmd+クリック: 複数選択切り替え
			if (selectionContext.state.selectedImagePaths.has(imagePath)) {
				selectionContext.actions.delete(imagePath);
				console.log('Removed from selection:', imagePath);
			} else {
				selectionContext.actions.add(imagePath, currentIndex);
				console.log('Added to selection:', imagePath);
			}
		} else {
			// 通常クリック
			if (
				selectionContext.state.selectedImagePaths.size === 1 &&
				selectionContext.state.selectedImagePaths.has(imagePath)
			) {
				// 選択されたアイテムを再選択: 全解除
				selectionContext.actions.clear();
				console.log('Deselected all');
			} else {
				// 単一選択
				selectionContext.actions.clear();
				selectionContext.actions.add(imagePath, currentIndex);
				console.log('Single selection:', imagePath);
			}
		}
		console.log('Current selection size:', selectionContext.state.selectedImagePaths.size);
	};

	$effect(() => {
		if (buttonElement && lastViewedImageStore.state?.imagePath === imagePath) {
			scrollTargetContext.actions.setTargetElement(buttonElement);
		}
	});
</script>

<button
	bind:this={buttonElement}
	class={[
		'group relative aspect-square overflow-hidden rounded-lg bg-gray-700 transition-all focus:outline-none',
		selected
			? 'shadow-xl ring-2 ring-primary hover:ring-4 hover:ring-primary hover:ring-offset-2 hover:ring-offset-base-100'
			: 'hover:shadow-lg hover:ring-2 hover:ring-primary hover:ring-offset-2 hover:ring-offset-base-100',
	]}
	onclick={handleImageClick}
	ondblclick={() => navigateToViewer(imagePath)}
	title={imagePath.split('/').pop()}
>
	<Thumbnail {thumbnailStore} {imagePath} />

	<!-- Rating overlay -->
	<div class="leftpointer-events-auto absolute bottom-1 left-1/2 -translate-x-1/2">
		<RatingComponent {imagePath} {metadataStore} />
	</div>
</button>
