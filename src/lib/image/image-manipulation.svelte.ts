// 画像操作関連の型定義とユーティリティ関数

export type ImageViewState = {
	zoomLevel: number;
	panX: number;
	panY: number;
	isDragging: boolean;
	dragStartX: number;
	dragStartY: number;
	fitScale: number;
	isZooming: boolean;
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

// 画像ビューサービスクラス
export class ImageViewService {
	private state = $state<ImageViewState>({
		zoomLevel: 1,
		panX: 0,
		panY: 0,
		isDragging: false,
		dragStartX: 0,
		dragStartY: 0,
		fitScale: 1,
		isZooming: false
	});

	// 状態の読み取り専用アクセス
	get viewState(): ImageViewState {
		return this.state;
	}

	// 状態リセット
	reset(): void {
		this.state.zoomLevel = 1;
		this.state.panX = 0;
		this.state.panY = 0;
		this.state.isDragging = false;
		this.state.isZooming = false;
		// fitScaleは保持してトランジション問題を回避
	}

	// 画像読み込み完了時の処理（ズーム状態をリセット）
	onImageLoaded(imageElement: HTMLImageElement, containerElement: HTMLDivElement): void {
		// まずフィットスケールを計算
		const newFitScale = calculateFitScale(imageElement, containerElement);
		this.state.fitScale = newFitScale;

		// その後にズーム状態をリセット
		this.state.zoomLevel = 1;
		this.state.panX = 0;
		this.state.panY = 0;
		this.state.isDragging = false;
		this.state.isZooming = false;
	}

	// 画像切り替え準備（fitScaleは保持、ズーム状態のみリセット）
	prepareForNewImage(): void {
		this.state.zoomLevel = 1;
		this.state.panX = 0;
		this.state.panY = 0;
		this.state.isDragging = false;
		this.state.isZooming = false;
		// fitScaleは保持して、新しい画像が読み込まれるまで前のスケールを使用
	}

	// ズーム操作
	zoom(deltaY: number, zoomFactor: number = 0.1, minZoom: number = 1, maxZoom: number = 3): void {
		// ズーミング状態を開始
		this.state.isZooming = true;

		if (deltaY < 0) {
			// 拡大
			this.state.zoomLevel = Math.min(this.state.zoomLevel + zoomFactor, maxZoom);
		} else {
			// 縮小（ウィンドウフィットサイズ以下にはしない）
			this.state.zoomLevel = Math.max(this.state.zoomLevel - zoomFactor, minZoom);
			// ズームレベルが1以下になった時はパン位置をリセット
			if (this.state.zoomLevel <= 1) {
				this.state.panX = 0;
				this.state.panY = 0;
			}
		}

		// 次フレームでズーミング状態を終了（トランジション開始後）
		requestAnimationFrame(() => {
			this.state.isZooming = false;
		});
	}

	// ズームリセット
	resetZoom(): void {
		// ズーミング状態を開始
		this.state.isZooming = true;

		this.reset();

		// 次フレームでズーミング状態を終了（トランジション開始後）
		requestAnimationFrame(() => {
			this.state.isZooming = false;
		});
	}

	// ドラッグ開始
	startDrag(clientX: number, clientY: number): void {
		// ドラッグ開始時はズーミング状態を終了
		this.state.isZooming = false;
		this.state.isDragging = true;
		this.state.dragStartX = clientX;
		this.state.dragStartY = clientY;
		document.body.style.cursor = 'grabbing';
	}

	// ドラッグ更新
	updateDrag(clientX: number, clientY: number): void {
		if (!this.state.isDragging) return;

		const deltaX = clientX - this.state.dragStartX;
		const deltaY = clientY - this.state.dragStartY;
		this.state.panX += deltaX;
		this.state.panY += deltaY;
		this.state.dragStartX = clientX;
		this.state.dragStartY = clientY;
	}

	// ドラッグ終了
	endDrag(): void {
		if (this.state.isDragging) {
			this.state.isDragging = false;
			document.body.style.cursor = '';
		}
	}

	// フィットスケール設定
	setFitScale(scale: number): void {
		this.state.fitScale = scale;
	}
}
