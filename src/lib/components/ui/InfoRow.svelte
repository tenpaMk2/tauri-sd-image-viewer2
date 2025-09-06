<script lang="ts">
	type Props = {
		label: string;
		value: string;
		extraClass?: string;
	};

	const { label, value, extraClass = '' }: Props = $props();
</script>

<div class="flex justify-between">
	<div class="text-base-content/70">{label}:</div>
	<div class={extraClass}>
		{value}
	</div>
</div>
