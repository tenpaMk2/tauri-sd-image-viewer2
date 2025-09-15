<script lang="ts">
	import { navigating, page } from '$app/state';
	import BasicInfoSection from '$lib/components/metadata/BasicInfoSection.svelte';
	import RatingComponent from '$lib/components/metadata/RatingComponent.svelte';
	import SdParamsSection from '$lib/components/metadata/SdParamsSection.svelte';
	import XmpSection from '$lib/components/metadata/XmpSection.svelte';
	import NavigationButton from '$lib/components/viewer/NavigationButton.svelte';
	import SimpleToolbar from '$lib/components/viewer/Toolbar.svelte';
	import UiWrapper from '$lib/components/viewer/UiWrapper.svelte';
	import ImageViewer from '$lib/components/viewer/ImageViewer.svelte';
	import { imageCacheStore } from '$lib/services/image-cache-store';
	import { createNavigationKeyboardHandler } from '$lib/services/keyboard-shortcut';
	import type { MetadataStore } from '$lib/services/metadata-store';
	import { type NavigationStore } from '$lib/services/navigation-store';
	import { Pane, PaneGroup, PaneResizer } from 'paneforge';
	import { setContext } from 'svelte';
	import type { LayoutProps } from './$types';
	import type { ViewerPageData } from './+page';

	const { children }: LayoutProps = $props();

	const { navigationStore, metadataStorePromise, imagePath, title, url } = $derived(
		page.data as ViewerPageData,
	);

	// UI表示制御用のローカル状態
	let isUiVisible = $state(true);

	// SvelteKit推奨の関数ベースContext
	setContext<() => boolean>('isUiVisible', () => isUiVisible);
	setContext<() => NavigationStore>('navigationStore', () => navigationStore);
	setContext<() => Promise<MetadataStore>>('metadataStorePromise', () => metadataStorePromise);
	setContext<() => string>('imagePath', () => imagePath);

	let hideTimer: ReturnType<typeof setTimeout> | null = null;

	// マウス動作でUI表示制御
	const handleMouseMove = () => {
		isUiVisible = true;
		if (hideTimer) {
			clearTimeout(hideTimer);
		}
		hideTimer = setTimeout(() => {
			isUiVisible = false;
		}, 3000);
	};

	// マウス移動イベントリスナー
	$effect(() => {
		const cleanupTimer = () => {
			if (hideTimer) {
				clearTimeout(hideTimer);
				hideTimer = null;
			}
		};

		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('keydown', handleMouseMove);

		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('keydown', handleMouseMove);
			cleanupTimer();
		};
	});

	// Cleanup URLs on unmount
	$effect(() => {
		return () => {
			console.log('🐟Clear all cache');
			imageCacheStore.actions.clearAll();
		};
	});

	// Keyboard navigation
	$effect(() => {
		const navigationHandler = createNavigationKeyboardHandler({
			navigateToNext: () => {
				if (!navigating.complete) {
					navigationStore.actions.navigateToNext();
				}
			},
			navigateToPrevious: () => {
				if (!navigating.complete) {
					navigationStore.actions.navigateToPrevious();
				}
			},
		});
		navigationHandler.addEventListeners();

		return () => {
			navigationHandler.removeEventListeners();
		};
	});
</script>

<svelte:head>
	<title>Viewer: {title}</title>
</svelte:head>

<PaneGroup direction="horizontal" role="application" aria-label="Image viewer">
	<Pane defaultSize={75}>
		<div class="relative h-full">
			<main>
				<ImageViewer imageUrl={url} {imagePath} />

				{@render children()}
			</main>

			<!-- Top toolbar -->
			<UiWrapper positionClass="top-0 right-0 left-0">
				<SimpleToolbar />
			</UiWrapper>

			<!-- Navigation button: left -->
			<UiWrapper positionClass="top-1/2 left-4 -translate-y-1/2">
				<NavigationButton direction="left" />
			</UiWrapper>

			<!-- Navigation button: right -->
			<UiWrapper positionClass="top-1/2 right-4 -translate-y-1/2">
				<NavigationButton direction="right" />
			</UiWrapper>

			<!-- Rating overlay -->
			<UiWrapper positionClass="bottom-4 left-1/2 -translate-x-1/2">
				<RatingComponent />
			</UiWrapper>

			{#if navigating.complete}
				<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
					<div class="h-24 w-24 rounded-full bg-black/20 blur-sm"></div>
				</div>
				<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
					<p><span class="loading loading-xl p-8"></span></p>
				</div>
			{/if}
		</div>
	</Pane>
	<PaneResizer class="w-2 bg-blue-400/20 transition-colors hover:bg-primary" />
	<Pane defaultSize={25} maxSize={50} minSize={15} collapsible={true}>
		<aside class="h-full overflow-y-auto bg-base-200 p-4">
			<div class="space-y-4">
				<BasicInfoSection />
				<SdParamsSection />
				<XmpSection />
			</div>
		</aside>
	</Pane>
</PaneGroup>
