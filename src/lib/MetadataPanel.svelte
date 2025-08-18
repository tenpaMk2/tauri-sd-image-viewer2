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
	const metadata = $derived(metadataService.getReactiveMetadata(imagePath));

	// メタデータの自動読み込み
	$effect(() => {
		if (!metadata.isLoaded && !metadata.isLoading) {
			metadata.load();
		}
	});

	// BasicInfoSection用の変換されたデータ
	const basicInfo = $derived({
		filename: metadata.imagePath.split('/').pop() || '',
		size: metadata.fileSize ? `${Math.round(metadata.fileSize / 1024)} KB` : 'Unknown',
		dimensions: metadata.width && metadata.height 
			? `${metadata.width} × ${metadata.height}` 
			: 'Unknown',
		format: metadata.mimeType || 'Unknown',
		created: 'Unknown', // TODO: 必要に応じて実装
		modified: 'Unknown', // TODO: 必要に応じて実装
		camera: undefined,  // カメラ情報は廃止済み
		lens: undefined,    // レンズ情報は廃止済み
		settings: undefined, // 設定情報は廃止済み
		sdParameters: metadata.sdParameters,
		rating: metadata.rating
	});
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
			<BasicInfoSection metadata={basicInfo} />
			<SdParamsSection metadata={basicInfo} />
			<CameraInfoSection metadata={basicInfo} />
		</div>
	</div>
</div>