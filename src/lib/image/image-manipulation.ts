// 画像操作関連の型定義とユーティリティ関数

export type ImageViewState = {
	zoomLevel: number;
	panX: number;
	panY: number;
	isDragging: boolean;
	dragStartX: number;
	dragStartY: number;
	fitScale: number;
};

export const createImageViewState = (): ImageViewState => ({
	zoomLevel: 1,
	panX: 0,
	panY: 0,
	isDragging: false,
	dragStartX: 0,
	dragStartY: 0,
	fitScale: 1
});

export const resetImageViewState = (state: ImageViewState): void => {
	state.zoomLevel = 1;
	state.panX = 0;
	state.panY = 0;
	state.isDragging = false;
	// fitScaleは保持してトランジション問題を回避
};

// 画像のウィンドウフィット用スケールを計算
export const calculateFitScale = (
	imageElement: HTMLImageElement,
	containerElement: HTMLDivElement
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

// ズーム操作の処理
export const handleZoom = (
	state: ImageViewState,
	deltaY: number,
	zoomFactor: number = 0.1,
	minZoom: number = 0.1,
	maxZoom: number = 3
): void => {
	if (deltaY < 0) {
		state.zoomLevel = Math.min(state.zoomLevel + zoomFactor, maxZoom);
	} else {
		state.zoomLevel = Math.max(state.zoomLevel - zoomFactor, minZoom);
		// ズームアウト時にパン位置をリセット
		if (state.zoomLevel <= 1) {
			state.panX = 0;
			state.panY = 0;
		}
	}
};

// ドラッグ開始の処理
export const startDrag = (state: ImageViewState, clientX: number, clientY: number): void => {
	state.isDragging = true;
	state.dragStartX = clientX;
	state.dragStartY = clientY;
	document.body.style.cursor = 'grabbing';
};

// ドラッグ移動の処理
export const updateDrag = (state: ImageViewState, clientX: number, clientY: number): void => {
	if (!state.isDragging) return;

	const deltaX = clientX - state.dragStartX;
	const deltaY = clientY - state.dragStartY;
	state.panX += deltaX;
	state.panY += deltaY;
	state.dragStartX = clientX;
	state.dragStartY = clientY;
};

// ドラッグ終了の処理
export const endDrag = (state: ImageViewState): void => {
	if (state.isDragging) {
		state.isDragging = false;
		document.body.style.cursor = '';
	}
};
