<script lang="ts">
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import {
		navigateToGrid,
		navigateToViewer,
		navigateToWelcome,
	} from '$lib/services/app-navigation';
	import { dialogService } from '$lib/services/dialog';

	type Props = {
		title: string;
		imageCount: number;
	};

	const { title, imageCount }: Props = $props();

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
</script>

<header class="flex items-center gap-4 bg-base-200 p-4">
	<IconButton icon="home" title="Back to Welcome" onClick={navigateToWelcome} />
	<div class="flex flex-1 items-center gap-2">
		<h1 class="truncate text-lg font-semibold text-base-content">
			{title}
		</h1>
		<div class="text-sm text-base-content/70">
			{imageCount} images
		</div>
	</div>
	<div class="flex gap-2">
		<IconButton icon="file-image" title="Open File" onClick={openFileDialog} />
		<IconButton icon="folder-open" title="Open Another Folder" onClick={openDirectoryDialog} />
	</div>
</header>