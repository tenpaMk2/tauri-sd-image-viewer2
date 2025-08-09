<script lang="ts">
	import BasicInfoSection from './components/metadata/BasicInfoSection.svelte';
	import CameraInfoSection from './components/metadata/CameraInfoSection.svelte';
	import ExifInfoSection from './components/metadata/ExifInfoSection.svelte';
	import SdParamsSection from './components/metadata/SdParamsSection.svelte';
	import type { ImageMetadata } from './image/types';
	import { unifiedMetadataService } from './services/unified-metadata-service.svelte';

	const {
		metadata,
		imagePath,
		onRatingUpdate,
		onFocus,
		onBlur
	}: {
		metadata: ImageMetadata;
		imagePath?: string;
		onRatingUpdate?: () => void;
		onFocus?: () => void;
		onBlur?: () => void;
	} = $props();

	// Rating更新機能（排他制御付き）
	const updateRating = async (rating: number) => {
		if (!imagePath) return;

		const success = await unifiedMetadataService.updateImageRating(imagePath, rating);
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
			<BasicInfoSection {metadata} />
			<ExifInfoSection {metadata} {imagePath} />
			<SdParamsSection {metadata} />
			<CameraInfoSection {metadata} />
		</div>
	</div>
</div>
