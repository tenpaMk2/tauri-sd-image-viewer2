<script lang="ts">
	const {
		imagePath,
		thumbnailUrl,
		rating,
		isSelected = false,
		isLoading = false,
		onImageClick,
		onToggleSelection,
		onRatingChange
	}: {
		imagePath: string;
		thumbnailUrl?: string;
		rating?: number;
		isSelected?: boolean;
		isLoading?: boolean;
		onImageClick: (imagePath: string) => void;
		onToggleSelection?: (imagePath: string) => void;
		onRatingChange?: (imagePath: string, newRating: number) => void;
	} = $props();

	let isRatingHovered = $state(false);
	let hoveredRating = $state(0);

	// デバッグログ
	$effect(() => {
		if (imagePath.includes('00047') || imagePath.includes('00048')) {
			console.log('ImageThumbnail デバッグ:', {
				imagePath: imagePath.split('/').pop(),
				thumbnailUrl: thumbnailUrl?.substring(0, 50) + '...',
				isLoading,
				hasThumbnailUrl: !!thumbnailUrl,
				componentState: thumbnailUrl ? 'サムネイル有り' : isLoading ? 'ローディング中' : 'No Image'
			});
		}
	});

	// サムネイル表示状態の詳細ログ
	$effect(() => {
		const fileName = imagePath.split('/').pop();
		if (fileName && (fileName.includes('00047') || fileName.includes('00048'))) {
			console.log('レンダリング状態:', {
				fileName,
				renderCondition: thumbnailUrl ? 'thumbnailUrl' : isLoading ? 'loading' : 'noImage',
				willShowThumbnail: !!thumbnailUrl,
				willShowLoading: isLoading,
				willShowNoImage: !thumbnailUrl && !isLoading
			});
		}
	});

	const handleClick = (event: MouseEvent): void => {
		if (onToggleSelection) {
			onToggleSelection(imagePath, event.shiftKey);
		}
	};

	const handleDoubleClick = (): void => {
		onImageClick(imagePath);
	};

	const handleCheckboxChange = (e: Event): void => {
		e.stopPropagation();
		if (onToggleSelection) {
			onToggleSelection(imagePath);
		}
	};

	// Rating星表示を生成（編集可能版）
	const generateStars = (rating?: number): string => {
		if (!rating || rating < 1 || rating > 5) {
			return '';
		}
		return '★'.repeat(rating);
	};

	// Rating編集関連のハンドラー
	const handleRatingMouseEnter = (starIndex: number) => {
		isRatingHovered = true;
		hoveredRating = starIndex;
	};

	const handleRatingMouseLeave = () => {
		isRatingHovered = false;
		hoveredRating = 0;
	};

	const handleRatingClick = (e: Event, newRating: number) => {
		e.stopPropagation(); // 画像クリックイベントを防ぐ
		if (onRatingChange) {
			onRatingChange(imagePath, newRating);
		}
	};

	// 表示用のRating値（ホバー中は予想値、それ以外は実際の値）
	const displayRating = $derived(isRatingHovered ? hoveredRating : rating || 0);
</script>

<div class="group relative cursor-pointer">
	<button
		class="aspect-square w-full cursor-pointer overflow-hidden rounded-lg border-0 bg-base-200 p-0 shadow-md transition-all duration-200 hover:bg-primary/10 hover:shadow-lg"
		class:ring-4={isSelected}
		class:ring-blue-500={isSelected}
		class:opacity-80={isSelected}
		onclick={handleClick}
		ondblclick={handleDoubleClick}
		onkeydown={(e) => e.key === 'Enter' && handleClick()}
		aria-label="画像を選択（ダブルクリックで開く）"
	>
		{#if thumbnailUrl}
			<div class="relative flex h-full w-full items-center justify-center p-1">
				<img
					src={thumbnailUrl}
					alt="thumbnail"
					class="h-full w-full rounded object-contain"
					loading="lazy"
					onload={() => {
						const fileName = imagePath.split('/').pop();
						if (fileName && (fileName.includes('00047') || fileName.includes('00048'))) {
							console.log('画像読み込み完了:', fileName);
						}
					}}
					onerror={(e) => {
						const fileName = imagePath.split('/').pop();
						if (fileName && (fileName.includes('00047') || fileName.includes('00048'))) {
							console.log('画像読み込みエラー:', fileName, e);
						}
					}}
				/>
			</div>
		{:else if isLoading}
			<div class="flex h-full flex-col items-center justify-center bg-base-300/30">
				<div class="loading mb-2 loading-sm loading-spinner"></div>
				<div class="text-xs text-base-content/50">読み込み中...</div>
			</div>
		{:else}
			<div class="flex h-full flex-col items-center justify-center bg-base-300/20">
				<div class="mb-1 text-2xl opacity-30">📷</div>
				<div class="text-xs text-base-content/50">No Image</div>
			</div>
		{/if}
	</button>

	<!-- Rating オーバーレイ表示 -->
	<div
		class="absolute bottom-1 left-1/2 -translate-x-1/2 rounded bg-black/30 px-1 py-0.5"
		role="group"
		aria-label="画像評価"
		onmouseleave={handleRatingMouseLeave}
	>
		<div class="flex gap-0.5" title={`Rating: ${rating || 0}/5 (クリックで変更)`}>
			{#each Array(5) as _, i}
				<button
					class="text-sm transition-colors duration-100 hover:scale-110 {i < displayRating
						? 'text-white'
						: 'text-white/30'}"
					onmouseenter={() => handleRatingMouseEnter(i + 1)}
					onclick={(e) => handleRatingClick(e, i + 1)}
					style="text-shadow: 0 1px 2px rgba(0,0,0,0.8);"
					aria-label={`${i + 1}星評価`}
				>
					★
				</button>
			{/each}
		</div>
	</div>

</div>
