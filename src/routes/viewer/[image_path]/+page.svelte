<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const navigationStore = $derived(data.navigationStore);

	$effect(() => {
		navigationStore.actions.preloadNextImage();
		navigationStore.actions.preloadPreviousImage();
	});
</script>
