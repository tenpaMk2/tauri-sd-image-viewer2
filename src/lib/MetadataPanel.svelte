<script lang="ts">
	import BasicInfoSection from './components/metadata/BasicInfoSection.svelte';
	import SdParamsSection from './components/metadata/SdParamsSection.svelte';
	import XmpSection from './components/metadata/XmpSection.svelte';

	const {
		imagePath,
		onFocus,
		onBlur
	}: {
		imagePath: string;
		onFocus?: () => void;
		onBlur?: () => void;
	} = $props();
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
			<BasicInfoSection {imagePath} />
			<SdParamsSection {imagePath} />
			<XmpSection {imagePath} />
		</div>
	</div>
</div>
