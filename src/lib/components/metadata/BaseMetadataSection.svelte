<script lang="ts">
	import type { MetadataStore } from '$lib/components/metadata/metadata-store.svelte';
	import {
		VIEWER_PAGE_DATA_CONTEXT,
		type ViewerPageDataContext,
	} from '$lib/components/viewer/viewer-page-data';
	import type { Snippet } from 'svelte';
	import { getContext } from 'svelte';
	import LoadingState from '../ui/LoadingState.svelte';

	type Props = {
		title: string;
		metadataContent: Snippet<[MetadataStore['state']]>;
	};

	const { title, metadataContent }: Props = $props();

	const viewerPageData = $derived(
		getContext<() => ViewerPageDataContext>(VIEWER_PAGE_DATA_CONTEXT)().state,
	);
	const metadataStore = $derived(viewerPageData.metadataStore);
</script>

<div class="rounded-lg bg-base-300 p-3">
	<h3 class="mb-2 flex items-center gap-2 text-sm font-semibold">
		{title}
	</h3>
	<div class="space-y-1.5 text-xs">
		{#if metadataStore.state.loadingStatus === 'loading'}
			<LoadingState status="loading" />
		{:else if metadataStore.state.loadingStatus === 'error'}
			<LoadingState status="error" />
		{:else if !metadataStore.state.metadata}
			<p class="text-xs text-base-content/50">No metadata available.</p>
		{:else}
			{@render metadataContent(metadataStore.state)}
		{/if}
	</div>
</div>
