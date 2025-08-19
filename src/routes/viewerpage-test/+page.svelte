<script lang="ts">
	// ViewerPageの$state問題を検証するためのテストページ
	
	// ViewerPageと同じ構造の$state変数
	let imageUrl = $state<string>('');
	let imageIsLoading = $state<boolean>(true);
	let imageError = $state<string>('');

	// $effectで変更を監視
	$effect(() => {
		console.log('🔍 Test imageUrl changed: ' + (imageUrl || 'empty'));
	});

	$effect(() => {
		console.log('🔍 Test imageIsLoading changed: ' + imageIsLoading);
	});

	$effect(() => {
		console.log('🔍 Test imageError changed: ' + (imageError || 'empty'));
	});

	// $derivedでpropsオブジェクトを作成（ViewerPageと同じ）
	const testProps = $derived({
		imageUrl: imageUrl,
		isLoading: imageIsLoading,
		error: imageError
	});

	// $derivedの変更を監視
	$effect(() => {
		console.log('🎯 Test props derived: imageUrl=' + (testProps.imageUrl ? 'set' : 'null') + ' isLoading=' + testProps.isLoading + ' error=' + (testProps.error || 'empty'));
	});

	// 状態更新関数（loadCurrentImageと同じパターン）
	const simulateImageLoad = async () => {
		console.log('📸 Starting simulated image load...');
		
		// ローディング開始
		imageUrl = '';
		imageIsLoading = true;
		imageError = '';
		
		// 非同期処理をシミュレート
		await new Promise(resolve => setTimeout(resolve, 1000));
		
		// 成功時の状態更新
		imageUrl = 'blob:test-url-' + Date.now();
		imageIsLoading = false;
		imageError = '';
		
		console.log('✅ Simulated image load completed');
	};

	// エラー状態をシミュレート
	const simulateImageError = async () => {
		console.log('📸 Starting simulated image error...');
		
		// ローディング開始
		imageUrl = '';
		imageIsLoading = true;
		imageError = '';
		
		// 非同期処理をシミュレート
		await new Promise(resolve => setTimeout(resolve, 1000));
		
		// エラー時の状態更新
		imageUrl = '';
		imageIsLoading = false;
		imageError = 'Test error message';
		
		console.log('✅ Simulated image error completed');
	};

	// 初期化ログ
	console.log('🧪 ViewerPage Test initialized');
</script>

<div class="container mx-auto p-8">
	<h1 class="text-3xl font-bold mb-6">ViewerPage $state Test</h1>
	
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<!-- 現在の状態表示 -->
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title">Current State</h2>
				<div class="space-y-2">
					<p>ImageURL: <span class="font-mono text-sm">{imageUrl || 'empty'}</span></p>
					<p>IsLoading: <span class="font-mono">{imageIsLoading}</span></p>
					<p>Error: <span class="font-mono">{imageError || 'empty'}</span></p>
				</div>
			</div>
		</div>

		<!-- テストボタン -->
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title">Test Actions</h2>
				<div class="space-y-4">
					<button class="btn btn-success w-full" onclick={simulateImageLoad}>
						Simulate Image Load Success
					</button>
					<button class="btn btn-error w-full" onclick={simulateImageError}>
						Simulate Image Load Error
					</button>
				</div>
			</div>
		</div>

		<!-- 条件分岐テスト -->
		<div class="card bg-base-100 shadow-xl md:col-span-2">
			<div class="card-body">
				<h2 class="card-title">Conditional Rendering Test</h2>
				<div class="mt-4">
					{#if imageError && imageError.length > 0}
						<div class="alert alert-error">
							<span>❌ Error: {imageError}</span>
						</div>
					{:else if imageUrl && imageUrl.length > 0}
						<div class="alert alert-success">
							<span>✅ Image URL: {imageUrl}</span>
						</div>
					{:else if imageIsLoading}
						<div class="alert alert-info">
							<span>⏳ Loading...</span>
						</div>
					{:else}
						<div class="alert alert-warning">
							<span>❓ Default state</span>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Props表示テスト -->
		<div class="card bg-base-100 shadow-xl md:col-span-2">
			<div class="card-body">
				<h2 class="card-title">$derived Props Test</h2>
				<div class="space-y-2">
					<p>Props ImageURL: <span class="font-mono text-sm">{testProps.imageUrl || 'empty'}</span></p>
					<p>Props IsLoading: <span class="font-mono">{testProps.isLoading}</span></p>
					<p>Props Error: <span class="font-mono">{testProps.error || 'empty'}</span></p>
				</div>
			</div>
		</div>
	</div>

	<!-- テスト手順の説明 -->
	<div class="alert alert-info mt-6">
		<span>
			🔍 <strong>テスト手順:</strong><br>
			1. 開発者ツールのコンソールを開く<br>
			2. 各ボタンをクリックして状態変更を確認<br>
			3. `🔍`ログで$effectが正しく実行されるかを確認<br>
			4. `🎯`ログで$derivedが正しく計算されるかを確認<br>
			5. Conditional Renderingが正しく切り替わるかを確認
		</span>
	</div>
</div>