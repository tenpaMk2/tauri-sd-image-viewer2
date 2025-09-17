<script lang="ts">
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import {
		navigateToGrid,
		navigateToViewer,
		navigateToWelcome,
	} from '$lib/services/app-navigation';
	import { autoNavStore } from '$lib/services/auto-nav-store.svelte';
	import { copyFiles } from '$lib/services/clipboard';
	import { dialogService } from '$lib/services/dialog';
	import type { NavigationStore } from '$lib/services/navigation-store';
	import { toastStore } from '$lib/services/toast-store.svelte';
	import * as fs from '@tauri-apps/plugin-fs';
	import { platform } from '@tauri-apps/plugin-os';
	import { getContext } from 'svelte';

	const navigation = $derived(getContext<() => NavigationStore>('navigationStore')());

	let deleteConfirmationModal: HTMLDialogElement;

	const openDirectoryDialog = async () => {
		const result = await dialogService.openDirectoryDialog();

		if (!result) return;

		navigateToGrid(result);
	};

	const openFileDialog = async () => {
		const result = await dialogService.openFileDialog();
		if (!result) return;

		navigateToViewer(result);
	};

	const handleCopyToClipboard = async () => {
		const currentImagePath = navigation.state.currentImagePath;
		if (!currentImagePath) return;

		await copyFiles([currentImagePath]);
	};

	const handleToggleAutoNavigation = () => {
		autoNavStore.actions.toggle(navigation);
	};

	const showDeleteConfirmation = () => {
		const currentImagePath = navigation.state.currentImagePath;
		if (!currentImagePath) return;

		deleteConfirmationModal.showModal();
	};

	const executeDeleteImage = async () => {
		const currentImagePath = navigation.state.currentImagePath;
		if (!currentImagePath) return;

		try {
			await fs.remove(currentImagePath);

			toastStore.actions.showSuccessToast('Image deleted successfully');

			// Navigate to next image or parent if no more images
			if (navigation.state.currentIndex < navigation.state.totalImages - 1) {
				navigation.actions.navigateToNext();
			} else if (navigation.state.currentIndex > 0) {
				navigation.actions.navigateToPrevious();
			} else {
				// No more images, go to parent grid
				navigation.actions.navigateToParentGrid();
			}
		} catch (error) {
			console.error('Failed to delete image: ' + error);
			toastStore.actions.showErrorToast('Failed to delete image: ' + error);
		} finally {
			deleteConfirmationModal.close();
		}
	};

	const cancelDeleteConfirmation = () => {
		deleteConfirmationModal.close();
	};

	$effect(() => {
		return () => {
			// 念の為に停止しておく
			autoNavStore.actions.stop();
		};
	});
</script>

<div class="flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-4">
	<div class="flex gap-2">
		<IconButton icon="home" title="Welcome" onClick={navigateToWelcome} />
		<IconButton
			icon="layout-grid"
			title="Parent Directory"
			onClick={navigation.actions.navigateToParentGrid}
		/>
	</div>

	<div class="text-sm">
		{navigation.state.currentIndex + 1} / {navigation.state.totalImages}
	</div>

	<div class="flex gap-2">
		<IconButton icon="file-image" title="Open File" onClick={openFileDialog} />
		<IconButton icon="folder-open" title="Open Another Folder" onClick={openDirectoryDialog} />
		{#if platform() === 'macos' || platform() === 'windows'}
			<IconButton
				icon="clipboard-copy"
				title="Copy image files to clipboard"
				onClick={handleCopyToClipboard}
			/>
		{/if}
		<IconButton
			icon="skip-forward"
			title={autoNavStore.state.isActive
				? 'Stop Auto Navigation'
				: 'Start Auto Navigation to Latest Image'}
			onClick={handleToggleAutoNavigation}
			extraClass={autoNavStore.state.isActive ? 'btn-active btn-primary' : ''}
			spinnerKind={autoNavStore.state.isActive ? 'loading-infinity' : undefined}
		/>
		<div class="w-2"></div>
		<IconButton
			icon="trash"
			title="Delete Current Image"
			onClick={showDeleteConfirmation}
			dangerous={true}
		/>
	</div>
</div>

<!-- Delete Confirmation Modal -->
<dialog bind:this={deleteConfirmationModal} class="modal">
	<div class="modal-box">
		<h3 class="text-lg font-bold">Delete Image</h3>
		<p class="py-4">Are you sure you want to delete this image? This action cannot be undone.</p>
		<div class="modal-action">
			<button class="btn" onclick={cancelDeleteConfirmation}>Cancel</button>
			<button class="btn btn-error" onclick={executeDeleteImage}>Delete</button>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
