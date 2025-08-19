<script lang="ts">
	import { getVersion } from '@tauri-apps/api/app';
	import { onMount } from 'svelte';

	const {
		openFileDialog
	}: {
		openFileDialog: () => void;
	} = $props();

	let version = $state<string>('');

	// バージョン情報を取得（一回だけの初期化処理）
	onMount(async () => {
		try {
			version = await getVersion();
		} catch (error) {
			console.error('Failed to get app version: ' + error);
		}
	});

	console.log('🧪 [Test] TestWelcome initialized');
</script>

<div class="flex h-full flex-col items-center justify-center bg-base-100 text-center">
	<div class="mb-4 text-6xl">🧪</div>
	<h2 class="mb-2 text-2xl font-bold">ViewerPage Test Environment</h2>
	<p class="mb-2 text-sm text-base-content/50">Simplified test configuration</p>
	<p class="mb-6 text-base-content/70">Select an image file to test ViewerPage</p>

	<div class="flex flex-col gap-4">
		<button class="btn btn-lg btn-primary" onclick={openFileDialog}> 🖼️ Open Test Image </button>

		<div class="divider">Debug Info</div>
		<div class="text-xs text-base-content/50">
			<p>• Toast components excluded</p>
			<p>• Minimal app store</p>
			<p>• Direct ViewerPage integration</p>
		</div>
	</div>
</div>
