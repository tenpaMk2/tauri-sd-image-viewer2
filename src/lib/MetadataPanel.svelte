<script lang="ts">
	import type { ImageMetadata } from './image/types';
	import { updateImageRating } from './utils/rating-utils';
	import BasicInfoSection from './components/metadata/BasicInfoSection.svelte';
	import DateTimeSection from './components/metadata/DateTimeSection.svelte';
	import SdParamsSection from './components/metadata/SdParamsSection.svelte';
	import ExifInfoSection from './components/metadata/ExifInfoSection.svelte';
	import CameraInfoSection from './components/metadata/CameraInfoSection.svelte';

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

<!-- 右側: 情報ペイン (固定幅) -->
<div
	class="w-80 overflow-y-auto bg-base-200 shadow-2xl"
	tabindex="0"
	role="tabpanel"
	aria-label="画像情報パネル"
	onfocus={onFocus}
	onblur={onBlur}
>
	<div class="p-4">
		<h2 class="mb-4 text-lg font-bold">画像情報</h2>
		<div class="space-y-4">
			<BasicInfoSection {metadata} />
			<DateTimeSection {metadata} />
			<SdParamsSection {metadata} />
			<ExifInfoSection {metadata} />
			<CameraInfoSection {metadata} />
		</div>
	</div>
</div>
