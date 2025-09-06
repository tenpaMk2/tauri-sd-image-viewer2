<script lang="ts">
	import Icon from '@iconify/svelte';

	type Props = {
		icon: string;
		title: string;
		onClick: () => void;
		extraClass?: string;
		variant?: 'default' | 'white';
	};

	const { icon, title, onClick, extraClass = '', variant = 'default' }: Props = $props();

	const baseClass =
		variant === 'white' ? 'btn text-white btn-ghost btn-sm' : 'btn btn-ghost btn-sm';
</script>

<button class="{baseClass} {extraClass}" onclick={onClick} {title}>
	<Icon icon="lucide:{icon}" class="h-4 w-4" />
</button>
