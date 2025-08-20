<script lang="ts">
	import Icon from '@iconify/svelte';
	import { ImageViewService } from './image/image-manipulation.svelte';

	const {
		imageUrl,
		isLoading,
		error,
		onZoomStateChange
	}: {
		imageUrl: string;
		isLoading: boolean;
		error: string;
		onZoomStateChange?: (isZoomed: boolean) => void;
	} = $props();

	// デバッグ: propsの変更を監視（より詳細に）
	$effect(() => {
		// 全てのpropsを明示的に監視
		const url = imageUrl;
		const loading = isLoading;
		const err = error;

		console.log('📊 ImageCanvas props updated:', {
			imageUrl: url ? `${url.substring(0, 20)}...` : 'null',
			isLoading: loading,
			error: err || 'empty'
		});

		console.log('🎯 ImageCanvas conditions will be:', {
			hasError: !!(err && err.length > 0),
			hasImageUrl: !!(url && url.length > 0),
			isCurrentlyLoading: loading
		});
	});

	let containerRef: HTMLDivElement;
	let imageRef = $state<HTMLImageElement>();
	let imageViewService = new ImageViewService();
	let previousImageUrl = '';

	// 画像URLが変更されたときは準備のみ（fitScaleは保持）
	$effect(() => {
		if (imageUrl && imageUrl !== previousImageUrl) {
			// ズーム状態をリセット（fitScaleは保持）
			imageViewService.prepareForNewImage();
			previousImageUrl = imageUrl;
		}
	});

	// トランジションを表示するかどうかの判定（ズーム中かつドラッグ中でない場合のみ）
	const shouldShowTransition = $derived(
		imageViewService.viewState.isZooming && !imageViewService.viewState.isDragging
	);

	const handleWheel = (event: WheelEvent) => {
		event.preventDefault();
		imageViewService.zoom(event.deltaY);
	};

	const handleMouseDown = (event: MouseEvent) => {
		// ミドルボタン（ボタン1）でドラッグを開始
		if (event.button === 1) {
			event.preventDefault();
			imageViewService.startDrag(event.clientX, event.clientY);
		}
	};

	const handleMouseMove = (event: MouseEvent) => {
		if (imageViewService.viewState.isDragging) {
			event.preventDefault();
			imageViewService.updateDrag(event.clientX, event.clientY);
		}
	};

	const handleMouseUp = (event: MouseEvent) => {
		event.preventDefault();
		imageViewService.endDrag();
	};

	const onImageLoad = () => {
		if (imageRef) {
			// 画像読み込み完了時に全ての状態をリセット
			imageViewService.onImageLoaded(imageRef, containerRef);
		}
	};

	// ズームされているかどうかをチェック
	const isZoomed = $derived(
		imageViewService.viewState.zoomLevel !== 1 ||
			imageViewService.viewState.panX !== 0 ||
			imageViewService.viewState.panY !== 0
	);

	// ズーム状態変更時にコールバックを呼び出し
	$effect(() => {
		if (onZoomStateChange) {
			onZoomStateChange(isZoomed);
		}
	});
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class="absolute inset-0 flex items-center justify-center overflow-hidden"
	bind:this={containerRef}
	role="img"
	tabindex="0"
	aria-label="画像表示キャンバス"
	onwheel={handleWheel}
	onmousedown={handleMouseDown}
	onmousemove={handleMouseMove}
	onmouseup={handleMouseUp}
	onmouseleave={handleMouseUp}
>
	{console.log('🎯 ImageCanvas condition check:', {
		error: error || 'empty',
		errorType: typeof error,
		imageUrl: imageUrl ? 'exists' : 'null',
		isLoading
	})}
	{#if error && error.length > 0}
		{console.log('❌ ImageCanvas: Showing error')}
		<div class="flex flex-col items-center gap-2 text-red-400">
			<svg class="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
				></path>
			</svg>
			<span class="text-center">{error}</span>
		</div>
	{:else if imageUrl && imageUrl.length > 0}
		{console.log('🖼️ ImageCanvas: Showing image')}
		<img
			bind:this={imageRef}
			src={imageUrl}
			alt=""
			class={shouldShowTransition ? 'transition-transform duration-200' : ''}
			style="transform: translate({imageViewService.viewState.panX}px, {imageViewService.viewState
				.panY}px) scale({imageViewService.viewState.fitScale *
				imageViewService.viewState
					.zoomLevel}); transform-origin: center center; cursor: grab; max-width: none; max-height: none;"
			onload={onImageLoad}
		/>
	{:else if isLoading}
		{console.log('⏳ ImageCanvas: Showing loading')}
		<div class="flex flex-col items-center gap-2 text-white">
			<span class="loading loading-lg loading-spinner"></span>
			<span class="opacity-80">Loading image...</span>
		</div>
	{:else}
		{console.log('❓ ImageCanvas: Default state')}
		<div class="flex flex-col items-center gap-2 text-gray-400">
			<span class="opacity-80">No content to display</span>
		</div>
	{/if}

	<!-- ズームリセットボタン -->
	{#if imageUrl && isZoomed}
		<button
			class="btn absolute right-4 bottom-4 bg-black/60 text-white btn-ghost backdrop-blur-sm btn-sm hover:bg-black/80"
			onclick={() => imageViewService.resetZoom()}
			title="Reset zoom (1:1)"
			aria-label="Reset zoom"
		>
			<Icon icon="lucide:zoom-out" class="h-4 w-4" />
			Reset
		</button>
	{/if}
</div>
