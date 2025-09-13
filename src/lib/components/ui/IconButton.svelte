<script lang="ts">
	import Icon from '@iconify/svelte';

	type Props = {
		icon: string;
		title: string;
		circle?: boolean;
		size?: 'large' | 'medium' | 'small';
		spinnerKind?: string;
		onClick?: () => void;
		extraClass?: string;
	};

	const {
		icon,
		title,
		circle = false,
		size = 'medium',
		spinnerKind = '',
		onClick,
		extraClass = '',
	}: Props = $props();

	const CONFIG = {
		large: { btnSize: 'btn-lg', iconSize: 'h-7 w-7' },
		medium: { btnSize: 'btn-sm', iconSize: 'h-4 w-4' },
		small: { btnSize: 'btn-xs', iconSize: 'h-3 w-3' },
	};

	const { btnSize, iconSize } = $derived(CONFIG[size]);
</script>

<button
	class="btn btn-ghost btn-primary {btnSize} {extraClass}"
	class:btn-circle={circle}
	onclick={onClick}
	{title}
>
	{#if spinnerKind}
		<p class="loading {spinnerKind} {iconSize}"></p>
	{:else}
		<Icon icon="lucide:{icon}" class={iconSize} />
	{/if}
</button>
