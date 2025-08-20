<script lang="ts">
	import BasicInfoSection from './components/metadata/BasicInfoSection.svelte';
	import SdParamsSection from './components/metadata/SdParamsSection.svelte';
	import XmpSection from './components/metadata/XmpSection.svelte';
	import { imageMetadataStore } from './stores/image-metadata-store.svelte';

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
		return imageMetadataStore.getMetadata(imagePath);
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
			size: metadata.autoFileSize ? `${Math.round(metadata.autoFileSize / 1024)} KB` : 'Unknown',
			dimensions:
				metadata.autoWidth && metadata.autoHeight
					? `${metadata.autoWidth} × ${metadata.autoHeight}`
					: 'Unknown',
			format: metadata.autoMimeType || 'Unknown',
			created: 'Unknown', // TODO: 必要に応じて実装
			modified: 'Unknown', // TODO: 必要に応じて実装
			camera: undefined, // カメラ情報は廃止済み
			lens: undefined, // レンズ情報は廃止済み
			settings: undefined, // 設定情報は廃止済み
			sdParameters: metadata.autoSdParameters,
			rating: metadata.rating ?? 0 // 直接ratingを使用（autoRatingはPromiseなので）
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
