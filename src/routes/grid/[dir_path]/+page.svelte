<script lang="ts">
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { navigateToWelcome } from '$lib/services/app-navigation';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	const handleBackToWelcome = (): void => {
		navigateToWelcome();
	};
</script>

<div class="flex h-full flex-col bg-base-100">
	<!-- Header -->
	<header class="flex items-center gap-4 bg-base-200 p-4">
		<IconButton icon="home" title="Back to Welcome" onClick={handleBackToWelcome} />
		<div class="flex-1">
			<h1 class="truncate text-lg font-semibold text-base-content">
				Grid View - {decodeURIComponent(data.params.dir_path)}
			</h1>
		</div>
	</header>

	<!-- Main Content -->
	<main class="flex flex-1 items-center justify-center p-8">
		<div class="text-center">
			<h2 class="mb-4 text-2xl font-bold text-base-content">🚧 Under Construction 🚧</h2>
			<p class="text-base-content/70">Grid view is coming soon...</p>
		</div>
	</main>
</div>
