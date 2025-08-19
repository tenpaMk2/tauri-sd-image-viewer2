<script lang="ts">
	import { navigationService } from '$lib/services/navigation-service.svelte';
	import Icon from '@iconify/svelte';

	const {
		openFileDialog,
		onSwitchToGrid,
		onToggleInfoPanel,
		isInfoPanelVisible,
		onToggleAutoNavigation,
		isAutoNavActive,
		isUIVisible,
		onCopyToClipboard,
		isMacOS
	}: {
		openFileDialog: () => void;
		onSwitchToGrid?: () => Promise<void>;
		onToggleInfoPanel?: () => void;
		isInfoPanelVisible?: boolean;
		onToggleAutoNavigation?: () => void;
		isAutoNavActive?: boolean;
		isUIVisible?: boolean;
		onCopyToClipboard?: () => void;
		isMacOS?: boolean;
	} = $props();
</script>

<!-- Overlay Toolbar -->
<div
	class="absolute top-0 right-0 left-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4 transition-opacity duration-300"
	class:opacity-0={!isUIVisible}
	class:pointer-events-none={!isUIVisible}
>
	<div class="flex items-center text-white">
		<!-- Left: Page Info -->
		<div class="flex items-center gap-4">
			{#if 1 < navigationService.files.length}
				<div class="text-sm opacity-80">
					{navigationService.currentIndex + 1} / {navigationService.files.length}
				</div>
			{/if}
		</div>

		<!-- Center: Main Buttons -->
		<div class="flex flex-1 items-center justify-center gap-2">
			<button class="btn text-white btn-ghost btn-sm" onclick={openFileDialog} title="Open File">
				<Icon icon="lucide:image-plus" class="h-4 w-4" />
			</button>
			{#if onCopyToClipboard}
				<button
					class="btn text-white btn-ghost btn-sm"
					onclick={onCopyToClipboard}
					title="Copy to Clipboard"
				>
					<Icon icon="lucide:clipboard-copy" class="h-4 w-4" />
				</button>
			{/if}
			{#if onToggleAutoNavigation}
				<button
					class="btn text-white btn-sm"
					class:btn-ghost={!isAutoNavActive}
					class:btn-active={isAutoNavActive}
					onclick={onToggleAutoNavigation}
					title={isAutoNavActive ? 'Stop Auto Navigation' : 'Start Auto Navigation to Latest Image'}
				>
					<Icon icon="lucide:skip-forward" class="h-4 w-4" />
				</button>
			{/if}
			{#if onSwitchToGrid}
				<button
					class="btn text-white btn-ghost btn-sm"
					onclick={() => onSwitchToGrid?.()}
					title="Grid View"
				>
					<Icon icon="lucide:layout-grid" class="h-4 w-4" />
				</button>
			{/if}
		</div>

		<!-- Right: Info Panel Button -->
		<div class="flex items-center gap-2">
			{#if onToggleInfoPanel}
				<button
					class="btn text-white btn-ghost btn-sm"
					onclick={onToggleInfoPanel}
					title={isInfoPanelVisible ? 'Hide Info Panel' : 'Show Info Panel'}
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
