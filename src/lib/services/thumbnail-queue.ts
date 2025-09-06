import { BaseQueue } from '$lib/utils/base-queue';

const thumbnailLogger = {
	onEnqueue: (id: string, priority: string, debugLabel: string, queueSize: number, activeCount: number) => {
		const priorityIcon = priority === 'high' ? '⚡' : '📋';
		console.log(`${priorityIcon} ${debugLabel} queued (${priority}): ${id.split('/').pop()} | Queue size: ${queueSize}, Active: ${activeCount}/10`);
	},
	onProcessStart: (id: string, debugLabel: string, queueRemaining: number, activeCount: number) => {
		console.log(`▶️ Processing ${debugLabel}: ${id.split('/').pop()} | Queue remaining: ${queueRemaining}, Active: ${activeCount}/10`);
	},
	onTaskStart: (id: string, debugLabel: string) => {
		console.log(`🔄 Loading ${debugLabel}: ${id.split('/').pop()}`);
	},
	onTaskComplete: (id: string, debugLabel: string, activeCount: number) => {
		console.log(`✅ Completed ${debugLabel}: ${id.split('/').pop()} | Active jobs remaining: ${activeCount}`);
	},
	onTaskError: (id: string, debugLabel: string, error: any) => {
		console.error(`❌ ${debugLabel} execution failed: ${id.split('/').pop()} ${error}`);
	},
	onQueueComplete: (debugLabel: string) => {
		console.log(`✅ ${debugLabel} queue processing completed`);
	},
	onClearPending: () => {
		console.log('🧹 Clearing pending tasks');
	},
	onClearComplete: () => {
		console.log('🗑️ pending tasks cleared');
	}
};

// サムネイル専用キューインスタンス
export const thumbnailQueue = new BaseQueue(thumbnailLogger);
