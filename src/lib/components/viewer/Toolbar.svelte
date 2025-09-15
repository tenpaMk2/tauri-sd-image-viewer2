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
	import { getContext } from 'svelte';

	const navigation = $derived(getContext<() => NavigationStore>('navigationStore')());

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

	<div class="text-sm opacity-80">
		{navigation.state.currentIndex + 1} / {navigation.state.totalImages}
	</div>

	<div class="flex gap-2">
		<IconButton icon="file-image" title="Open File" onClick={openFileDialog} />
		<IconButton icon="folder-open" title="Open Another Folder" onClick={openDirectoryDialog} />
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
	</div>
</div>
