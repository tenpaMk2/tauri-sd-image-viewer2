<script lang="ts">
	import Icon from '@iconify/svelte';
	import { imageViewStore } from './stores/image-view-store.svelte';
	import { navigationStore } from './stores/navigation-store.svelte';

	const { state: navigationState } = navigationStore;
	const {
		state: imageViewState,
		getters: imageViewGetters,
		actions: imageViewActions,
	} = imageViewStore;

	let containerRef: HTMLDivElement;
	let imageRef = $state<HTMLImageElement>();

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

	const onImageLoad = () => {
		if (imageRef) {
			// 画像読み込み完了時に全ての状態をリセット
			imageViewActions.onImageLoaded(imageRef, containerRef);
		}
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
	{#if navigationState.imageFileLoadError}
		<div class="flex flex-col items-center gap-2 text-red-400">
			<svg class="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
				></path>
			</svg>
			<span class="text-center">{navigationState.imageFileLoadError}</span>
		</div>
	{:else if navigationState.imageLoadingStatus === 'idle'}
		<div class="flex flex-col items-center gap-2 text-white">
			<span class="loading loading-lg loading-spinner"></span>
			<span class="opacity-80">Idle</span>
		</div>
	{:else if navigationState.imageLoadingStatus === 'loading'}
		<div class="flex flex-col items-center gap-2 text-white">
			<span class="loading loading-lg loading-spinner"></span>
			<span class="opacity-80">Loading image...</span>
		</div>
	{:else if navigationState.currentImageUrl}
		<img
			bind:this={imageRef}
			src={navigationState.currentImageUrl}
			alt=""
			class={shouldShowTransition ? 'transition-transform duration-200' : ''}
			style="transform: translate({imageViewState.panX}px, {imageViewState.panY}px) scale({imageViewState.fitScale *
				imageViewState.zoomLevel}); transform-origin: center center; cursor: grab; max-width: none; max-height: none;"
			onload={onImageLoad}
		/>
	{:else}
		<div class="flex flex-col items-center gap-2 text-gray-400">
			<span class="opacity-80">No content to display</span>
		</div>
	{/if}

	<!-- ズームリセットボタン -->
	{#if imageViewGetters.isZoomed}
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
