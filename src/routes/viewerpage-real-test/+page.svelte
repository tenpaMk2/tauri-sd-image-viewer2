<script lang="ts">
	import ViewerPage from '$lib/ViewerPage.svelte';
	
	// 実際の画像ファイルパス（ログから取得した実在するファイル）
	const testImagePath = '/Users/tenpamk2/Downloads/sample-sets/00136-catTowerNoobaiXL_v18Vpred_to-love-ru-yui-no-lora_long-sleeves-navel-kenzen_sitting-head-tilt-index-finger-raised_stairs-on-elevated-mid_embarrassed-closed-mouth-effect_civok_ani6dr6og8us5ks4.png';
	
	// モックコールバック関数
	const mockOnImageChange = async (newPath: string): Promise<void> => {
		console.log('🔄 [Mock] onImageChange called with:', newPath.split('/').pop());
	};
	
	const mockOpenFileDialog = (): void => {
		console.log('📁 [Mock] openFileDialog called');
	};
	
	const mockOnSwitchToGrid = async (): Promise<void> => {
		console.log('🔲 [Mock] onSwitchToGrid called');
	};
	
	const mockRefreshMetadata = async (): Promise<void> => {
		console.log('🔄 [Mock] refreshMetadata called');
	};
	
	// テスト開始ログ
	console.log('🧪 ViewerPage Real Test initialized');
	console.log('🖼️ Test image path:', testImagePath.split('/').pop());
</script>

<svelte:head>
	<title>ViewerPage Real Test</title>
</svelte:head>

<!-- テスト説明ヘッダー -->
<div class="fixed top-0 left-0 right-0 z-50 bg-info text-info-content p-2 text-center">
	<span class="font-bold">🧪 ViewerPage Real Test</span> - 
	実際のViewerPageコンポーネントの動作テスト - 
	<a href="/" class="btn btn-xs btn-outline ml-2">← Back to Welcome</a>
</div>

<!-- 実際のViewerPageコンポーネントを表示 -->
<div class="pt-12">
	<ViewerPage
		imagePath={testImagePath}
		onImageChange={mockOnImageChange}
		openFileDialog={mockOpenFileDialog}
		onSwitchToGrid={mockOnSwitchToGrid}
		refreshMetadata={mockRefreshMetadata}
	/>
</div>