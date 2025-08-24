<script lang="ts">
	import { appStore } from '$lib/stores/app-store.svelte';
	import StatsDisplay from '$lib/components/StatsDisplay.svelte';
	import ToolBar from '$lib/components/ToolBar.svelte';
	import Icon from '@iconify/svelte';
</script>

<div class="flex items-center justify-between bg-base-200 p-4">
	<div class="flex items-center gap-4">
		<button
			class="btn btn-ghost btn-sm"
			onclick={async () => await appStore.actions.transitionToWelcome()}
			title="Back to Home"
		>
			<Icon icon="lucide:home" class="h-4 w-4" />
		</button>
		<StatsDisplay />
	</div>

	<ToolBar />
</div>
