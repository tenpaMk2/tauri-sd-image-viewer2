<script lang="ts">
	import StatsDisplay from '$lib/components/StatsDisplay.svelte';
	import ToolBar from '$lib/components/ToolBar.svelte';
	import { appStore } from '$lib/stores/app-store.svelte';
	import Icon from '@iconify/svelte';
	import FilterPanel from './FilterPanel.svelte';
	import { gridUiStore } from './stores/grid-ui-store.svelte';

	const { actions: appActions } = appStore;
	const { state: gridUiState } = gridUiStore;
</script>

<div class="sticky top-0 z-10 bg-base-200">
	<!-- Header Bar -->
	<div class="flex items-center justify-between p-4">
		<div class="flex items-center gap-4">
			<button
				class="btn btn-ghost btn-sm"
				onclick={() => appActions.transitionToWelcome()}
				title="Back to Home"
			>
				<Icon icon="lucide:home" class="h-4 w-4" />
			</button>
			<StatsDisplay />
		</div>

		<ToolBar />
	</div>

	<!-- Filter Panel -->
	{#if gridUiState.filterPanelVisible}
		<FilterPanel />
	{/if}
</div>
