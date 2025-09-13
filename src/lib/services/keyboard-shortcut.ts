import { goto } from '$app/navigation';
import { autoNavStore } from './auto-nav-store.svelte';
import type { NavigationStore } from './navigation-store';

export type NavigationKeyboardOptions = {
	navigation: NavigationStore;
};

export type RatingKeyboardOptions = {
	updateRating: (rating: number) => Promise<void>;
};

export const createNavigationKeyboardHandler = (options: NavigationKeyboardOptions) => {
	const { navigation } = options;

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
				if (navigation.state.previousImagePath) {
					event.preventDefault();
					autoNavStore.actions.stop();
					goto(`/viewer/${encodeURIComponent(navigation.state.previousImagePath)}`);
				}
				break;
			case 'ArrowRight':
				if (navigation.state.nextImagePath) {
					event.preventDefault();
					autoNavStore.actions.stop();
					goto(`/viewer/${encodeURIComponent(navigation.state.nextImagePath)}`);
				}
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
