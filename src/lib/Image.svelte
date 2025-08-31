<script lang="ts">
	import { loadImage } from '$lib/services/image-loader';
	import Icon from '@iconify/svelte';
	import { onDestroy } from 'svelte';

	type Props = {
		imagePath: string;
		class?: string;
		style?: string;
		alt?: string;
		onImageLoad?: (imgEl: HTMLImageElement) => void;
	};

	let {
		imagePath,
		class: className = '',
		style = '',
		alt = '',
		onImageLoad = () => {},
	}: Props = $props();

	let imageUrl = $state<string | undefined>(undefined);
	let error = $state<string | undefined>(undefined);
	let imageRef = $state<HTMLImageElement>();

	console.log('Loading image: ' + imagePath.split('/').pop());
	const promise = loadImage(imagePath)
		.then((imageData) => {
			imageUrl = imageData.url;
			console.log('Image loaded successfully: ' + imagePath.split('/').pop());
		})
		.catch((err) => {
			error = err instanceof Error ? err.message : String(err);
			console.error('Image load failed: ' + imagePath.split('/').pop() + ' ' + err);
		});

	// コンポーネント破棄時にBlobURLを解放
	onDestroy(() => {
		// TODO: promise中のものの途中破棄

		if (imageUrl?.startsWith('blob:')) {
			try {
				URL.revokeObjectURL(imageUrl);
			} catch (err) {
				console.warn('Failed to revoke image URL: ' + err);
			}
		}
	});
</script>

{#await promise}
	<div class="flex flex-col items-center gap-2 text-white">
		<span class="loading loading-lg loading-spinner"></span>
		<span class="opacity-80">Loading image...</span>
	</div>
{:then _}
	{#if imageUrl}
		<img
			bind:this={imageRef}
			src={imageUrl}
			onload={() => onImageLoad(imageRef!)}
			class={className}
			{style}
			{alt}
		/>
	{:else if error}
		<div class="flex flex-col items-center gap-2 text-red-400">
			<Icon icon="lucide:triangle-alert" class="h-8 w-8" />
			<span class="text-center">{error}</span>
		</div>
	{:else}
		<div class="flex flex-col items-center gap-2 text-gray-400">
			<span class="opacity-80">No content to display</span>
		</div>
	{/if}
{/await}
