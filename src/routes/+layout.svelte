<script lang="ts">
	import { initializeLogger } from '$lib/services/logger';
	import Toast from '$lib/components/ui/Toast.svelte';
	import '../app.css';
	import type { LayoutProps } from './$types';

	// onMountではなく、スクリプト実行時すぐに初期化
	initializeLogger();

	const { children }: LayoutProps = $props();
</script>

<div class="h-screen min-h-screen">
	{@render children()}
</div>

<Toast />
