// 内部処理用のMutable型定義
type MutableImageViewState = {
	zoomLevel: number;
	panX: number;
	panY: number;
	isDragging: boolean;
	dragStartX: number;
	dragStartY: number;
	fitScale: number;
	isZooming: boolean;
};

// 画像ビューの状態型定義（読み取り専用）
export type ImageViewState = Readonly<MutableImageViewState>;

// 画像のウィンドウフィット用スケールを計算（内部関数）
const calculateFitScale = (
	imageElement: HTMLImageElement,
	containerElement: HTMLDivElement,
): number => {
	if (!imageElement || !containerElement) return 1;

	const containerRect = containerElement.getBoundingClientRect();
	const availableWidth = containerRect.width;
	const availableHeight = containerRect.height;

	const imageNaturalWidth = imageElement.naturalWidth;
	const imageNaturalHeight = imageElement.naturalHeight;

	if (imageNaturalWidth === 0 || imageNaturalHeight === 0) return 1;

	const scaleX = availableWidth / imageNaturalWidth;
	const scaleY = availableHeight / imageNaturalHeight;

	return Math.min(scaleX, scaleY);
};

// 初期状態
const INITIAL_IMAGE_VIEW_STATE: MutableImageViewState = {
	zoomLevel: 1,
	panX: 0,
	panY: 0,
	isDragging: false,
	dragStartX: 0,
	dragStartY: 0,
	fitScale: 1,
	isZooming: false,
};

// 画像ビューストア
const createImageViewStore = () => {
	let state = $state<MutableImageViewState>({ ...INITIAL_IMAGE_VIEW_STATE });

	// ズーム状態が変更されたかどうかを判定
	const isZoomed = $derived(state.zoomLevel > 1 || state.panX !== 0 || state.panY !== 0);

	const actions = {
		// 状態リセット
		reset(): void {
			state.zoomLevel = 1;
			state.panX = 0;
			state.panY = 0;
			state.isDragging = false;
			state.isZooming = false;
			// fitScaleは保持してトランジション問題を回避
		},

		// 画像読み込み完了時の処理（ズーム状態をリセット）
		onImageLoaded(imageElement: HTMLImageElement, containerElement: HTMLDivElement): void {
			// まずフィットスケールを計算
			const newFitScale = calculateFitScale(imageElement, containerElement);
			state.fitScale = newFitScale;

			// その後にズーム状態をリセット
			state.zoomLevel = 1;
			state.panX = 0;
			state.panY = 0;
			state.isDragging = false;
			state.isZooming = false;
		},

		// 画像切り替え準備（fitScaleは保持、ズーム状態のみリセット）
		prepareForNewImage(): void {
			state.zoomLevel = 1;
			state.panX = 0;
			state.panY = 0;
			state.isDragging = false;
			state.isZooming = false;
			// fitScaleは保持して、新しい画像が読み込まれるまで前のスケールを使用
		},

		// ズーム操作
		zoom(deltaY: number, zoomFactor: number = 0.1, minZoom: number = 1, maxZoom: number = 3): void {
			// ズーミング状態を開始
			state.isZooming = true;

			if (deltaY < 0) {
				// 拡大
				state.zoomLevel = Math.min(state.zoomLevel + zoomFactor, maxZoom);
			} else {
				// 縮小（ウィンドウフィットサイズ以下にはしない）
				state.zoomLevel = Math.max(state.zoomLevel - zoomFactor, minZoom);
				// ズームレベルが1以下になった時はパン位置をリセット
				if (state.zoomLevel <= 1) {
					state.panX = 0;
					state.panY = 0;
				}
			}

			// 次フレームでズーミング状態を終了（トランジション開始後）
			requestAnimationFrame(() => {
				state.isZooming = false;
			});
		},

		// ズームリセット
		resetZoom(): void {
			// ズーミング状態を開始
			state.isZooming = true;

			actions.reset();

			// 次フレームでズーミング状態を終了（トランジション開始後）
			requestAnimationFrame(() => {
				state.isZooming = false;
			});
		},

		// ドラッグ開始
		startDrag(clientX: number, clientY: number): void {
			// ドラッグ開始時はズーミング状態を終了
			state.isZooming = false;
			state.isDragging = true;
			state.dragStartX = clientX;
			state.dragStartY = clientY;
			document.body.style.cursor = 'grabbing';
		},

		// ドラッグ更新
		updateDrag(clientX: number, clientY: number): void {
			if (!state.isDragging) return;

			const deltaX = clientX - state.dragStartX;
			const deltaY = clientY - state.dragStartY;
			state.panX += deltaX;
			state.panY += deltaY;
			state.dragStartX = clientX;
			state.dragStartY = clientY;
		},

		// ドラッグ終了
		endDrag(): void {
			if (state.isDragging) {
				state.isDragging = false;
				document.body.style.cursor = '';
			}
		},

		// フィットスケール設定
		setFitScale(scale: number): void {
			state.fitScale = scale;
		},
	};

	return {
		state: state as ImageViewState,
		getters: {
			get isZoomed() {
				return isZoomed;
			},
		},
		actions,
	};
};

export const imageViewStore = createImageViewStore();
