<script lang="ts">
	import { lastViewedImageStore } from '$lib/components/app/last-viewed-image-store.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const navigationStore = $derived(data.navigationStore);

	$effect(() => {
		navigationStore.actions.preloadNextImage();
		navigationStore.actions.preloadPreviousImage();
	});

	$effect(() => {
		// Set this as the last viewed image whenever this page is displayed
		lastViewedImageStore.actions.setLastViewedImage(
			navigationStore.state.currentImagePath,
			navigationStore.state.parentDir,
		);
	});
</script>
