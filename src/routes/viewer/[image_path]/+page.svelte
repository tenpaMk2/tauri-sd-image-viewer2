<script lang="ts">
	import { preloadData } from '$app/navigation';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const previousImagePath = $derived(data.navigation.state.previousImagePath);
	const nextImagePath = $derived(data.navigation.state.nextImagePath);

	$effect(() => {
		if (previousImagePath) {
			preloadData(`/viewer/${encodeURIComponent(previousImagePath)}`);
		}
		if (nextImagePath) {
			preloadData(`/viewer/${encodeURIComponent(nextImagePath)}`);
		}
	});
</script>
