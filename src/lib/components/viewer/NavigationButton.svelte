<script lang="ts">
	import type { NavigationStore } from '$lib/services/navigation-store';
	import { getContext } from 'svelte';
	import IconButton from '../ui/IconButton.svelte';

	type Props = {
		direction: 'left' | 'right';
	};
	const { direction }: Props = $props();

	const navigation = $derived(getContext<() => NavigationStore>('navigationStore')());

	const imagePath = $derived(
		direction === 'left' ? navigation.state.previousImagePath : navigation.state.nextImagePath,
	);
	const ariaLabel = direction === 'left' ? 'Previous image' : 'Next image';
	const icon = direction === 'left' ? 'chevron-left' : 'chevron-right';

	const handleNavigation = () => {
		if (direction === 'left') {
			navigation.actions.navigateToPrevious();
		} else {
			navigation.actions.navigateToNext();
		}
	};
</script>

{#if imagePath}
	<div class="flex h-16 w-16 items-center justify-center">
		<button
			aria-label={ariaLabel}
			onclick={handleNavigation}
		>
			<IconButton {icon} title={ariaLabel} size="large" circle />
		</button>
	</div>
{/if}
