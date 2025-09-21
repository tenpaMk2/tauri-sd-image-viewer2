export const SCROLL_TARGET_CONTEXT = Symbol('scrollTargetContext');

export type ScrollTargetContext = {
	state: {
		targetElement: HTMLElement | null;
	};
	actions: {
		setTargetElement: (element: HTMLElement) => void;
	};
};
