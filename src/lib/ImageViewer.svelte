<script lang="ts">
	type ImageMetadata = {
		filename: string;
		size: string;
		dimensions: string;
		format: string;
		created: string;
		modified: string;
		camera?: string;
		lens?: string;
		settings?: string;
	}
	
	const { metadata }: { metadata: ImageMetadata } = $props();
	
	const getImageUrl = (filename: string) => `/${filename}`;
</script>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-8rem)]">
	<!-- 左側: 画像表示エリア -->
	<div class="card bg-base-200 shadow-xl">
		<div class="card-body p-4">
			<h2 class="card-title text-lg mb-4">画像表示</h2>
			<div class="flex-1 flex items-center justify-center bg-base-300 rounded-lg overflow-hidden">
				<img 
					src={getImageUrl(metadata.filename)} 
					alt={metadata.filename}
					class="max-w-full max-h-full object-contain"
				/>
			</div>
		</div>
	</div>
	
	<!-- 右側: メタ情報表示エリア -->
	<div class="card bg-base-200 shadow-xl">
		<div class="card-body p-4">
			<h2 class="card-title text-lg mb-4">画像情報</h2>
			<div class="space-y-4">
				<!-- 基本情報 -->
				<div class="bg-base-300 p-4 rounded-lg">
					<h3 class="font-semibold text-base mb-3">基本情報</h3>
					<div class="grid grid-cols-2 gap-2 text-sm">
						<div class="text-base-content/70">ファイル名:</div>
						<div class="font-mono">{metadata.filename}</div>
						
						<div class="text-base-content/70">サイズ:</div>
						<div>{metadata.size}</div>
						
						<div class="text-base-content/70">解像度:</div>
						<div>{metadata.dimensions}</div>
						
						<div class="text-base-content/70">形式:</div>
						<div>{metadata.format}</div>
					</div>
				</div>
				
				<!-- 日時情報 -->
				<div class="bg-base-300 p-4 rounded-lg">
					<h3 class="font-semibold text-base mb-3">日時情報</h3>
					<div class="grid grid-cols-2 gap-2 text-sm">
						<div class="text-base-content/70">作成日時:</div>
						<div class="font-mono text-xs">{metadata.created}</div>
						
						<div class="text-base-content/70">更新日時:</div>
						<div class="font-mono text-xs">{metadata.modified}</div>
					</div>
				</div>
				
				<!-- 撮影情報 (任意) -->
				{#if metadata.camera || metadata.lens || metadata.settings}
					<div class="bg-base-300 p-4 rounded-lg">
						<h3 class="font-semibold text-base mb-3">撮影情報</h3>
						<div class="grid grid-cols-2 gap-2 text-sm">
							{#if metadata.camera}
								<div class="text-base-content/70">カメラ:</div>
								<div>{metadata.camera}</div>
							{/if}
							
							{#if metadata.lens}
								<div class="text-base-content/70">レンズ:</div>
								<div>{metadata.lens}</div>
							{/if}
							
							{#if metadata.settings}
								<div class="text-base-content/70">設定:</div>
								<div class="font-mono text-xs">{metadata.settings}</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>