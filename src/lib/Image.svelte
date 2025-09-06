<script lang="ts">
	import { imageRegistry } from '$lib/services/image-registry';
	import { LOADING_STATUS_CONFIG } from '$lib/ui/loading-status-config';
	import Icon from '@iconify/svelte';

	type Props = {
		imagePath: string;
		class?: string;
		style?: string;
		alt?: string;
		previousImagePath?: string;
	};

	let {
		imagePath,
		class: className = '',
		style = '',
		alt = '',
		previousImagePath,
	}: Props = $props();

	let imageDisplayReady = $state(false);

	const { state: imageState, actions: ImageActions } = imageRegistry.getOrCreateStore(imagePath);
	ImageActions.ensureLoaded();
	const prevStore = previousImagePath ? imageRegistry.getOrCreateStore(previousImagePath) : null;
	prevStore?.actions.ensureLoaded();

	const onload = () => {
		imageDisplayReady = true;
	};
</script>

{#snippet statusDisplay(
	config: (typeof LOADING_STATUS_CONFIG)[keyof typeof LOADING_STATUS_CONFIG],
	errorMessage = '',
)}
	<div class="absolute inset-0 flex items-center justify-center">
		<div
			class="flex items-center gap-2 rounded-md bg-black/70 px-3 py-2 text-white backdrop-blur-sm"
		>
			{#if config.icon}
				<Icon icon="lucide:{config.icon}" class="h-4 w-4" />
			{:else if config.loadingIcon}
				<span class="loading loading-sm {config.loadingIcon}"></span>
			{/if}
			<span class="opacity-80">{errorMessage || config.text}</span>
		</div>
	</div>
{/snippet}

{#if prevStore?.state.imageUrl}
	<img
		src={prevStore.state.imageUrl}
		class={className}
		{style}
		{alt}
		class:hidden={imageDisplayReady}
	/>
{/if}

{#if imageState.loadingStatus === 'unloaded'}
	{@render statusDisplay(LOADING_STATUS_CONFIG.unloaded)}
{:else if imageState.loadingStatus === 'queued'}
	{@render statusDisplay(LOADING_STATUS_CONFIG.queued)}
{:else if imageState.loadingStatus === 'loading'}
	{@render statusDisplay(LOADING_STATUS_CONFIG.loading)}
{:else if imageState.loadingStatus === 'loaded'}
	<img
		src={imageState.imageUrl}
		class={className}
		{style}
		{alt}
		{onload}
		class:hidden={!imageDisplayReady}
	/>
{:else if imageState.loadingStatus === 'error'}
	{@render statusDisplay(LOADING_STATUS_CONFIG.error, imageState.loadingError || 'Unknown error')}
{:else}
	{@render statusDisplay(LOADING_STATUS_CONFIG.error, 'No content to display')}
{/if}
