<script lang="ts">
	import { goto } from '$app/navigation';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { autoNavStore } from '$lib/services/auto-nav-store.svelte';
	import { copyFiles } from '$lib/services/clipboard';
	import { dialogService } from '$lib/services/dialog';
	import type { NavigationStore } from '$lib/services/navigation-store';
	import { path } from '@tauri-apps/api';
	import { getContext } from 'svelte';

	const navigation = $derived(getContext<() => NavigationStore>('navigationStore')());
	const isUiVisible = $derived(getContext<() => boolean>('isUiVisible')());

	const openDirectoryDialog = async () => {
		const result = await dialogService.openDirectoryDialog();

		if (!result) return;

		goto(`/grid/${encodeURIComponent(result)}`);
	};

	const openFileDialog = async () => {
		const result = await dialogService.openFileDialog();
		if (!result) return;

		goto(`/viewer/${encodeURIComponent(result)}`);
	};

	const goToGrid = async () => {
		const currentImagePath = navigation.state.currentImagePath;

		if (!currentImagePath) return;

		const directory = await path.dirname(currentImagePath);

		if (!directory) return;

		goto(`/grid/${encodeURIComponent(directory)}`);
	};

	const handleCopyToClipboard = async () => {
		const currentImagePath = navigation.state.currentImagePath;
		if (!currentImagePath) return;

		await copyFiles([currentImagePath]);
	};

	const handleToggleAutoNavigation = () => {
		autoNavStore.actions.toggle(navigation);
	};

	$effect(() => {
		return () => {
			// 念の為に停止しておく
			autoNavStore.actions.stop();
		};
	});
</script>

<div class="flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-4">
	<div class="text-sm opacity-80">
		{navigation.state.currentIndex + 1} / {navigation.state.totalImages}
	</div>

	<div class="flex gap-2">
		<IconButton icon="image-plus" title="Open File" onClick={openFileDialog} />
		<IconButton
			icon="clipboard-copy"
			title="Copy image files to clipboard"
			onClick={handleCopyToClipboard}
		/>
		<IconButton
			icon="skip-forward"
			title={autoNavStore.state.isActive
				? 'Stop Auto Navigation'
				: 'Start Auto Navigation to Latest Image'}
			onClick={handleToggleAutoNavigation}
			extraClass={autoNavStore.state.isActive ? 'btn-active btn-primary' : ''}
			spinnerKind={autoNavStore.state.isActive ? 'loading-infinity' : undefined}
		/>
		<IconButton icon="layout-grid" title="Grid View" onClick={goToGrid} />
		<IconButton icon="folder-open" title="Open Another Folder" onClick={openDirectoryDialog} />
	</div>
</div>
