<script lang="ts">
	import Icon from '@iconify/svelte';
	import UiWrapper from './UiWrapper.svelte';

	type Props = {
		imageUrl: string;
		imagePath: string;
	};

	const { imageUrl, imagePath }: Props = $props();

	// 内部処理用のMutable型定義
	type MutableImageViewState = {
		zoomLevel: number;
		panX: number;
		panY: number;
		isDragging: boolean;
		dragStartX: number;
		dragStartY: number;
		isZooming: boolean;
	};

	// 初期状態
	const INITIAL_IMAGE_VIEW_STATE: MutableImageViewState = {
		zoomLevel: 1,
		panX: 0,
		panY: 0,
		isDragging: false,
		dragStartX: 0,
		dragStartY: 0,
		isZooming: false,
	};

	const imageViewState = $state<MutableImageViewState>({ ...INITIAL_IMAGE_VIEW_STATE });

	// ズーム状態が変更されたかどうかを判定
	const isZoomed = $derived(
		1 < imageViewState.zoomLevel || imageViewState.panX !== 0 || imageViewState.panY !== 0,
	);

	const imageViewActions = {
		// 状態リセット
		reset(): void {
			imageViewState.zoomLevel = 1;
			imageViewState.panX = 0;
			imageViewState.panY = 0;
			imageViewState.isDragging = false;
			imageViewState.isZooming = false;
		},

		// 画像読み込み完了時の処理（ズーム状態をリセット）
		onImageLoaded(): void {
			imageViewState.zoomLevel = 1;
			imageViewState.panX = 0;
			imageViewState.panY = 0;
			imageViewState.isDragging = false;
			imageViewState.isZooming = false;
		},

		// 画像切り替え準備（ズーム状態のみリセット）
		prepareForNewImage(): void {
			imageViewState.zoomLevel = 1;
			imageViewState.panX = 0;
			imageViewState.panY = 0;
			imageViewState.isDragging = false;
			imageViewState.isZooming = false;
		},

		// ズーム操作（マウス位置基準）
		zoomAtPoint(
			deltaY: number,
			mouseX: number,
			mouseY: number,
			containerWidth: number,
			containerHeight: number,
			zoomFactor: number = 0.1,
			minZoom: number = 1,
			maxZoom: number = 5,
		): void {
			// ズーミング状態を開始
			imageViewState.isZooming = true;

			const oldZoomLevel = imageViewState.zoomLevel;
			let newZoomLevel: number;

			if (deltaY < 0) {
				// 拡大
				newZoomLevel = Math.min(oldZoomLevel + zoomFactor, maxZoom);
			} else {
				// 縮小
				newZoomLevel = Math.max(oldZoomLevel - zoomFactor, minZoom);
			}

			// ズームレベルが変わらない場合は何もしない
			if (newZoomLevel === oldZoomLevel) {
				imageViewState.isZooming = false;
				return;
			}

			// マウス位置を基準にしたズーム調整
			if (newZoomLevel > 1) {
				// コンテナの中心からマウス位置への相対位置
				const centerX = containerWidth / 2;
				const centerY = containerHeight / 2;
				const offsetX = mouseX - centerX;
				const offsetY = mouseY - centerY;

				// ズーム比率
				const zoomRatio = newZoomLevel / oldZoomLevel;

				// パン位置を調整してマウス位置でズームするように
				imageViewState.panX = imageViewState.panX * zoomRatio - offsetX * (zoomRatio - 1);
				imageViewState.panY = imageViewState.panY * zoomRatio - offsetY * (zoomRatio - 1);
			} else {
				// ズームレベルが1以下になった時はパン位置をリセット
				imageViewState.panX = 0;
				imageViewState.panY = 0;
			}

			imageViewState.zoomLevel = newZoomLevel;

			// 次フレームでズーミング状態を終了（トランジション開始後）
			requestAnimationFrame(() => {
				imageViewState.isZooming = false;
			});
		},

		// ズーム操作（中央基準、後方互換性のため残す）
		zoom(deltaY: number, zoomFactor: number = 0.1, minZoom: number = 1, maxZoom: number = 5): void {
			// ズーミング状態を開始
			imageViewState.isZooming = true;

			if (deltaY < 0) {
				// 拡大
				imageViewState.zoomLevel = Math.min(imageViewState.zoomLevel + zoomFactor, maxZoom);
			} else {
				// 縮小（ウィンドウフィットサイズ以下にはしない）
				imageViewState.zoomLevel = Math.max(imageViewState.zoomLevel - zoomFactor, minZoom);
				// ズームレベルが1以下になった時はパン位置をリセット
				if (imageViewState.zoomLevel <= 1) {
					imageViewState.panX = 0;
					imageViewState.panY = 0;
				}
			}

			// 次フレームでズーミング状態を終了（トランジション開始後）
			requestAnimationFrame(() => {
				imageViewState.isZooming = false;
			});
		},

		// ズームリセット
		resetZoom(): void {
			// ズーミング状態を開始
			imageViewState.isZooming = true;

			imageViewActions.reset();

			// 次フレームでズーミング状態を終了（トランジション開始後）
			requestAnimationFrame(() => {
				imageViewState.isZooming = false;
			});
		},

		// ドラッグ開始
		startDrag(clientX: number, clientY: number): void {
			// ドラッグ開始時はズーミング状態を終了
			imageViewState.isZooming = false;
			imageViewState.isDragging = true;
			imageViewState.dragStartX = clientX;
			imageViewState.dragStartY = clientY;
			document.body.style.cursor = 'grabbing';
		},

		// ドラッグ更新
		updateDrag(clientX: number, clientY: number): void {
			if (!imageViewState.isDragging) return;

			const deltaX = clientX - imageViewState.dragStartX;
			const deltaY = clientY - imageViewState.dragStartY;
			imageViewState.panX += deltaX;
			imageViewState.panY += deltaY;
			imageViewState.dragStartX = clientX;
			imageViewState.dragStartY = clientY;
		},

		// ドラッグ終了
		endDrag(): void {
			if (imageViewState.isDragging) {
				imageViewState.isDragging = false;
				document.body.style.cursor = '';
			}
		},
	};

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
		if ((event.button === 0 || event.button === 1) && isZoomed) {
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
	<div class="relative h-full w-full">
		<div
			class="absolute"
			class:transition-all={shouldShowTransition}
			class:duration-200={shouldShowTransition}
			style="width: {imageViewState.zoomLevel * 100}%; height: {imageViewState.zoomLevel * 100}%; left: 50%; top: 50%; transform: translate(calc(-50% + {imageViewState.panX}px), calc(-50% + {imageViewState.panY}px)); cursor: {imageViewState.isDragging
				? 'grabbing'
				: isZoomed
					? 'grab'
					: 'auto'};"
		>
			<img
				src={imageUrl}
				alt={imagePath}
				class="h-full w-full object-contain"
			/>
		</div>
	</div>
</div>

<!-- Zoom reset button -->
{#if isZoomed}
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
