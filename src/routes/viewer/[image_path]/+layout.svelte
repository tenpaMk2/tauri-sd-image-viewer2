<script lang="ts">
	import { navigating, page } from '$app/state';
	import BasicInfoSection from '$lib/components/metadata/BasicInfoSection.svelte';
	import RatingComponent from '$lib/components/metadata/RatingComponent.svelte';
	import SdParamsSection from '$lib/components/metadata/SdParamsSection.svelte';
	import XmpSection from '$lib/components/metadata/XmpSection.svelte';
	import LoadingState from '$lib/components/ui/LoadingState.svelte';
	import ImageViewer from '$lib/components/viewer/ImageViewer.svelte';
	import NavigationButton from '$lib/components/viewer/NavigationButton.svelte';
	import Toolbar from '$lib/components/viewer/Toolbar.svelte';
	import UiWrapper from '$lib/components/viewer/UiWrapper.svelte';
	import {
		UI_VISIBILITY_CONTEXT,
		type UiVisibilityContext,
	} from '$lib/components/viewer/ui-visibility';
	import {
		VIEWER_PAGE_DATA_CONTEXT,
		type ViewerPageDataContext,
	} from '$lib/components/viewer/viewer-page-data';
	import { imageCacheStore } from '$lib/services/image-cache-store';
	import { createNavigationKeyboardHandler } from '$lib/services/keyboard-shortcut';
	import { Pane, PaneGroup, PaneResizer } from 'paneforge';
	import { setContext } from 'svelte';
	import type { LayoutProps } from './$types';
	import type { ViewerPageData } from './+page';

	const { children }: LayoutProps = $props();

	// UI表示制御用のローカル状態
	let isUiVisible = $state(true);

	// SvelteKit推奨の関数ベースContext
	setContext<() => UiVisibilityContext>(UI_VISIBILITY_CONTEXT, () => ({
		state: isUiVisible,
	}));
	setContext<() => ViewerPageDataContext>(VIEWER_PAGE_DATA_CONTEXT, () => ({
		state: page.data as ViewerPageData,
	}));

	const { navigationStore, imagePath, title, url, metadataStore } = $derived(
		page.data as ViewerPageData,
	);

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
	<Pane defaultSize={75} data-theme="dark">
		<div class="relative h-full">
			<main>
				<ImageViewer imageUrl={url} {imagePath} />

				{@render children()}
			</main>

			<!-- Top toolbar -->
			<UiWrapper positionClass="top-0 right-0 left-0">
				<Toolbar />
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
				<RatingComponent {imagePath} {metadataStore} />
			</UiWrapper>

			{#if navigating.complete}
				<div
					class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-base-100/30 px-8 py-4"
				>
					<LoadingState status="loading" variant="big" />
				</div>
			{/if}
		</div>
	</Pane>
	<PaneResizer class="w-2 bg-blue-400/20 transition-colors hover:bg-primary" data-theme="dark" />
	<Pane defaultSize={25} maxSize={50} minSize={15} collapsible={true}>
		<aside class="h-full space-y-4 overflow-y-auto bg-base-200 p-4 select-text">
			<BasicInfoSection />
			<SdParamsSection />
			<XmpSection />
		</aside>
	</Pane>
</PaneGroup>
