<script lang="ts">
	import { navigateToWelcome } from '$lib/services/app-navigation';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	const handleBackToWelcome = (): void => {
		navigateToWelcome();
	};
</script>

<div class="h-full flex flex-col bg-base-100">
	<!-- Header -->
	<header class="flex items-center gap-4 p-4 bg-base-200">
		<IconButton
			icon="home"
			title="Back to Welcome"
			onClick={handleBackToWelcome}
		/>
		<div class="flex-1">
			<h1 class="text-lg font-semibold text-base-content truncate">
				Grid View - {decodeURIComponent(data.params.dir_path)}
			</h1>
		</div>
	</header>

	<!-- Main Content -->
	<main class="flex-1 flex items-center justify-center p-8">
		<div class="text-center">
			<h2 class="text-2xl font-bold text-base-content mb-4">Under Construction</h2>
			<p class="text-base-content/70">Grid view is coming soon...</p>
		</div>
	</main>
</div>
