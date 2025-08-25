<script lang="ts">
	import GridPage from '$lib/GridPage.svelte';
	import { transitionToGrid, transitionToViewer } from '$lib/services/app-transitions';
	import { dragAndDropService } from '$lib/services/drag-and-drop';
	import { appStore } from '$lib/stores/app-store.svelte';
	import Toast from '$lib/Toast.svelte';
	import ViewerPage from '$lib/ViewerPage.svelte';
	import WelcomeScreen from '$lib/WelcomeScreen.svelte';
	import { getCurrentWebview } from '@tauri-apps/api/webview';
	import { onMount } from 'svelte';

	const { state: appState } = appStore;

	// ドラッグ&ドロップハンドラー
	const handleDroppedPaths = async (paths: string[]) => {
		const result = await dragAndDropService.handleDroppedPaths(paths);

		if (!result) return;

		switch (result.kind) {
			case 'file':
				transitionToViewer(result.path);
				break;

			case 'directory':
				transitionToGrid(result.path);
				break;
		}
	};

	onMount(() => {
		const setupDragDrop = async () => {
			const webview = getCurrentWebview();
			return await webview.onDragDropEvent((event) => {
				if (event.payload.type !== 'drop' || (event.payload.paths ?? []).length === 0) {
					return;
				}
				handleDroppedPaths(event.payload.paths);
			});
		};

		const unlistenPromise: Promise<() => void> = setupDragDrop();

		return () => {
			unlistenPromise.then((unlisten) => unlisten());
		};
	});
</script>

<svelte:head>
	<title>Image Viewer</title>
</svelte:head>

<div class="min-h-screen bg-base-100">
	<main class="h-screen">
		{#if appState.viewMode === 'welcome'}
			<WelcomeScreen />
		{:else if appState.viewMode === 'grid'}
			<GridPage />
		{:else if appState.viewMode === 'viewer'}
			<ViewerPage />
		{/if}
	</main>

	<Toast />
</div>
