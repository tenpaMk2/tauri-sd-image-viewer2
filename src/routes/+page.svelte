<script lang="ts">
	import GridPage from '$lib/GridPage.svelte';
	import Toast from '$lib/Toast.svelte';
	import ViewerPage from '$lib/ViewerPage.svelte';
	import WelcomeScreen from '$lib/WelcomeScreen.svelte';
	import { appStore } from '$lib/stores/app-store.svelte';
	import { getCurrentWebview } from '@tauri-apps/api/webview';
	import { onMount } from 'svelte';
	const state = $derived(appStore.state);
	const { actions } = appStore;

	// デバッグ用: 状態変更を監視
	$effect(() => {
		console.log(
			'🔍 App state changed: viewMode=' +
				state.viewMode +
				' selectedImagePath=' +
				(state.selectedImagePath ? state.selectedImagePath.split('/').pop() : 'null') +
				' selectedDirectory=' +
				(state.selectedDirectory ? state.selectedDirectory.split('/').pop() : 'null')
		);
		console.log(
			'🔍 Current view condition check: isViewerMode=' +
				(state.viewMode === 'viewer') +
				' hasSelectedImagePath=' +
				!!state.selectedImagePath +
				' shouldShowViewer=' +
				!!(state.viewMode === 'viewer' && state.selectedImagePath)
		);
	});

	onMount(() => {
		const setupDragDrop = async () => {
			const webview = getCurrentWebview();
			const unlisten = await webview.onDragDropEvent((event) => {
				if (event.payload.type !== 'drop' || (event.payload.paths ?? []).length === 0) {
					return;
				}
				actions.handleDroppedPaths(event.payload.paths);
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
		{#if state.viewMode === 'welcome'}
			<WelcomeScreen
				openFileDialog={actions.openFileDialog}
				openDirectoryDialog={actions.openDirectoryDialog}
			/>
		{:else if state.viewMode === 'grid' && state.selectedDirectory}
			<GridPage
				selectedDirectory={state.selectedDirectory}
				handleBackToWelcome={actions.handleBackToWelcome}
				openDirectoryDialog={actions.openDirectoryDialog}
				handleImageSelect={actions.handleImageSelect}
			/>
		{:else if state.viewMode === 'viewer' && state.selectedImagePath}
			<ViewerPage
				imagePath={state.selectedImagePath}
				onImageChange={actions.handleImageChange}
				openFileDialog={actions.openFileDialog}
				onSwitchToGrid={state.selectedDirectory ? actions.handleSwitchToGrid : undefined}
			/>
		{/if}
	</main>

	<!-- Toast Display -->
	<Toast />
</div>
