<script lang="ts">
export const createCleanupHook = (cleanupFunctions: (() => void)[]) => {
	const cleanup = () => {
		cleanupFunctions.forEach((fn) => {
			try {
				fn();
			} catch (error) {
				console.warn('Cleanup function failed:', error);
			}
		});
	};

	// ページアンロード時のクリーンアップ
	$effect(() => {
		const handleBeforeUnload = () => {
			cleanup();
		};

		window.addEventListener('beforeunload', handleBeforeUnload);

		return () => {
			window.removeEventListener('beforeunload', handleBeforeUnload);
			cleanup();
		};
	});

	return {
		cleanup
	};
};
</script>