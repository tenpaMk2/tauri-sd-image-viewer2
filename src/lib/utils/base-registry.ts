type StoreWithDestroy = {
	actions: {
		destroy(): void;
	};
};

type Queue = {
	clearPendingTasks(): void;
};

export type RegistryLogger = {
	onClearUnused?: (removedCount: number, logName: string) => void;
	onClearAll?: (logName: string) => void;
};

export const createRegistry = <TStore extends StoreWithDestroy>(
	createStore: (imagePath: string) => TStore,
	queue?: Queue,
	logger?: RegistryLogger,
) => {
	const storeRegistry = new Map<string, TStore>();

	return {
		getOrCreateStore: (imagePath: string): TStore => {
			if (!storeRegistry.has(imagePath)) {
				const store = createStore(imagePath);
				storeRegistry.set(imagePath, store);
			}
			return storeRegistry.get(imagePath)!;
		},

		removeStore: (imagePath: string): boolean => {
			const store = storeRegistry.get(imagePath);
			if (store) {
				store.actions.destroy();
				storeRegistry.delete(imagePath);
				return true;
			}
			return false;
		},

		clearAll: (): void => {
			for (const store of storeRegistry.values()) {
				store.actions.destroy();
			}

			queue?.clearPendingTasks();
			storeRegistry.clear();

			logger?.onClearAll?.('all entries');
		},

		reset: (): void => {
			storeRegistry.clear();
		},
	};
};
