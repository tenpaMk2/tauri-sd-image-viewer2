<script lang="ts">
	import { page } from '$app/state';
	import BasicInfoSection from '$lib/components/metadata/BasicInfoSection.svelte';
	import RatingComponent from '$lib/components/metadata/RatingComponent.svelte';
	import SdParamsSection from '$lib/components/metadata/SdParamsSection.svelte';
	import XmpSection from '$lib/components/metadata/XmpSection.svelte';
	import NavigationButton from '$lib/components/viewer/NavigationButton.svelte';
	import SimpleToolbar from '$lib/components/viewer/Toolbar.svelte';
	import UiWrapper from '$lib/components/viewer/UiWrapper.svelte';
	import { createNavigationKeyboardHandler } from '$lib/services/keyboard-shortcut';
	import type { MetadataStore } from '$lib/services/metadata-store';
	import { type NavigationStore } from '$lib/services/navigation-store';
	import { Pane, PaneGroup, PaneResizer } from 'paneforge';
	import { setContext } from 'svelte';
	import type { LayoutProps } from './$types';
	import type { ViewerPageData } from './+page';

	const { children }: LayoutProps = $props();

	const { navigation, metadataStorePromise, imagePath, title, urlPromise } = $derived(
		page.data as ViewerPageData,
	);

	// UI表示制御用のローカル状態
	let isUiVisible = $state(true);

	// SvelteKit推奨の関数ベースContext
	setContext<() => boolean>('isUiVisible', () => isUiVisible);
	setContext<() => NavigationStore>('navigationStore', () => navigation);
	setContext<() => Promise<MetadataStore>>('metadataStorePromise', () => metadataStorePromise);
	setContext<() => string>('imagePath', () => imagePath);

	let imgEl = $state<HTMLImageElement | null>(null);

	$effect(() => {
		imgEl; // for reactivity

		return () => {
			console.warn('Revoke URL✋', !!imgEl);
			if (!imgEl) return;

			console.warn('Revoke URL🦷:', imgEl.src);
			const srcUrl = imgEl.src;
			URL.revokeObjectURL(srcUrl);
		};
	});

	// Keyboard navigation
	$effect(() => {
		const navigationHandler = createNavigationKeyboardHandler({ navigation });
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
			<!-- Top toolbar -->
			<UiWrapper positionClass="top-0 right-0 left-0 z-10">
				<SimpleToolbar />
			</UiWrapper>

			<!-- Navigation buttons -->
			<UiWrapper positionClass="top-1/2 left-4 -translate-y-1/2">
				<NavigationButton direction="left" />
			</UiWrapper>

			<UiWrapper positionClass="top-1/2 right-4 -translate-y-1/2">
				<NavigationButton direction="right" />
			</UiWrapper>

			<!-- Rating overlay -->
			<UiWrapper positionClass="bottom-4 left-1/2 -translate-x-1/2">
				<RatingComponent />
			</UiWrapper>

			<main>
				<div class="h-lvh w-full">
					{#await urlPromise then url}
						<img
							bind:this={imgEl}
							src={url}
							alt={imagePath}
							class="h-full w-full object-contain"
							style="image-rendering: auto;"
						/>
					{/await}
				</div>

				{@render children()}
			</main>
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
