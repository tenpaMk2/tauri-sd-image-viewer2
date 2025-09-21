<script lang="ts">
	import type { ThumbnailStore } from '$lib/components/grid/thumbnail-store.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';

	type Props = {
		thumbnailStore: ThumbnailStore;
		imagePath: string;
	};

	let { thumbnailStore, imagePath }: Props = $props();

	const thumbnailState = $derived(thumbnailStore.state);
</script>

{#if thumbnailState.loadingStatus === 'loaded'}
	<img
		src={thumbnailState.thumbnailUrl}
		alt="thumbnail"
		class="h-full w-full object-contain transition-transform group-hover:scale-105"
		loading="lazy"
	/>
{:else}
	<div class="flex h-full items-center justify-center">
		<LoadingState status={thumbnailState.loadingStatus} />
	</div>
{/if}
