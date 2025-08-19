<script lang="ts">
	console.log('🧪 Test page loaded');

	// 基本的な$state変数
	let simpleString = $state<string>('initial value');
	let simpleNumber = $state<number>(0);
	let simpleBoolean = $state<boolean>(false);

	// オブジェクト形式の$state（テストしやすい初期状態に変更）
	let complexState = $state<{
		url: string;
		isLoading: boolean;
		error: string;
	}>({
		url: '',
		isLoading: false,
		error: ''
	});

	// $effect でリアクティブ更新を監視
	$effect(() => {
		console.log('🔍 simpleString changed: ' + simpleString);
	});

	$effect(() => {
		console.log('🔍 simpleNumber changed: ' + simpleNumber);
	});

	$effect(() => {
		console.log('🔍 simpleBoolean changed: ' + simpleBoolean);
	});

	$effect(() => {
		console.log('🔍 complexState changed - url: ' + (complexState.url || 'empty') + 
			' isLoading: ' + complexState.isLoading + 
			' error: ' + (complexState.error || 'empty'));
	});

	// 子コンポーネントのprops監視用
	let childProps = $state<{
		message: string;
		count: number;
	}>({
		message: 'initial message',
		count: 0
	});

	$effect(() => {
		console.log('🔍 childProps changed - message: ' + childProps.message + ' count: ' + childProps.count);
	});

	// 更新関数群
	const updateString = () => {
		simpleString = 'updated at ' + new Date().toLocaleTimeString();
		console.log('📝 String updated to: ' + simpleString);
	};

	const updateNumber = () => {
		simpleNumber = simpleNumber + 1;
		console.log('📝 Number updated to: ' + simpleNumber);
	};

	const toggleBoolean = () => {
		simpleBoolean = !simpleBoolean;
		console.log('📝 Boolean updated to: ' + simpleBoolean);
	};

	const updateComplexState = () => {
		// オブジェクトプロパティ直接変更（URLを設定してSuccessパスをテスト）
		complexState.url = 'blob:test-' + Date.now();
		complexState.isLoading = false;
		complexState.error = '';
		console.log('📝 ComplexState properties updated - URL set');
	};

	const replaceComplexState = () => {
		// オブジェクト全体を置き換え（エラー状態をテスト）
		complexState = {
			url: '',
			isLoading: false,
			error: 'Test error message'
		};
		console.log('📝 ComplexState object replaced - Error set');
	};

	const updateChildProps = () => {
		// 子コンポーネント用props更新
		childProps = {
			message: 'updated message at ' + new Date().toLocaleTimeString(),
			count: childProps.count + 1
		};
		console.log('📝 ChildProps updated');
	};

	// 初期化時のログ（リアクティブ対応）
	$effect(() => {
		console.log('🧪 Test page initialized - simpleString: ' + simpleString + 
			' simpleNumber: ' + simpleNumber + 
			' simpleBoolean: ' + simpleBoolean);
	});
</script>

<!-- テスト用子コンポーネント -->
{#snippet TestChild(message: string, count: number)}
	<div class="border border-gray-300 p-4 m-2">
		<h3 class="font-bold">Child Component</h3>
		<p>Message: {message}</p>
		<p>Count: {count}</p>
		{#if typeof message === 'string' && typeof count === 'number'}
			<p class="text-green-600">✅ Props received correctly</p>
		{:else}
			<p class="text-red-600">❌ Props type error</p>
		{/if}
	</div>
{/snippet}

<div class="container mx-auto p-8">
	<h1 class="text-3xl font-bold mb-6">Svelte 5 Reactivity Test</h1>
	
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<!-- 基本的な$state変数テスト -->
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title">Basic $state Variables</h2>
				<div class="space-y-2">
					<p>String: <span class="font-mono">{simpleString}</span></p>
					<p>Number: <span class="font-mono">{simpleNumber}</span></p>
					<p>Boolean: <span class="font-mono">{simpleBoolean}</span></p>
				</div>
				<div class="card-actions justify-end space-x-2">
					<button class="btn btn-primary btn-sm" onclick={updateString}>Update String</button>
					<button class="btn btn-secondary btn-sm" onclick={updateNumber}>Update Number</button>
					<button class="btn btn-accent btn-sm" onclick={toggleBoolean}>Toggle Boolean</button>
				</div>
			</div>
		</div>

		<!-- 複雑な$stateオブジェクトテスト -->
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title">Complex $state Object</h2>
				<div class="space-y-2">
					<p>URL: <span class="font-mono text-sm">{complexState.url || 'empty'}</span></p>
					<p>Loading: <span class="font-mono">{complexState.isLoading}</span></p>
					<p>Error: <span class="font-mono">{complexState.error || 'empty'}</span></p>
				</div>
				<div class="card-actions justify-end space-x-2">
					<button class="btn btn-success btn-sm" onclick={updateComplexState}>Set URL (Success)</button>
					<button class="btn btn-error btn-sm" onclick={replaceComplexState}>Set Error</button>
				</div>
			</div>
		</div>

		<!-- 条件分岐テスト -->
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title">Conditional Rendering</h2>
				<div class="space-y-2">
					{#if complexState.error && complexState.error.length > 0}
						<div class="alert alert-error">
							<span>❌ Error: {complexState.error}</span>
						</div>
					{:else if complexState.url && complexState.url.length > 0}
						<div class="alert alert-success">
							<span>✅ URL exists: {complexState.url.substring(0, 20)}...</span>
						</div>
					{:else if complexState.isLoading}
						<div class="alert alert-info">
							<span>⏳ Loading state</span>
						</div>
					{:else}
						<div class="alert alert-warning">
							<span>❓ Default state</span>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- 子コンポーネントprops伝播テスト -->
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title">Props Propagation Test</h2>
				{@render TestChild(childProps.message, childProps.count)}
				<div class="card-actions justify-end">
					<button class="btn btn-info btn-sm" onclick={updateChildProps}>Update Child Props</button>
				</div>
			</div>
		</div>
	</div>

	<!-- テスト手順の説明 -->
	<div class="alert alert-info mt-6">
		<span>
			🔍 <strong>テスト手順:</strong><br>
			1. 各ボタンをクリックして状態変更を確認<br>
			2. Conditional Renderingが正しく切り替わることを確認<br>
			3. 開発者ツールのコンソールで`🔍`ログを確認<br>
			<strong>期待する流れ:</strong> Default → URL exists → Error の順で表示が変化
		</span>
	</div>
</div>