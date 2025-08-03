<script lang="ts">
	import ImageViewer from '$lib/ImageViewer.svelte';
	
	interface ImageMetadata {
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
	
	const sampleImageData: ImageMetadata = {
		filename: 'sample-image.jpg',
		size: '2.3 MB',
		dimensions: '1920 × 1080',
		format: 'JPEG',
		created: '2024-01-15 14:30:25',
		modified: '2024-01-15 14:30:25',
		camera: 'Canon EOS R5',
		lens: 'RF 24-70mm f/2.8L IS USM',
		settings: 'f/5.6, 1/250s, ISO 100'
	};
</script>

<svelte:head>
	<title>画像ビュワー</title>
</svelte:head>

<div class="min-h-screen bg-base-100">
	<div class="navbar bg-base-200 shadow-lg">
		<div class="flex-1">
			<h1 class="text-xl font-bold">画像ビュワー</h1>
		</div>
	</div>
	
	<main class="container mx-auto p-4">
		<ImageViewer metadata={sampleImageData} />
	</main>
</div>