<script lang="ts">
	import BasicInfoSection from './components/metadata/BasicInfoSection.svelte';
	import CameraInfoSection from './components/metadata/CameraInfoSection.svelte';
	import SdParamsSection from './components/metadata/SdParamsSection.svelte';
	import { metadataService } from './services/metadata-service.svelte';

	const {
		imagePath,
		onRatingUpdate,
		onFocus,
		onBlur
	}: {
		imagePath: string;
		onRatingUpdate?: () => void;
		onFocus?: () => void;
		onBlur?: () => void;
	} = $props();

	// リアクティブなメタデータを取得
	const reactiveMetadata = $derived(metadataService.getReactiveMetadata(imagePath));

	// メタデータの自動読み込み
	$effect(() => {
		if (!reactiveMetadata.isLoaded && !reactiveMetadata.isLoading) {
			reactiveMetadata.load();
		}
	});

	// 従来の形式でのメタデータ提供（互換性のため）
	const legacyMetadata = $derived({
		filename: reactiveMetadata.imagePath.split('/').pop() || '',
		size: reactiveMetadata.fileSize
			? `${Math.round(reactiveMetadata.fileSize / 1024)} KB`
			: 'Unknown',
		dimensions:
			reactiveMetadata.width && reactiveMetadata.height
				? `${reactiveMetadata.width} × ${reactiveMetadata.height}`
				: 'Unknown',
		format: reactiveMetadata.mimeType || 'Unknown',
		created: 'Unknown', // TODO: 必要に応じて実装
		modified: 'Unknown', // TODO: 必要に応じて実装
		camera: undefined, // カメラ情報は廃止済み
		lens: undefined, // レンズ情報は廃止済み
		settings: undefined, // 設定情報は廃止済み
		sdParameters: reactiveMetadata.sdParameters,
		rating: reactiveMetadata.rating
	});

	// Rating更新機能（新しいストア使用）
	const updateRating = async (rating: number) => {
		const success = await reactiveMetadata.updateRating(rating);
		if (success) {
			// Rating更新成功時のコールバック実行
			onRatingUpdate?.();
		} else {
			console.warn('Rating更新が拒否されました（書き込み中またはエラー）:', imagePath);
		}
	};
</script>

<!-- Right: Info Panel (Resizable) -->
<div
	class="h-full w-full overflow-y-auto bg-base-200 shadow-2xl"
	tabindex="0"
	role="tabpanel"
	aria-label="Image Info Panel"
	onfocus={onFocus}
	onblur={onBlur}
>
	<div class="p-3">
		<div class="metadata-content space-y-3">
			<BasicInfoSection metadata={legacyMetadata} />
			<SdParamsSection metadata={legacyMetadata} />
			<CameraInfoSection metadata={legacyMetadata} />
		</div>
	</div>
</div>
