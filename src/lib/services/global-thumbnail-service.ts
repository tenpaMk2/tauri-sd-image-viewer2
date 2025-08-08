import { ThumbnailService } from './thumbnail-service';

class GlobalThumbnailService {
	private static instance: GlobalThumbnailService | null = null;
	private activeService: ThumbnailService | null = null;

	private constructor() {}

	static getInstance(): GlobalThumbnailService {
		if (!GlobalThumbnailService.instance) {
			GlobalThumbnailService.instance = new GlobalThumbnailService();
		}
		return GlobalThumbnailService.instance;
	}

	// アクティブなサムネイルサービスを登録
	setActiveService(service: ThumbnailService): void {
		// 以前のサービスのキューを停止
		if (this.activeService && this.activeService !== service) {
			console.log('Stopping previous thumbnail service queue');
			this.activeService.stopCurrentQueue();
		}
		this.activeService = service;
	}

	// 現在のアクティブなサービスのキューを停止
	stopActiveQueue(): void {
		if (this.activeService) {
			console.log('Stopping active thumbnail service queue');
			this.activeService.stopCurrentQueue();
		}
	}

	// アクティブなサービスを解除
	clearActiveService(): void {
		if (this.activeService) {
			this.activeService.stopCurrentQueue();
			this.activeService = null;
		}
	}

	// アクティブなサービスの状態を取得
	getActiveServiceStatus(): string | null {
		return this.activeService ? 'active' : null;
	}
}

export const globalThumbnailService = GlobalThumbnailService.getInstance();
