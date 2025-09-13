<script lang="ts">
	import type { MetadataStore } from '$lib/services/metadata-store';
	import type { Snippet } from 'svelte';
	import { getContext } from 'svelte';
	import LoadingState from '../ui/LoadingState.svelte';

	type Props = {
		title: string;
		metadataContent: Snippet<[MetadataStore['state']]>;
		titleActions?: Snippet<[MetadataStore['state']]>;
	};

	const { title, metadataContent, titleActions }: Props = $props();

	const metadataStorePromise = $derived(
		getContext<() => Promise<MetadataStore>>('metadataStorePromise')(),
	);
	let metadataStore = $state<MetadataStore | null>(null);
	$effect(() => {
		metadataStorePromise.then((store) => {
			metadataStore = store;
		});
	});
</script>

<div class="rounded-lg bg-base-300 p-3">
	<h3 class="mb-2 flex items-center gap-2 text-sm font-semibold">
		{title}
		{#if metadataStore && titleActions}
			{@render titleActions(metadataStore.state)}
		{/if}
	</h3>
	<div class="space-y-1.5 text-xs">
		{#await metadataStorePromise}
			<LoadingState status="loading" />
		{:then}
			{#if !metadataStore}
				<p class="text-xs text-base-content/50">No metadata available.</p>
			{:else}
				{@render metadataContent(metadataStore.state)}
			{/if}
		{:catch error}
			<LoadingState status="error" />
		{/await}
	</div>
</div>
