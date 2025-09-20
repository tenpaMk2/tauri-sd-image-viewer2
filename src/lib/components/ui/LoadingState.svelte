<script lang="ts">
	import {
		LOADING_STATUS_CONFIG,
		type LoadingStatusType,
	} from '$lib/services/loading-status-config';
	import Icon from '@iconify/svelte';

	type Props = {
		status: LoadingStatusType;
		variant?: 'default' | 'compact' | 'big';
	};

	const { status, variant = 'default' }: Props = $props();
	const config = $derived(LOADING_STATUS_CONFIG[status]);
</script>

{#if variant === 'compact'}
	<!-- RatingComponent用のコンパクトレイアウト -->
	<div class="flex items-center gap-1">
		{#if config.icon}
			<Icon icon="lucide:{config.icon}" class="h-3 w-3" />
		{:else if config.loadingIcon}
			<span class="loading loading-xs {config.loadingIcon}"></span>
		{/if}
		<span class="text-xs">
			{config.text}
		</span>
	</div>
{:else if variant === 'big'}
	<!-- ページ遷移用の大きなレイアウト -->
	<div class="flex flex-col items-center justify-center py-8">
		{#if config.icon}
			<Icon icon="lucide:{config.icon}" class="mb-4 text-6xl" />
		{:else if config.loadingIcon}
			<span class="loading mb-4 loading-xl {config.loadingIcon}"></span>
		{/if}
		<div class="text-lg">
			{config.text}
		</div>
	</div>
{:else}
	<!-- デフォルトレイアウト -->
	<div class="flex flex-col items-center justify-center py-4">
		{#if config.icon}
			<Icon icon="lucide:{config.icon}" class="mb-1 text-xl" />
		{:else if config.loadingIcon}
			<span class="loading mb-2 loading-sm {config.loadingIcon}"></span>
		{/if}
		<div class="text-xs">
			{config.text}
		</div>
	</div>
{/if}
