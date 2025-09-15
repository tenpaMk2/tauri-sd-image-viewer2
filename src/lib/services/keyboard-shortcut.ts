
export type NavigationKeyboardOptions = {
	navigateToNext: () => void;
	navigateToPrevious: () => void;
};

export type RatingKeyboardOptions = {
	updateRating: (rating: number) => Promise<void>;
};

export const createNavigationKeyboardHandler = (options: NavigationKeyboardOptions) => {
	const { navigateToNext, navigateToPrevious } = options;

	const handleKeyDown = (event: KeyboardEvent) => {
		// Ignore if focus is on input elements
		const activeElement = document.activeElement;
		if (
			activeElement &&
			(activeElement.tagName === 'INPUT' ||
				activeElement.tagName === 'TEXTAREA' ||
				(activeElement as HTMLElement).contentEditable === 'true')
		) {
			return;
		}

		switch (event.key) {
			case 'ArrowLeft':
				event.preventDefault();
				navigateToPrevious();
				break;
			case 'ArrowRight':
				event.preventDefault();
				navigateToNext();
				break;
		}
	};

	const addEventListeners = () => {
		document.addEventListener('keydown', handleKeyDown);
	};

	const removeEventListeners = () => {
		document.removeEventListener('keydown', handleKeyDown);
	};

	return {
		addEventListeners,
		removeEventListeners,
	};
};

export const createRatingKeyboardHandler = (options: RatingKeyboardOptions) => {
	const { updateRating } = options;

	const handleKeyDown = (event: KeyboardEvent) => {
		// Ignore if focus is on input elements
		const activeElement = document.activeElement;
		if (
			activeElement &&
			(activeElement.tagName === 'INPUT' ||
				activeElement.tagName === 'TEXTAREA' ||
				(activeElement as HTMLElement).contentEditable === 'true')
		) {
			return;
		}

		// Handle number keys 0-5
		if (event.key >= '0' && event.key <= '5') {
			event.preventDefault();
			const newRating = parseInt(event.key, 10);
			updateRating(newRating);
		}
	};

	const addEventListeners = () => {
		document.addEventListener('keydown', handleKeyDown);
	};

	const removeEventListeners = () => {
		document.removeEventListener('keydown', handleKeyDown);
	};

	return {
		addEventListeners,
		removeEventListeners,
	};
};
