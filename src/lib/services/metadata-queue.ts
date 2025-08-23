import { BaseQueue } from '$lib/utils/base-queue';

/**
 * メタデータ処理専用のシングルトンキュー
 */
export const metadataQueue = new BaseQueue();
