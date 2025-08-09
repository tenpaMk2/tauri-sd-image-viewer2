<script lang="ts">
	import GridPage from '$lib/GridPage.svelte';
	import Toast from '$lib/Toast.svelte';
	import ViewerPage from '$lib/ViewerPage.svelte';
	import WelcomeScreen from '$lib/WelcomeScreen.svelte';
	import { appStore } from '$lib/stores/app-store';
	import { getCurrentWebview } from '@tauri-apps/api/webview';
	import { onMount } from 'svelte';

	$: state = $appStore;
	const { actions } = appStore;

	onMount(() => {
		const setupDragDrop = async () => {
			const webview = getCurrentWebview();
			const unlisten = await webview.onDragDropEvent((event) => {
				if (event.payload.type === 'drop' && event.payload.paths?.length > 0) {
					actions.handleDroppedPaths(event.payload.paths);
				}
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
		{:else if state.viewMode === 'viewer' && state.imageMetadata && state.selectedImagePath}
			<ViewerPage
				metadata={state.imageMetadata}
				imagePath={state.selectedImagePath}
				onImageChange={actions.handleImageChange}
				openFileDialog={actions.openFileDialog}
				onSwitchToGrid={state.selectedDirectory ? actions.handleSwitchToGrid : undefined}
				refreshMetadata={actions.refreshCurrentImageMetadata}
			/>
		{/if}
	</main>

	<!-- Toast Display -->
	<Toast />
</div>
