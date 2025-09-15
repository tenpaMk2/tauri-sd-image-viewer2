<script lang="ts">
	import { getContext } from 'svelte';

	type Props = {
		positionClass: string;
		children: import('svelte').Snippet;
	};

	const { positionClass, children }: Props = $props();
	const isUiVisible = $derived(getContext<() => boolean>('isUiVisible')());
</script>

<div
	class="pointer-events-auto absolute transition-opacity duration-300 {positionClass}"
	class:opacity-0={!isUiVisible}
>
	{@render children()}
</div>
