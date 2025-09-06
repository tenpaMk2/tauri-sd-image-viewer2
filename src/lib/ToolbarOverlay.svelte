<script lang="ts">
	import ToolbarButton from '$lib/components/ui/ToolbarButton.svelte';
	import { transitionToGrid, transitionToViewer } from '$lib/services/app-transitions';
	import { dialogService } from '$lib/services/dialog';
	import { directoryImagePathsStore } from '$lib/stores/directory-image-paths-store.svelte';
	import { metadataPanelStore } from '$lib/stores/metadata-panel-store.svelte';
	import { navigationStore } from '$lib/stores/navigation-store.svelte';
	import { toastStore } from '$lib/stores/toast-store.svelte';
	import { viewerUIStore } from '$lib/stores/viewer-ui-store.svelte';
	import { copyFileToClipboard } from '$lib/utils/copy-utils';
	import { path } from '@tauri-apps/api';
	import { onDestroy } from 'svelte';
	import { navigateToLast } from './services/image-navigation';

	// ストアから状態を取得
	const { state: viewerUIState } = viewerUIStore;
	const { state: metadataPanelState, actions: metadataPanelActions } = metadataPanelStore;
	const { state: navigationState } = navigationStore;
	const { state: directoryState } = directoryImagePathsStore;

	// ツールバー用のイベントハンドラー
	const handleToggleInfoPanel = () => {
		metadataPanelActions.toggle();
	};

	const handleToggleAutoNavigation = async () => {
		if (viewerUIState.isAutoNavActive) {
			viewerUIStore.actions.stopAutoNavigation();
			return;
		}

		const navigateToLastWithReloading = async () => {
			const d = directoryImagePathsStore.state.currentDirectory;

			if (d === null) {
				toastStore.actions.showErrorToast('Cannot reload image paths because directory is null');
				viewerUIStore.actions.stopAutoNavigation();
				return;
			}

			await directoryImagePathsStore.actions.loadImagePaths(d);
			navigateToLast();
		};

		navigateToLastWithReloading(); // ボタンを押した瞬間に最新画像へナビゲーション
		viewerUIStore.actions.startAutoNavigation(navigateToLastWithReloading);
	};

	const handleCopyToClipboard = async () => {
		try {
			await copyFileToClipboard([navigationState.currentImagePath]);
			toastStore.actions.showSuccessToast('Image files copied to clipboard');
		} catch (error) {
			console.error('Failed to copy image files to clipboard: ' + error);
			toastStore.actions.showErrorToast('Failed to copy image files to clipboard');
		}
	};

	// ファイル選択ハンドラー
	const openFileDialog = async () => {
		const result = await dialogService.openFileDialog();
		if (result) {
			transitionToViewer(result);
		}
	};

	onDestroy(() => {
		viewerUIStore.actions.stopAutoNavigation();
		viewerUIStore.actions.resetUITimer();
	});
</script>

<!-- Overlay Toolbar -->
<div
	class="absolute top-0 right-0 left-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4 transition-opacity duration-300"
	class:opacity-0={!viewerUIState.isVisible}
	class:pointer-events-none={!viewerUIState.isVisible}
>
	<div class="flex items-center text-white">
		<!-- Left: Page Info -->
		<div class="flex items-center gap-4">
			{#if directoryState.imagePaths && 1 < directoryState.imagePaths.length}
				<div class="text-sm opacity-80">
					{navigationStore.deriveds.currentIndex + 1} / {directoryState.imagePaths.length}
				</div>
			{/if}
		</div>

		<!-- Center: Main Buttons -->
		<div class="flex flex-1 items-center justify-center gap-2">
			<ToolbarButton icon="image-plus" title="Open File" onClick={openFileDialog} variant="white" />

			<ToolbarButton
				icon="clipboard-copy"
				title="Copy image files to clipboard"
				onClick={handleCopyToClipboard}
				variant="white"
			/>

			<ToolbarButton
				icon="skip-forward"
				title={viewerUIState.isAutoNavActive
					? 'Stop Auto Navigation'
					: 'Start Auto Navigation to Latest Image'}
				onClick={handleToggleAutoNavigation}
				extraClass={viewerUIState.isAutoNavActive ? 'btn-active' : ''}
				variant="white"
			/>

			<ToolbarButton
				icon="layout-grid"
				title="Grid View"
				onClick={async () => {
					const directory = await path.dirname(navigationState.currentImagePath);
					if (directory) {
						transitionToGrid(directory);
					}
				}}
				variant="white"
			/>
		</div>

		<!-- Right: Info Panel Button -->
		<div class="flex items-center gap-2">
			<ToolbarButton
				icon={metadataPanelState.isVisible ? 'panel-right-close' : 'panel-right-open'}
				title={metadataPanelState.isVisible ? 'Hide Info Panel' : 'Show Info Panel'}
				onClick={handleToggleInfoPanel}
				variant="white"
			/>
		</div>
	</div>
</div>
