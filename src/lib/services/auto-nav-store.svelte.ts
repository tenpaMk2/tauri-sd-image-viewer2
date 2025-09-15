import type { NavigationStore } from './navigation-store';

type MutableAutoNavState = { isActive: boolean };
export type AutoNavState = Readonly<MutableAutoNavState>;

const _state = $state<MutableAutoNavState>({ isActive: false });

// Timer management
let autoNavTimer: number | null = null;

// Auto Navigation
const start = (navigation: NavigationStore): void => {
	if (_state.isActive) {
		// Already active, do nothing
		return;
	}

	_state.isActive = true;

	// Navigate to latest image immediately
	navigation.actions.refreshAndNavigateToLatest().catch((error) =>
		console.error('Initial auto navigation failed: ' + error),
	);

	// Set up auto navigation interval (every 2 seconds)
	autoNavTimer = setInterval(() => {
		navigation.actions.refreshAndNavigateToLatest().catch((error) =>
			console.error('Auto navigation interval failed: ' + error),
		);
	}, 2000);
};

const stop = (): void => {
	if (autoNavTimer !== null) {
		clearInterval(autoNavTimer);
		autoNavTimer = null;
	}
	_state.isActive = false;
};

const toggle = (navigation: NavigationStore): void => {
	if (_state.isActive) {
		stop();
	} else {
		start(navigation);
	}
};

export const autoNavStore = {
	state: _state as AutoNavState,
	deriveds: {},
	actions: {
		start,
		stop,
		toggle,
	},
};
