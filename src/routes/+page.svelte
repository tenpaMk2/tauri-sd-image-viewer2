<script lang="ts">
	import GridPage from '$lib/GridPage.svelte';
	import ViewerPage from '$lib/ViewerPage.svelte';
	import WelcomeScreen from '$lib/WelcomeScreen.svelte';
	import { appStore } from '$lib/stores/app-store';

	$: state = $appStore;
	const { actions } = appStore;
</script>

<svelte:head>
	<title>画像ビュワー</title>
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
			/>
		{/if}
	</main>
</div>
