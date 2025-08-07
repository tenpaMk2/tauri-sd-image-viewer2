<script lang="ts">
	import Icon from '@iconify/svelte';

	const {
		imageFiles,
		currentIndex,
		openFileDialog,
		onSwitchToGrid,
		onToggleInfoPanel,
		isInfoPanelVisible,
		onToggleAutoNavigation,
		isAutoNavActive,
		isUIVisible
	}: {
		imageFiles: string[];
		currentIndex: number;
		openFileDialog: () => void;
		onSwitchToGrid?: () => void;
		onToggleInfoPanel?: () => void;
		isInfoPanelVisible?: boolean;
		onToggleAutoNavigation?: () => void;
		isAutoNavActive?: boolean;
		isUIVisible?: boolean;
	} = $props();
</script>

<!-- オーバーレイツールバー -->
<div 
	class="absolute top-0 right-0 left-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4 transition-opacity duration-300"
	class:opacity-0={!isUIVisible}
	class:pointer-events-none={!isUIVisible}
>
	<div class="flex items-center text-white">
		<!-- 左側: ページ情報 -->
		<div class="flex items-center gap-4">
			{#if 1 < imageFiles.length}
				<div class="text-sm opacity-80">
					{currentIndex + 1} / {imageFiles.length}
				</div>
			{/if}
		</div>

		<!-- 中央: メインボタン群 -->
		<div class="flex-1 flex justify-center items-center gap-2">
			<button
				class="btn text-white btn-ghost btn-sm"
				onclick={openFileDialog}
				title="ファイルを開く"
			>
				<Icon icon="lucide:image-plus" class="h-4 w-4" />
			</button>
			{#if onToggleAutoNavigation}
				<button
					class="btn text-white btn-sm"
					class:btn-ghost={!isAutoNavActive}
					class:btn-active={isAutoNavActive}
					onclick={onToggleAutoNavigation}
					title={isAutoNavActive ? '自動ナビゲーションを停止' : '最新画像への自動ナビゲーションを開始'}
				>
					<Icon icon="lucide:skip-forward" class="h-4 w-4" />
				</button>
			{/if}
			{#if onSwitchToGrid}
				<button
					class="btn text-white btn-ghost btn-sm"
					onclick={onSwitchToGrid}
					title="グリッド表示"
				>
					<Icon icon="lucide:layout-grid" class="h-4 w-4" />
				</button>
			{/if}
		</div>

		<!-- 右側: 情報ペインボタン -->
		<div class="flex items-center gap-2">
			{#if onToggleInfoPanel}
				<button
					class="btn text-white btn-ghost btn-sm"
					onclick={onToggleInfoPanel}
					title={isInfoPanelVisible ? '情報ペインを隠す' : '情報ペインを表示'}
				>
					<Icon
						icon={isInfoPanelVisible ? 'lucide:panel-right-close' : 'lucide:panel-right-open'}
						class="h-4 w-4"
					/>
				</button>
			{/if}
		</div>
	</div>
</div>
