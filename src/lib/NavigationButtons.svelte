<script lang="ts">
	import { navigationStore } from '$lib/stores/navigation-store.svelte';
	import { viewerUIStore } from '$lib/stores/viewer-ui-store.svelte';
	import Icon from '@iconify/svelte';

	const { state: navigationState, getters: navigationGetters } = navigationStore;
	const { state: viewerUIState } = viewerUIStore;
</script>

<!-- 前の画像ボタン -->
{#if navigationGetters.hasPrevious}
	<div
		class="absolute top-1/2 left-6 flex h-16 w-16 -translate-y-1/2 items-center justify-center transition-opacity duration-300"
		class:pointer-events-none={!viewerUIState.isVisible}
	>
		<button
			class="btn btn-circle btn-ghost btn-lg"
			class:btn-disabled={navigationState.isNavigating}
			aria-label="Previous image"
			onclick={() => navigationStore.actions.navigatePrevious()}
		>
			{#if navigationState.isNavigating}
				<span class="loading loading-sm loading-spinner"></span>
			{:else}
				<Icon icon="lucide:chevron-left" class="h-6 w-6" />
			{/if}
		</button>
	</div>
{/if}

<!-- 次の画像ボタン -->
{#if navigationGetters.hasNext}
	<div
		class="absolute top-1/2 right-6 flex h-16 w-16 -translate-y-1/2 items-center justify-center transition-opacity duration-300"
		class:pointer-events-none={!viewerUIState.isVisible}
	>
		<button
			class="btn btn-circle btn-ghost btn-lg"
			class:btn-disabled={navigationState.isNavigating}
			aria-label="Next image"
			onclick={() => navigationStore.actions.navigateNext()}
		>
			{#if navigationState.isNavigating}
				<span class="loading loading-sm loading-spinner"></span>
			{:else}
				<Icon icon="lucide:chevron-right" class="h-6 w-6" />
			{/if}
		</button>
	</div>
{/if}
