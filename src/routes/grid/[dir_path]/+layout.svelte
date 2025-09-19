<script lang="ts">
	import { page } from '$app/state';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { navigateToWelcome } from '$lib/services/app-navigation';
	import { setContext } from 'svelte';
	import type { LayoutProps } from './$types';
	import type { GridPageData } from './+page';

	const { children }: LayoutProps = $props();

	const { title, dirPath, imagePaths, thumbnailStores } = $derived(page.data as GridPageData);

	const handleBackToWelcome = (): void => {
		navigateToWelcome();
	};

	// Context for child components
	setContext<() => string>('dirPath', () => dirPath);
	setContext<() => string[]>('imagePaths', () => imagePaths);
	setContext<() => GridPageData['thumbnailStores']>('thumbnailStores', () => thumbnailStores);
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<div class="flex h-full flex-col bg-base-100">
	<!-- Header -->
	<header class="flex items-center gap-4 bg-base-200 p-4">
		<IconButton icon="home" title="Back to Welcome" onClick={handleBackToWelcome} />
		<div class="flex-1">
			<h1 class="truncate text-lg font-semibold text-base-content">
				{title}
			</h1>
		</div>
		<div class="text-sm text-base-content/70">
			{imagePaths.length} images
		</div>
	</header>

	<!-- Main Content -->
	<main class="flex-1 overflow-auto">
		{@render children()}
	</main>
</div>
