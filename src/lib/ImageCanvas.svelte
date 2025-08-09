<script lang="ts">
	import Icon from '@iconify/svelte';
	import {
		calculateFitScale,
		createImageViewState,
		endDrag,
		handleZoom,
		resetImageViewState,
		startDrag,
		updateDrag,
		type ImageViewState
	} from './image/image-manipulation';
	import type { ImageMetadata } from './image/types';
	import { updateImageRating } from './utils/rating-utils';

	const {
		imageUrl,
		isLoading,
		error,
		metadata,
		imagePath,
		onRatingUpdate,
		isUIVisible = true
	}: {
		imageUrl: string;
		isLoading: boolean;
		error: string;
		metadata: ImageMetadata;
		imagePath?: string;
		onRatingUpdate?: () => void;
		isUIVisible?: boolean;
	} = $props();

	let containerRef: HTMLDivElement;
	let imageRef = $state<HTMLImageElement>();
	let viewState = $state<ImageViewState>(createImageViewState());
	let isImageChanging = $state(false);
	let previousImageUrl = '';

	// 画像URLが変更されたときにズームとパンをリセット
	$effect(() => {
		if (imageUrl && imageUrl !== previousImageUrl) {
			isImageChanging = true;
			resetImageViewState(viewState);
			previousImageUrl = imageUrl;
		}
	});

	const handleWheel = (event: WheelEvent) => {
		event.preventDefault();
		handleZoom(viewState, event.deltaY);
	};

	const handleMouseDown = (event: MouseEvent) => {
		// ミドルボタン（ボタン1）でドラッグを開始
		if (event.button === 1) {
			event.preventDefault();
			startDrag(viewState, event.clientX, event.clientY);
		}
	};

	const handleMouseMove = (event: MouseEvent) => {
		if (viewState.isDragging) {
			event.preventDefault();
			updateDrag(viewState, event.clientX, event.clientY);
		}
	};

	const handleMouseUp = (event: MouseEvent) => {
		event.preventDefault();
		endDrag(viewState);
	};

	const onImageLoad = () => {
		if (imageRef) {
			viewState.fitScale = calculateFitScale(imageRef, containerRef);
		}
		// 次フレームでトランジション再有効化
		requestAnimationFrame(() => {
			isImageChanging = false;
		});
	};

	// Rating更新機能
	const updateRating = async (rating: number) => {
		if (!imagePath) return;

		try {
			await updateImageRating(imagePath, rating);
			// Rating更新後のコールバック実行
			onRatingUpdate?.();
		} catch (error) {
			// エラーハンドリングは共通関数内で処理済み
		}
	};

	// ズームリセット機能
	const resetZoom = () => {
		resetImageViewState(viewState);
	};

	// ズームされているかどうかをチェック
	const isZoomed = $derived(
		viewState.zoomLevel !== 1 || viewState.panX !== 0 || viewState.panY !== 0
	);
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
	{#if error}
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
	{:else if imageUrl}
		<img
			bind:this={imageRef}
			src={imageUrl}
			alt={metadata.filename}
			class={viewState.isDragging || isImageChanging ? '' : 'transition-transform duration-200'}
			style="transform: translate({viewState.panX}px, {viewState.panY}px) scale({viewState.fitScale *
				viewState.zoomLevel}); transform-origin: center center; cursor: grab; max-width: none; max-height: none;"
			onload={onImageLoad}
		/>
	{:else if isLoading}
		<div class="flex flex-col items-center gap-2 text-white">
			<span class="loading loading-lg loading-spinner"></span>
			<span class="opacity-80">Loading image...</span>
		</div>
	{/if}

	<!-- ズームリセットボタン -->
	{#if imageUrl && isZoomed}
		<button
			class="btn absolute right-4 bottom-4 bg-black/60 text-white btn-ghost backdrop-blur-sm btn-sm hover:bg-black/80"
			onclick={resetZoom}
			title="Reset zoom (1:1)"
			aria-label="Reset zoom"
		>
			<Icon icon="lucide:zoom-out" class="h-4 w-4" />
			Reset
		</button>
	{/if}

	<!-- Rating オーバーレイバー（ズーム時・UI非表示時は非表示） -->
	{#if imageUrl && metadata.exifInfo?.rating !== undefined && viewState.zoomLevel === 1 && isUIVisible}
		<div
			class="absolute bottom-4 left-1/2 -translate-x-1/2 transform rounded-lg bg-black/60 px-3 pt-1 pb-2 opacity-70 backdrop-blur-sm"
		>
			<div class="rating-sm rating gap-0.5">
				{#each Array(5) as _, i}
					<input
						type="radio"
						name="rating-overlay-{imagePath}"
						class="mask bg-white mask-star-2 hover:bg-gray-200"
						checked={i + 1 === (metadata.exifInfo.rating || 0)}
						onchange={() => updateRating(i + 1)}
						aria-label="{i + 1} star"
					/>
				{/each}
			</div>
		</div>
	{/if}
</div>
