<script lang="ts">
	import type { ThumbnailStore } from '$lib/components/grid/thumbnail-store.svelte';
	import { navigateToViewer } from '$lib/services/app-navigation';
	import { getContext } from 'svelte';
	import Thumbnail from './Thumbnail.svelte';
	import { SELECTION_STATE, type SelectionState } from './selection';

	type Props = {
		imagePath: string;
		thumbnailStore: ThumbnailStore;
	};

	let { imagePath, thumbnailStore }: Props = $props();
	const imagePaths = $derived(getContext<() => string[]>('imagePaths')());
	const selectionState = $derived(getContext<() => SelectionState>(SELECTION_STATE)());

	const selected = $derived(selectionState.selectedImagePaths.has(imagePath));

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

		if (event.shiftKey && selectionState.lastSelectedIndex !== null) {
			// Shift+クリック: 範囲選択
			const startIndex = Math.min(selectionState.lastSelectedIndex, currentIndex);
			const endIndex = Math.max(selectionState.lastSelectedIndex, currentIndex);

			for (let i = startIndex; i <= endIndex; i++) {
				selectionState.selectedImagePaths.add(imagePaths[i]);
			}
			console.log('Range selection from', startIndex, 'to', endIndex);
		} else if (event.ctrlKey || event.metaKey) {
			// Ctrl/Cmd+クリック: 複数選択切り替え
			if (selectionState.selectedImagePaths.has(imagePath)) {
				selectionState.selectedImagePaths.delete(imagePath);
				console.log('Removed from selection:', imagePath);
			} else {
				selectionState.selectedImagePaths.add(imagePath);
				console.log('Added to selection:', imagePath);
			}
			selectionState.lastSelectedIndex = currentIndex;
		} else {
			// 通常クリック
			if (
				selectionState.selectedImagePaths.size === 1 &&
				selectionState.selectedImagePaths.has(imagePath)
			) {
				// 選択されたアイテムを再選択: 全解除
				selectionState.selectedImagePaths.clear();
				selectionState.lastSelectedIndex = null;
				console.log('Deselected all');
			} else {
				// 単一選択
				selectionState.selectedImagePaths.clear();
				selectionState.selectedImagePaths.add(imagePath);
				selectionState.lastSelectedIndex = currentIndex;
				console.log('Single selection:', imagePath);
			}
		}
		console.log('Current selection size:', selectionState.selectedImagePaths.size);
	};
</script>

<button
	class={[
		'group aspect-square overflow-hidden rounded-lg bg-gray-700 transition-all focus:outline-none',
		selected
			? 'shadow-xl ring-2 ring-primary hover:ring-4 hover:ring-primary hover:ring-offset-2 hover:ring-offset-base-100'
			: 'hover:shadow-lg hover:ring-2 hover:ring-primary hover:ring-offset-2 hover:ring-offset-base-100',
	]}
	data-image-path={imagePath}
	onclick={handleImageClick}
	ondblclick={() => navigateToViewer(imagePath)}
	title={imagePath.split('/').pop()}
>
	<Thumbnail {thumbnailStore} {imagePath} />
</button>
