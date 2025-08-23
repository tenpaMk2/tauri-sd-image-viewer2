<script lang="ts">
	import GridPage from '$lib/GridPage.svelte';
	import Toast from '$lib/Toast.svelte';
	import ViewerPage from '$lib/ViewerPage.svelte';
	import WelcomeScreen from '$lib/WelcomeScreen.svelte';
	import { dragAndDropService } from '$lib/services/drag-and-drop-service';
	import { appStore } from '$lib/stores/app-store.svelte';
	import { getCurrentWebview } from '@tauri-apps/api/webview';
	import { onMount } from 'svelte';

	// ドラッグ&ドロップハンドラー
	const handleDroppedPaths = async (paths: string[]) => {
		const result = await dragAndDropService.handleDroppedPaths(paths);

		if (!result) return;

		switch (result.kind) {
			case 'file':
				await appStore.actions.transitionToViewer(result.path);
				break;

			case 'directory':
				await appStore.actions.transitionToGrid(result.path);
				break;
		}
	};

	onMount(() => {
		const setupDragDrop = async () => {
			const webview = getCurrentWebview();
			const unlisten = await webview.onDragDropEvent((event) => {
				if (event.payload.type !== 'drop' || (event.payload.paths ?? []).length === 0) {
					return;
				}
				handleDroppedPaths(event.payload.paths);
			});

			return unlisten;
		};

		let unlistenPromise: Promise<() => void> | null = null;

		unlistenPromise = setupDragDrop();

		return () => {
			if (unlistenPromise) {
				unlistenPromise.then((unlisten) => unlisten());
			}
		};
	});
</script>

<svelte:head>
	<title>Image Viewer</title>
</svelte:head>

<div class="min-h-screen bg-base-100">
	<main class="h-screen">
		{#if appStore.state.viewMode === 'welcome'}
			<WelcomeScreen />
		{:else if appStore.state.viewMode === 'grid'}
			<GridPage />
		{:else if appStore.state.viewMode === 'viewer'}
			<ViewerPage />
		{/if}
	</main>

	<!-- Toast Display -->
	<Toast />
</div>
