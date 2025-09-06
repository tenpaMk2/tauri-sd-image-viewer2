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
	logger?: RegistryLogger
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

		clearUnused: (currentImagePaths: string[]): void => {
			const currentPathSet = new Set(currentImagePaths);
			let removedCount = 0;

			for (const [path, store] of storeRegistry) {
				if (!currentPathSet.has(path)) {
					store.actions.destroy();
					storeRegistry.delete(path);
					removedCount++;
				}
			}

			if (removedCount > 0) {
				logger?.onClearUnused?.(removedCount, 'unused entries');
			}
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