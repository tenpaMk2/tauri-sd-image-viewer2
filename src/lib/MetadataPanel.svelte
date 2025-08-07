<script lang="ts">
	import BasicInfoSection from './components/metadata/BasicInfoSection.svelte';
	import CameraInfoSection from './components/metadata/CameraInfoSection.svelte';
	import ExifInfoSection from './components/metadata/ExifInfoSection.svelte';
	import SdParamsSection from './components/metadata/SdParamsSection.svelte';
	import type { ImageMetadata } from './image/types';
	import { updateImageRating } from './utils/rating-utils';

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

	// Rating更新機能
	const updateRating = async (rating: number) => {
		if (!imagePath) return;

		try {
			await updateImageRating(imagePath, rating);
			// Rating更新後のコールバック実行
			onRatingUpdate?.();
		} catch (error) {
			// エラーハンドリングは共通関数内で処理済み
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
			<ExifInfoSection {metadata} />
			<SdParamsSection {metadata} />
			<CameraInfoSection {metadata} />
		</div>
	</div>
</div>
