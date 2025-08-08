<script lang="ts">
	type ResizerHook = {
		isDragging: boolean;
		handleMouseDown: (e: MouseEvent) => void;
	};

	export const createResizerHook = (onWidthChange: (width: number) => void): ResizerHook => {
		let isDragging = $state<boolean>(false);

		const handleMouseMove = (e: MouseEvent): void => {
			if (!isDragging) return;

			const newWidth = window.innerWidth - e.clientX;
			const minWidth = 200;
			const maxWidth = window.innerWidth * 0.6;
			const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
			onWidthChange(clampedWidth);
		};

		const handleMouseUp = (): void => {
			isDragging = false;
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};

		const handleMouseDown = (e: MouseEvent): void => {
			isDragging = true;
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
			e.preventDefault();
		};

		return {
			get isDragging() {
				return isDragging;
			},
			handleMouseDown
		};
	};
</script>
