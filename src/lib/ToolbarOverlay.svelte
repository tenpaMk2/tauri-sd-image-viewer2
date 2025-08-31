<script lang="ts">
	import { transitionToGrid, transitionToViewer } from '$lib/services/app-transitions';
	import { dialogService } from '$lib/services/dialog';
	import { directoryImagePathsStore } from '$lib/stores/directory-image-paths-store.svelte';
	import { metadataPanelStore } from '$lib/stores/metadata-panel-store.svelte';
	import { navigationStore } from '$lib/stores/navigation-store.svelte';
	import { toastStore } from '$lib/stores/toast-store.svelte';
	import { viewerUIStore } from '$lib/stores/viewer-ui-store.svelte';
	import { copyFileToClipboard } from '$lib/utils/copy-utils';
	import Icon from '@iconify/svelte';
	import { path } from '@tauri-apps/api';
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
			<button class="btn text-white btn-ghost btn-sm" onclick={openFileDialog} title="Open File">
				<Icon icon="lucide:image-plus" class="h-4 w-4" />
			</button>
			<button
				class="btn text-white btn-ghost btn-sm"
				onclick={handleCopyToClipboard}
				title={'Copy image files to clipboard'}
			>
				<Icon icon="lucide:clipboard-copy" class="h-4 w-4" />
			</button>
			<button
				class="btn text-white btn-sm"
				class:btn-ghost={!viewerUIState.isAutoNavActive}
				class:btn-active={viewerUIState.isAutoNavActive}
				onclick={handleToggleAutoNavigation}
				title={viewerUIState.isAutoNavActive
					? 'Stop Auto Navigation'
					: 'Start Auto Navigation to Latest Image'}
			>
				<Icon icon="lucide:skip-forward" class="h-4 w-4" />
			</button>
			<button
				class="btn text-white btn-ghost btn-sm"
				onclick={async () => {
					const directory = await path.dirname(navigationState.currentImagePath);
					if (directory) {
						transitionToGrid(directory);
					}
				}}
				title="Grid View"
			>
				<Icon icon="lucide:layout-grid" class="h-4 w-4" />
			</button>
		</div>

		<!-- Right: Info Panel Button -->
		<div class="flex items-center gap-2">
			<button
				class="btn text-white btn-ghost btn-sm"
				onclick={handleToggleInfoPanel}
				title={metadataPanelState.isVisible ? 'Hide Info Panel' : 'Show Info Panel'}
			>
				<Icon
					icon={metadataPanelState.isVisible
						? 'lucide:panel-right-close'
						: 'lucide:panel-right-open'}
					class="h-4 w-4"
				/>
			</button>
		</div>
	</div>
</div>
