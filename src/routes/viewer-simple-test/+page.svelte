<script lang="ts">
	import TestViewerPage from '$lib/TestViewerPage.svelte';
	import TestWelcome from '$lib/TestWelcome.svelte';
	import Toast from '$lib/Toast.svelte';
	import { appStore } from '$lib/stores/app-store.svelte';
	import { getCurrentWebview } from '@tauri-apps/api/webview';
	import { onMount } from 'svelte';

	const state = $derived(appStore.state);
	const { actions } = appStore;

	// デバッグ用: 状態変更を監視
	$effect(() => {
		console.log(
			'🔍 [Test] App state changed: viewMode=' +
				state.viewMode +
				' selectedImagePath=' +
				(state.selectedImagePath ? state.selectedImagePath.split('/').pop() : 'null') +
				' selectedDirectory=' +
				(state.selectedDirectory ? state.selectedDirectory.split('/').pop() : 'null')
		);
		console.log(
			'🔍 [Test] Current view condition check: isViewerMode=' +
				(state.viewMode === 'viewer') +
				' hasSelectedImagePath=' +
				!!state.selectedImagePath +
				' shouldShowViewer=' +
				!!(state.viewMode === 'viewer' && state.selectedImagePath)
		);
	});

	console.log('🧪 [Test] Main page initialized');

	// 本番と同じDrag & Drop設定を追加
	onMount(() => {
		const setupDragDrop = async () => {
			console.log('🎯 [Test] Setting up drag drop...');
			const webview = getCurrentWebview();
			const unlisten = await webview.onDragDropEvent((event) => {
				console.log('🎯 [Test] Drag drop event:', event.payload.type);
				if (event.payload.type !== 'drop' || (event.payload.paths ?? []).length === 0) {
					return;
				}
				actions.handleDroppedPaths(event.payload.paths);
			});

			return unlisten;
		};

		let unlistenPromise: Promise<() => void> | null = null;

		unlistenPromise = setupDragDrop();
		console.log('✅ [Test] Drag drop setup completed');

		return () => {
			console.log('🧹 [Test] Cleaning up drag drop listener');
			if (unlistenPromise) {
				unlistenPromise.then((unlisten) => unlisten());
			}
		};
	});
</script>

<svelte:head>
	<title>ViewerPage Simple Test</title>
</svelte:head>

<div class="min-h-screen bg-base-100">
	<main class="h-screen">
		{#if state.viewMode === 'welcome'}
			<TestWelcome openFileDialog={actions.openFileDialog} />
		{:else if state.viewMode === 'viewer' && state.selectedImagePath}
			<TestViewerPage
				imagePath={state.selectedImagePath}
				onImageChange={actions.handleImageChange}
				openFileDialog={actions.openFileDialog}
				onSwitchToGrid={state.selectedDirectory ? actions.handleSwitchToGrid : undefined}
				refreshMetadata={actions.refreshCurrentImageMetadata}
			/>
		{/if}
	</main>

	<!-- Toast Display（本番と同じ） -->
	<Toast />
</div>
