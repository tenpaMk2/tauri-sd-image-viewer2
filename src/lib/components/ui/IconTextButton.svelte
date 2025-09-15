<script lang="ts">
	import Icon from '@iconify/svelte';

	type Props = {
		text: string;
		icon?: string;
		size?: 'large' | 'medium' | 'small';
		variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'warning' | 'error';
		onClick?: () => void;
		extraClass?: string;
	};

	const {
		text,
		icon,
		size = 'medium',
		variant = 'primary',
		onClick,
		extraClass = '',
	}: Props = $props();

	const SIZE_CONFIG = {
		large: { btnSize: 'btn-lg', iconSize: 'h-5 w-5' },
		medium: { btnSize: 'btn-sm', iconSize: 'h-4 w-4' },
		small: { btnSize: 'btn-xs', iconSize: 'h-3 w-3' },
	};

	const VARIANT_CONFIG = {
		primary: 'btn-primary',
		secondary: 'btn-secondary',
		outline: 'btn-outline',
		ghost: 'btn-ghost',
		warning: 'btn-warning',
		error: 'btn-error',
	};

	const { btnSize, iconSize } = $derived(SIZE_CONFIG[size]);
	const variantClass = $derived(VARIANT_CONFIG[variant]);
</script>

<button class="btn {btnSize} {variantClass} {extraClass}" onclick={onClick}>
	{#if icon}
		<Icon icon="lucide:{icon}" class="{iconSize} mr-2" />
	{/if}
	{text}
</button>
