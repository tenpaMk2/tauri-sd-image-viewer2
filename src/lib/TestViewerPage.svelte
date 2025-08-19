<script lang="ts">
	import ImageCanvas from './ImageCanvas.svelte';
	import { metadataService } from './services/metadata-service.svelte';
	import { NavigationService, type NavigationState } from './services/navigation-service';

	const {
		imagePath,
		onImageChange,
		openFileDialog,
		onSwitchToGrid
	}: {
		imagePath: string;
		onImageChange?: (newPath: string) => Promise<void>;
		openFileDialog?: () => void;
		onSwitchToGrid?: () => Promise<void>;
	} = $props();

	// NavigationService初期化
	let navigationService: NavigationService;
	try {
		console.log('🧭 [Test] Initializing NavigationService...');
		navigationService = new NavigationService();
		console.log('✅ [Test] NavigationService initialized successfully');
	} catch (error) {
		console.error('❌ [Test] NavigationService initialization failed: ' + error);
		throw error;
	}

	// 最小限の状態管理（ViewerPageと同じ構造）
	let imageUrl = $state<string>('');
	let isLoading = $state<boolean>(true);
	let error = $state<string>('');

	// Navigation状態も追加
	let navigationState = $state<NavigationState>({
		files: [],
		currentIndex: 0,
		isNavigating: false
	});

	// メタデータ関連の状態（簡略化）

	// メタデータサービスを$derivedで取得（状態更新なし）
	let reactiveMetadata = $derived.by(() => {
		if (!imagePath) return null;
		console.log('📊 [TestViewer] Getting reactive metadata for: ' + imagePath.split('/').pop());
		return metadataService.getReactiveMetadata(imagePath);
	});

	console.log('✅ [Test] All states initialized');

	// デバッグ用: 個別状態変更の監視（開発時のみ）
	$effect(() => {
		console.log('🔍 [TestViewer] imageUrl changed:', imageUrl ? 'blob:...' : 'null');
	});

	$effect(() => {
		console.log('🔍 [TestViewer] isLoading changed:', isLoading);
	});

	$effect(() => {
		console.log('🔍 [TestViewer] error changed:', error || 'empty');
	});

	// ImageCanvasへのprops監視（デバッグ用）
	$effect(() => {
		console.log(
			'🎯 [TestViewer] ImageCanvas props: imageUrl=' +
				(imageUrl ? 'set' : 'null') +
				' isLoading=' +
				isLoading +
				' error=' +
				(error || 'empty')
		);
	});

	// NavigationServiceを使用した画像読み込み処理
	const loadCurrentImage = async (path: string): Promise<void> => {
		console.log(
			'📸 [TestViewer] loadCurrentImage called with path: ' +
				(path ? path.split('/').pop() : 'null')
		);
		try {
			// 個別状態を更新
			imageUrl = '';
			isLoading = true;
			error = '';

			console.log('🔄 [TestViewer] Calling navigationService.loadImage...');
			const url = await navigationService.loadImage(path);
			console.log('✅ [TestViewer] Image loaded, URL: ' + (url ? 'blob:...' : 'null'));

			// 成功時の状態更新
			imageUrl = url;
			isLoading = false;
			error = '';

			console.log(
				'🔄 [TestViewer] State updated: imageUrl=' +
					(imageUrl ? 'set' : 'null') +
					' isLoading=' +
					isLoading +
					' error=' +
					(error || 'empty')
			);
		} catch (err) {
			console.error('❌ [TestViewer] loadCurrentImage failed: ' + err);
			// エラー時の状態更新
			imageUrl = '';
			isLoading = false;
			error = err instanceof Error ? err.message : 'Failed to load image';
		}
		console.log(
			'✅ [TestViewer] loadCurrentImage completed, final state: url=' +
				(imageUrl ? 'blob:...' : 'null') +
				' isLoading=' +
				isLoading +
				' error=' +
				(error || 'empty')
		);
	};

	// $effect外で実行される新しい画像読み込み関数（状態更新可能）
	const loadImageForPath = async (path: string): Promise<void> => {
		console.log('📂 [TestViewer] ===== loadImageForPath START =====');
		console.log('📂 [TestViewer] Path: ' + (path ? path.split('/').pop() : 'null'));

		try {
			// 画像状態をリセット
			imageUrl = '';
			isLoading = true;
			error = '';
			console.log('🔄 [TestViewer] Image state reset to loading');

			console.log('🧭 [TestViewer] Calling navigationService.initializeNavigation...');
			const newNavigationState = await navigationService.initializeNavigation(path);

			// Navigation状態を更新
			navigationState.files = newNavigationState.files;
			navigationState.currentIndex = newNavigationState.currentIndex;
			navigationState.isNavigating = newNavigationState.isNavigating;

			console.log(
				'✅ [TestViewer] Navigation initialized: files=' +
					navigationState.files.length +
					' currentIndex=' +
					navigationState.currentIndex
			);

			if (navigationState.files.length === 0) {
				throw new Error('No image files found in the directory');
			}

			console.log('🖼️ [TestViewer] Loading current image...');
			await loadCurrentImage(path);
			console.log('✅ [TestViewer] Current image loaded successfully');

			console.log('📂 [TestViewer] ===== loadImageForPath SUCCESS =====');
		} catch (err) {
			console.error('❌ [TestViewer] loadImageForPath failed: ' + err);
			// エラー時の状態更新
			imageUrl = '';
			isLoading = false;
			error = err instanceof Error ? err.message : 'Failed to load directory';
			console.log('📂 [TestViewer] ===== loadImageForPath FAILED =====');
		}
	};

	// メイン副作用: imagePath変更時の画像読み込みトリガー
	$effect(() => {
		const currentPath = imagePath;
		const metadata = reactiveMetadata; // メタデータ依存関係を追加

		console.log(
			'🔄 [TestViewer] Path/metadata changed, triggering image load: ' +
				(currentPath ? currentPath.split('/').pop() : 'null')
		);
		console.log(
			'📊 [TestViewer] Metadata state: ' +
				(metadata ? 'isLoaded=' + metadata.isLoaded + ' isLoading=' + metadata.isLoading : 'null')
		);

		if (!currentPath) {
			console.warn('⚠️ [TestViewer] No imagePath provided');
			return;
		}

		// メタデータが存在し、読み込み完了または読み込み中でない場合は読み込みを開始
		if (metadata && !metadata.isLoaded && !metadata.isLoading) {
			console.log('📊 [TestViewer] Starting metadata load before image load...');
			metadata
				.load()
				.then(() => {
					console.log('✅ [TestViewer] Metadata load completed, now loading image');
					loadImageForPath(currentPath);
				})
				.catch((error: unknown) => {
					console.error('❌ [TestViewer] Metadata load failed: ' + error);
					// メタデータ読み込み失敗でも画像読み込みは実行
					loadImageForPath(currentPath);
				});
		} else {
			console.log('⏭️ [TestViewer] Metadata already loaded or loading, proceeding with image load');
			// 直接非同期処理を実行（状態更新は関数内で行う）
			loadImageForPath(currentPath);
		}
	});

	console.log(
		'🧪 [TestViewer] TestViewerPage initialized with imagePath: ' +
			(imagePath ? imagePath.split('/').pop() : 'null')
	);
</script>

<!-- デバッグヘッダー -->
<div
	class="fixed top-0 right-0 left-0 z-50 bg-success p-1 text-center text-sm text-success-content"
>
	✅ TestViewerPage - Fixed $effect pattern (no infinite loops)
</div>

<!-- メインコンテンツ -->
<div class="relative flex h-screen pt-8">
	<!-- 画像表示エリア -->
	<div class="relative flex-1 bg-black">
		<!-- 簡易ツールバー（テスト用） -->
		{#if openFileDialog || onSwitchToGrid}
			<div class="absolute top-4 left-4 z-10 flex gap-2">
				{#if openFileDialog}
					<button
						class="btn opacity-80 btn-sm btn-primary hover:opacity-100"
						onclick={() => openFileDialog?.()}
					>
						📁 Open File
					</button>
				{/if}
				{#if onSwitchToGrid}
					<button
						class="btn opacity-80 btn-sm btn-secondary hover:opacity-100"
						onclick={() => onSwitchToGrid?.()}
					>
						🔙 Back to Grid
					</button>
				{/if}
			</div>
		{/if}

		<ImageCanvas {imageUrl} {isLoading} {error} />
	</div>

	<!-- デバッグ情報パネル -->
	<div class="w-80 overflow-y-auto bg-base-200 p-4">
		<h3 class="mb-4 text-lg font-bold">🔍 Debug Info</h3>

		<div class="space-y-4">
			<div>
				<h4 class="font-semibold">Props:</h4>
				<div class="space-y-1 text-sm">
					<p>imagePath: {imagePath ? imagePath.split('/').pop() : 'null'}</p>
					<p>onImageChange: {onImageChange ? 'provided' : 'null'}</p>
					<p>openFileDialog: {openFileDialog ? 'provided' : 'null'}</p>
					<p>onSwitchToGrid: {onSwitchToGrid ? 'provided' : 'null'}</p>
				</div>
			</div>

			<div>
				<h4 class="font-semibold">State:</h4>
				<div class="space-y-1 text-sm">
					<p>imageUrl: {imageUrl ? 'blob:...' : 'null'}</p>
					<p>isLoading: {isLoading}</p>
					<p>error: {error || 'empty'}</p>
					<p>navigationFiles: {navigationState.files.length}</p>
					<p>currentIndex: {navigationState.currentIndex}</p>
					<p>isNavigating: {navigationState.isNavigating}</p>
					<p>
						reactiveMetadata: {reactiveMetadata
							? 'isLoaded=' + reactiveMetadata.isLoaded + ' isLoading=' + reactiveMetadata.isLoading
							: 'null'}
					</p>
				</div>
			</div>

			<div>
				<h4 class="font-semibold">Instructions:</h4>
				<div class="space-y-1 text-xs">
					<p>• Check browser console for 🔍 and 🎯 logs</p>
					<p>• Verify $effect execution</p>
					<p>• Monitor reactive updates</p>
				</div>
			</div>

			<div>
				<h4 class="font-semibold">Test Actions:</h4>
				<div class="space-y-2">
					<button
						class="btn w-full btn-sm btn-primary"
						onclick={() => openFileDialog?.()}
						disabled={!openFileDialog}
					>
						📁 Test Open File Dialog
					</button>
					<button
						class="btn w-full btn-sm btn-secondary"
						onclick={() => onSwitchToGrid?.()}
						disabled={!onSwitchToGrid}
					>
						🔙 Test Switch to Grid
					</button>
				</div>
			</div>
		</div>
	</div>
</div>
