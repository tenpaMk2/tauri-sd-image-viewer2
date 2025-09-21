<script lang="ts">
	import { getContext } from 'svelte';
	import type { ClassValue } from 'svelte/elements';
	import { UI_VISIBILITY_CONTEXT, type UiVisibilityContext } from './ui-visibility';

	type Props = {
		positionClass: ClassValue;
		children: import('svelte').Snippet;
	};

	const { positionClass, children }: Props = $props();
	const isUiVisible = $derived(
		getContext<() => UiVisibilityContext>(UI_VISIBILITY_CONTEXT)().state,
	);
</script>

<div
	class="pointer-events-auto absolute transition-opacity duration-300 {positionClass}"
	class:opacity-0={!isUiVisible}
>
	{@render children()}
</div>
