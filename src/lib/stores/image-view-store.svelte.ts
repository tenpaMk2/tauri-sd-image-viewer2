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

// 画像ビューの状態型定義（読み取り専用）
export type ImageViewState = Readonly<MutableImageViewState>;

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

const _state = $state<MutableImageViewState>({ ...INITIAL_IMAGE_VIEW_STATE });

// ズーム状態が変更されたかどうかを判定
const isZoomed = $derived(1 < _state.zoomLevel || _state.panX !== 0 || _state.panY !== 0);


const actions = {
	// 状態リセット
	reset(): void {
		_state.zoomLevel = 1;
		_state.panX = 0;
		_state.panY = 0;
		_state.isDragging = false;
		_state.isZooming = false;
	},

	// 画像読み込み完了時の処理（ズーム状態をリセット）
	onImageLoaded(): void {
		_state.zoomLevel = 1;
		_state.panX = 0;
		_state.panY = 0;
		_state.isDragging = false;
		_state.isZooming = false;
	},

	// 画像切り替え準備（ズーム状態のみリセット）
	prepareForNewImage(): void {
		_state.zoomLevel = 1;
		_state.panX = 0;
		_state.panY = 0;
		_state.isDragging = false;
		_state.isZooming = false;
	},

	// ズーム操作
	zoom(deltaY: number, zoomFactor: number = 0.1, minZoom: number = 1, maxZoom: number = 3): void {
		// ズーミング状態を開始
		_state.isZooming = true;

		if (deltaY < 0) {
			// 拡大
			_state.zoomLevel = Math.min(_state.zoomLevel + zoomFactor, maxZoom);
		} else {
			// 縮小（ウィンドウフィットサイズ以下にはしない）
			_state.zoomLevel = Math.max(_state.zoomLevel - zoomFactor, minZoom);
			// ズームレベルが1以下になった時はパン位置をリセット
			if (_state.zoomLevel <= 1) {
				_state.panX = 0;
				_state.panY = 0;
			}
		}

		// 次フレームでズーミング状態を終了（トランジション開始後）
		requestAnimationFrame(() => {
			_state.isZooming = false;
		});
	},

	// ズームリセット
	resetZoom(): void {
		// ズーミング状態を開始
		_state.isZooming = true;

		actions.reset();

		// 次フレームでズーミング状態を終了（トランジション開始後）
		requestAnimationFrame(() => {
			_state.isZooming = false;
		});
	},

	// ドラッグ開始
	startDrag(clientX: number, clientY: number): void {
		// ドラッグ開始時はズーミング状態を終了
		_state.isZooming = false;
		_state.isDragging = true;
		_state.dragStartX = clientX;
		_state.dragStartY = clientY;
		document.body.style.cursor = 'grabbing';
	},

	// ドラッグ更新
	updateDrag(clientX: number, clientY: number): void {
		if (!_state.isDragging) return;

		const deltaX = clientX - _state.dragStartX;
		const deltaY = clientY - _state.dragStartY;
		_state.panX += deltaX;
		_state.panY += deltaY;
		_state.dragStartX = clientX;
		_state.dragStartY = clientY;
	},

	// ドラッグ終了
	endDrag(): void {
		if (_state.isDragging) {
			_state.isDragging = false;
			document.body.style.cursor = '';
		}
	},

};

export const imageViewStore = {
	state: _state as ImageViewState,
	deriveds: {
		get isZoomed() {
			return isZoomed;
		},
	},
	actions,
};
