<script lang="ts">
	import BasicInfoSection from './components/metadata/BasicInfoSection.svelte';
	import SdParamsSection from './components/metadata/SdParamsSection.svelte';
	import XmpSection from './components/metadata/XmpSection.svelte';
	import { metadataService } from './services/metadata-service.svelte';

	const {
		imagePath,
		onFocus,
		onBlur
	}: {
		imagePath: string;
		onFocus?: () => void;
		onBlur?: () => void;
	} = $props();

	// リアクティブなメタデータを取得
	const metadata = $derived.by(() => {
		if (!imagePath) return null;
		console.log('📊 [MetadataPanel] Getting reactive metadata for: ' + imagePath.split('/').pop());
		return metadataService.getReactiveMetadata(imagePath);
	});

	// メタデータの自動読み込み（非同期処理を$effect外で実行）
	const loadMetadataIfNeeded = async () => {
		if (metadata && !metadata.isLoaded && !metadata.isLoading) {
			console.log('📊 [MetadataPanel] Starting metadata load...');
			try {
				await metadata.load();
				console.log('✅ [MetadataPanel] Metadata load completed');
			} catch (error) {
				console.error('❌ [MetadataPanel] Metadata load failed:', error);
			}
		}
	};

	// メタデータトリガー
	$effect(() => {
		const currentMetadata = metadata;
		console.log('🔄 [MetadataPanel] Metadata changed, checking if load needed...');

		if (currentMetadata && !currentMetadata.isLoaded && !currentMetadata.isLoading) {
			// 非同期処理を外部関数で実行
			loadMetadataIfNeeded();
		}
	});

	// BasicInfoSection用の変換されたデータ
	const basicInfo = $derived.by(() => {
		if (!metadata) {
			return {
				filename: 'No file selected',
				size: 'Unknown',
				dimensions: 'Unknown',
				format: 'Unknown',
				created: 'Unknown',
				modified: 'Unknown',
				camera: undefined,
				lens: undefined,
				settings: undefined,
				sdParameters: undefined,
				rating: 0
			};
		}

		return {
			filename: metadata.imagePath.split('/').pop() || '',
			size: metadata.fileSize ? `${Math.round(metadata.fileSize / 1024)} KB` : 'Unknown',
			dimensions:
				metadata.width && metadata.height ? `${metadata.width} × ${metadata.height}` : 'Unknown',
			format: metadata.mimeType || 'Unknown',
			created: 'Unknown', // TODO: 必要に応じて実装
			modified: 'Unknown', // TODO: 必要に応じて実装
			camera: undefined, // カメラ情報は廃止済み
			lens: undefined, // レンズ情報は廃止済み
			settings: undefined, // 設定情報は廃止済み
			sdParameters: metadata.sdParameters,
			rating: metadata.rating
		};
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
			{#if metadata}
				<XmpSection {metadata} />
			{/if}
		</div>
	</div>
</div>
