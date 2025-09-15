<script lang="ts">
	import OptionsModal from '$lib/components/OptionsModal.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import { navigateToGrid, navigateToViewer } from '$lib/services/app-navigation';
	import { dragAndDropService, type DragAndDropResult } from '$lib/services/drag-and-drop';
	import { initializeLogger } from '$lib/services/logger';
	import { onMount } from 'svelte';
	import '../app.css';
	import type { LayoutProps } from './$types';

	// onMountではなく、スクリプト実行時すぐに初期化
	initializeLogger();

	const { children }: LayoutProps = $props();

	onMount(() => {
		// ↓のログはロガーの初期化前に終わるのでログに出ない。
		console.log('💐Setting up drag & drop functionality');

		let unlistenDragDrop: (() => void) | null = null;

		dragAndDropService
			.setupDragDropListener((result: DragAndDropResult) => {
				console.log('Drag & drop result:', result);

				switch (result.kind) {
					case 'file':
						navigateToViewer(result.path);
						break;
					case 'directory':
						navigateToGrid(result.path);
						break;
				}
			})
			.then((unlisten) => {
				unlistenDragDrop = unlisten;
			});

		// Cleanup function
		return () => {
			console.log('Cleaning up drag & drop listener');
			unlistenDragDrop?.();
		};
	});

	// オプションモーダル状態
	let isOptionsModalOpen = $state(false);

	// オプションモーダル操作
	const openOptionsModal = () => {
		isOptionsModalOpen = true;
	};

	const closeOptionsModal = () => {
		isOptionsModalOpen = false;
	};
</script>

<div class="h-screen min-h-screen">
	<!-- Options button positioned at top-right -->
	<div class="absolute top-4 right-4">
		<IconButton
			icon="settings"
			title="Options"
			size="medium"
			onClick={openOptionsModal}
			extraClass="btn-ghost"
		/>
	</div>

	{@render children()}
</div>

<OptionsModal {isOptionsModalOpen} onClose={closeOptionsModal} />
<Toast />
