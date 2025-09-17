<script lang="ts">
	import Toast from '$lib/components/ui/Toast.svelte';
	import { navigateToGrid, navigateToViewer } from '$lib/services/app-navigation';
	import { dragAndDropService, type DragAndDropResult } from '$lib/services/drag-and-drop';
	import { initializeLogger } from '$lib/services/logger';
	import { onMount } from 'svelte';
	import '../app.css';
	import type { LayoutProps } from './$types';

	// onMountではなく、スクリプト実行時すぐに初期化
	initializeLogger();

	const { children }: LayoutProps = $props();

	onMount(() => {
		// ↓のログはロガーの初期化前に終わるのでログに出ない。
		console.log('💐Setting up drag & drop functionality');

		let unlistenDragDrop: (() => void) | null = null;

		dragAndDropService
			.setupDragDropListener((result: DragAndDropResult) => {
				console.log('Drag & drop result:', result);

				switch (result.kind) {
					case 'file':
						navigateToViewer(result.path);
						break;
					case 'directory':
						navigateToGrid(result.path);
						break;
				}
			})
			.then((unlisten) => {
				unlistenDragDrop = unlisten;
			});

		// Cleanup function
		return () => {
			console.log('Cleaning up drag & drop listener');
			unlistenDragDrop?.();
		};
	});
</script>

<div class="h-screen min-h-screen bg-base-200 select-none">
	{@render children()}
</div>

<Toast />
