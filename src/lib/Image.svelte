<script lang="ts">
	import { imageRegistry } from '$lib/services/image-registry';

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

{#snippet statusDisplay(text: string, showSpinner = false)}
	<div class="absolute inset-0 flex items-center justify-center">
		<div
			class="flex items-center gap-2 rounded-md bg-black/70 px-3 py-2 text-white backdrop-blur-sm"
		>
			{#if showSpinner}
				<span class="loading loading-sm loading-spinner"></span>
			{/if}
			<span class="opacity-80">{text}</span>
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
	{@render statusDisplay('Preparing...')}
{:else if imageState.loadingStatus === 'queued'}
	{@render statusDisplay('Queued', true)}
{:else if imageState.loadingStatus === 'loading'}
	{@render statusDisplay('Loading image...', true)}
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
	{@render statusDisplay(imageState.loadingError || 'Unknown error')}
{:else}
	{@render statusDisplay('No content to display')}
{/if}
