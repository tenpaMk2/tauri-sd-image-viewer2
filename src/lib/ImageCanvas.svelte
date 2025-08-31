<script lang="ts">
	import Image from '$lib/Image.svelte';
	import { imageViewStore } from '$lib/stores/image-view-store.svelte';
	import { navigationStore } from '$lib/stores/navigation-store.svelte';
	import Icon from '@iconify/svelte';

	const { state: navigationState } = navigationStore;
	const {
		state: imageViewState,
		deriveds: imageViewDeriveds,
		actions: imageViewActions,
	} = imageViewStore;

	let containerRef: HTMLDivElement;

	// トランジションを表示するかどうかの判定（ズーム中かつドラッグ中でない場合のみ）
	const shouldShowTransition = $derived(imageViewState.isZooming && !imageViewState.isDragging);

	const onwheel = (event: WheelEvent) => {
		event.preventDefault();
		imageViewActions.zoom(event.deltaY);
	};

	const onmousedown = (event: MouseEvent) => {
		// ミドルボタン（ボタン1）でドラッグを開始
		if (event.button === 1) {
			event.preventDefault();
			imageViewActions.startDrag(event.clientX, event.clientY);
		}
	};

	const onmousemove = (event: MouseEvent) => {
		if (imageViewState.isDragging) {
			event.preventDefault();
			imageViewActions.updateDrag(event.clientX, event.clientY);
		}
	};

	const onmouseup = (event: MouseEvent) => {
		event.preventDefault();
		imageViewActions.endDrag();
	};

	const onImageLoad = (imgEl: HTMLImageElement) => {
		imageViewActions.onImageLoaded(imgEl, containerRef);
	};
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class="absolute inset-0 flex items-center justify-center overflow-hidden"
	bind:this={containerRef}
	role="img"
	tabindex="0"
	aria-label="画像表示キャンバス"
	{onwheel}
	{onmousedown}
	{onmousemove}
	{onmouseup}
	onmouseleave={onmouseup}
>
	{#if navigationState.currentImagePath}
		{#key navigationState.currentImagePath}
			<Image
				imagePath={navigationState.currentImagePath}
				class={shouldShowTransition ? 'transition-transform duration-200' : ''}
				style="transform: translate({imageViewState.panX}px, {imageViewState.panY}px) scale({imageViewState.fitScale *
					imageViewState.zoomLevel}); transform-origin: center center; cursor: grab; max-width: none; max-height: none;"
				alt=""
				{onImageLoad}
			/>
		{/key}
	{:else}
		<div class="flex flex-col items-center gap-2 text-gray-400">
			<span class="opacity-80">No content to display</span>
		</div>
	{/if}

	<!-- ズームリセットボタン -->
	{#if imageViewDeriveds.isZoomed}
		<button
			class="btn absolute right-4 bottom-4 bg-black/60 text-white btn-ghost backdrop-blur-sm btn-sm hover:bg-black/80"
			onclick={() => imageViewActions.resetZoom()}
			title="Reset zoom (1:1)"
			aria-label="Reset zoom"
		>
			<Icon icon="lucide:zoom-out" class="h-4 w-4" />
			Reset
		</button>
	{/if}
</div>
