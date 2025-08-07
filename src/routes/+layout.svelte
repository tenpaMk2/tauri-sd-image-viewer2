<script lang="ts">
	import '../app.css';
	import { initializeLogger } from '$lib/services/logger';

	// onMountではなく、スクリプト実行時すぐに初期化
	initializeLogger();
</script>

<slot />
