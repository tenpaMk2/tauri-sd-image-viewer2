<script lang="ts">
	import type { ImageMetadata } from './image/types';

	const {
		imageUrl,
		isLoading,
		error,
		metadata
	}: {
		imageUrl: string;
		isLoading: boolean;
		error: string;
		metadata: ImageMetadata;
	} = $props();

	let zoomLevel = $state(1);
	let panX = $state(0);
	let panY = $state(0);
	let isDragging = $state(false);
	let dragStartX = $state(0);
	let dragStartY = $state(0);
	let containerRef: HTMLDivElement;
	let imageRef: HTMLImageElement;
	let fitScale = $state(1);

	// 画像のウィンドウフィット用スケールを計算
	const calculateFitScale = () => {
		if (!imageRef || !containerRef) return 1;
		
		const containerRect = containerRef.getBoundingClientRect();
		const availableWidth = containerRect.width;
		const availableHeight = containerRect.height;
		
		const imageNaturalWidth = imageRef.naturalWidth;
		const imageNaturalHeight = imageRef.naturalHeight;
		
		if (imageNaturalWidth === 0 || imageNaturalHeight === 0) return 1;
		
		// シンプルなフィット計算
		const scaleX = availableWidth / imageNaturalWidth;
		const scaleY = availableHeight / imageNaturalHeight;
		const finalScale = Math.min(scaleX, scaleY);
		
		// 計算されたサイズと実際の画像表示サイズをデバッグ
		const calculatedWidth = imageNaturalWidth * finalScale;
		const calculatedHeight = imageNaturalHeight * finalScale;
		
		console.log('Container:', availableWidth, 'x', availableHeight);
		console.log('Image natural:', imageNaturalWidth, 'x', imageNaturalHeight);
		console.log('Final scale:', finalScale);
		console.log('Calculated display size:', calculatedWidth, 'x', calculatedHeight);
		
		// 実際の画像要素のサイズもログ出力
		setTimeout(() => {
			if (imageRef) {
				const actualRect = imageRef.getBoundingClientRect();
				console.log('Actual displayed size:', actualRect.width, 'x', actualRect.height);
			}
		}, 100);
		
		return finalScale;
	};

	// 画像URLが変更されたときにズームとパンをリセット
	$effect(() => {
		if (imageUrl) {
			zoomLevel = 1;
			panX = 0;
			panY = 0;
		}
	});

	const handleWheel = (event: WheelEvent) => {
		event.preventDefault();
		const delta = event.deltaY;
		const zoomFactor = 0.1;
		
		if (delta < 0) {
			zoomLevel = Math.min(zoomLevel + zoomFactor, 3);
		} else {
			zoomLevel = Math.max(zoomLevel - zoomFactor, 0.1);
			// ズームアウト時にパン位置をリセット
			if (zoomLevel <= 1) {
				panX = 0;
				panY = 0;
			}
		}
	};

	const handleMouseDown = (event: MouseEvent) => {
		// ミドルボタン（ボタン1）でドラッグを開始
		if (event.button === 1) {
			event.preventDefault();
			isDragging = true;
			dragStartX = event.clientX;
			dragStartY = event.clientY;
			document.body.style.cursor = 'grabbing';
		}
	};

	const handleMouseMove = (event: MouseEvent) => {
		if (isDragging) {
			event.preventDefault();
			const deltaX = event.clientX - dragStartX;
			const deltaY = event.clientY - dragStartY;
			panX += deltaX;
			panY += deltaY;
			dragStartX = event.clientX;
			dragStartY = event.clientY;
		}
	};

	const handleMouseUp = (event: MouseEvent) => {
		if (isDragging) {
			event.preventDefault();
			isDragging = false;
			document.body.style.cursor = '';
		}
	};
</script>

<div 
	class="absolute inset-0 flex items-center justify-center overflow-hidden" 
	bind:this={containerRef} 
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
			class="{isDragging ? '' : 'transition-transform duration-200'}"
			style="transform: translate({panX}px, {panY}px) scale({fitScale * zoomLevel}); transform-origin: center center; cursor: grab; max-width: none; max-height: none;"
			onload={() => {
				fitScale = calculateFitScale();
			}}
		/>
	{:else if isLoading}
		<div class="flex flex-col items-center gap-2 text-white">
			<span class="loading loading-lg loading-spinner"></span>
			<span class="opacity-80">画像を読み込み中...</span>
		</div>
	{/if}
</div>
