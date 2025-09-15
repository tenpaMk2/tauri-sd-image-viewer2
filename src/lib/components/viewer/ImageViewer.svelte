<script lang="ts">
	import { imageViewStore } from '$lib/stores/image-view-store.svelte';
	import Icon from '@iconify/svelte';
	import UiWrapper from './UiWrapper.svelte';

	type Props = {
		imageUrl: string;
		imagePath: string;
	};

	const { imageUrl, imagePath }: Props = $props();

	const {
		state: imageViewState,
		deriveds: imageViewDeriveds,
		actions: imageViewActions,
	} = imageViewStore;

	// トランジションを表示するかどうかの判定（ズーム中かつドラッグ中でない場合のみ）
	const shouldShowTransition = $derived(imageViewState.isZooming && !imageViewState.isDragging);

	// 拡大・パン機能のイベントハンドラー
	const onwheel = (event: WheelEvent) => {
		event.preventDefault();
		imageViewActions.zoom(event.deltaY);
	};

	const onmousedown = (event: MouseEvent) => {
		// 左クリック（ボタン0）またはミドルボタン（ボタン1）でドラッグを開始
		// ただし、ズーム状態の時のみドラッグを許可
		if ((event.button === 0 || event.button === 1) && imageViewDeriveds.isZoomed) {
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
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class="h-lvh w-full overflow-hidden focus:outline-none"
	role="img"
	tabindex="0"
	aria-label="画像表示キャンバス"
	{onwheel}
	{onmousedown}
	{onmousemove}
	{onmouseup}
	onmouseleave={onmouseup}
>
	<div
		class="flex h-full w-full items-center justify-center"
		class:transition-transform={shouldShowTransition}
		class:duration-200={shouldShowTransition}
		style="transform: translate({imageViewState.panX}px, {imageViewState.panY}px) scale({imageViewState.zoomLevel}); transform-origin: center center; cursor: {imageViewState.isDragging ? 'grabbing' : imageViewDeriveds.isZoomed ? 'grab' : 'auto'};"
	>
		<img src={imageUrl} alt={imagePath} class="h-full w-full object-contain" />
	</div>
</div>

<!-- Zoom reset button -->
{#if imageViewDeriveds.isZoomed}
	<UiWrapper positionClass="bottom-4 right-4">
		<button
			class="btn bg-black/60 text-white btn-ghost backdrop-blur-sm btn-sm hover:bg-black/80"
			onclick={() => imageViewActions.resetZoom()}
			title="Reset zoom (1:1)"
			aria-label="Reset zoom"
		>
			<Icon icon="lucide:zoom-out" class="h-4 w-4" />
			Reset
		</button>
	</UiWrapper>
{/if}