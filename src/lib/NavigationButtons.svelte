<script lang="ts">
	import { navigateToNext, navigateToPrevious } from '$lib/services/image-navigation';
	import { navigationStore } from '$lib/stores/navigation-store.svelte';
	import { viewerUIStore } from '$lib/stores/viewer-ui-store.svelte';
	import Icon from '@iconify/svelte';

	const { state: navigationState, deriveds: navigationDeriveds } = navigationStore;
	const { state: viewerUIState } = viewerUIStore;
</script>

{#snippet navigationButton(
	direction: 'left' | 'right',
	isVisible: boolean,
	onClick: () => void,
	ariaLabel: string,
)}
	{#if isVisible}
		<div
			class="absolute top-1/2 {direction === 'left'
				? 'left-6'
				: 'right-6'} flex h-16 w-16 -translate-y-1/2 items-center justify-center transition-opacity duration-300"
			class:pointer-events-none={!viewerUIState.isVisible}
		>
			<button
				class="btn btn-circle btn-ghost btn-lg"
				class:btn-disabled={navigationState.isNavigating}
				aria-label={ariaLabel}
				onclick={onClick}
			>
				{#if navigationState.isNavigating}
					<span class="loading loading-sm loading-spinner"></span>
				{:else}
					<Icon icon="lucide:chevron-{direction}" class="h-6 w-6" />
				{/if}
			</button>
		</div>
	{/if}
{/snippet}

<!-- 前の画像ボタン -->
{@render navigationButton(
	'left',
	navigationDeriveds.hasPrevious,
	navigateToPrevious,
	'Previous image',
)}

<!-- 次の画像ボタン -->
{@render navigationButton('right', navigationDeriveds.hasNext, navigateToNext, 'Next image')}
