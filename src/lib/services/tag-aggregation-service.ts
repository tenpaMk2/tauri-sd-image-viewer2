/**
 * Stable Diffusionタグの集計機能
 * ディレクトリ内の全画像からSDタグを抽出・集計する
 */

import { imageMetadataStore } from '../stores/image-metadata-store.svelte';
import type { SdTag } from '../types/shared-types';

export type TagCount = {
	name: string;
	count: number;
	isNegative: boolean; // ネガティブタグかどうか
};

export type TagAggregationResult = {
	allTags: TagCount[]; // 出現頻度順でソート済み
	positiveTagNames: string[]; // ポジティブタグ名のみ（サジェスト用）
	negativeTagNames: string[]; // ネガティブタグ名のみ（サジェスト用）
	uniqueTagNames: string[]; // 全タグ名（重複排除、サジェスト用）
};

export class TagAggregationService {
	private imageTagsCache = new Map<string, Set<string>>(); // imagePath -> normalized tags set

	constructor() {
		// コンストラクタでの初期化は不要
	}

	/**
	 * 指定されたファイルパス配列からSDタグを集計
	 */
	aggregateTagsFromFiles = async (imagePaths: string[]): Promise<TagAggregationResult> => {
		const tagCounts = new Map<string, { count: number; isNegative: Set<boolean> }>();

		// キャッシュをクリア
		this.imageTagsCache.clear();

		console.log(`Tag aggregation started for ${imagePaths.length} images`);

		// 各画像ファイルからSDパラメータを取得してタグを集計
		let successCount = 0;
		let errorCount = 0;

		for (const imagePath of imagePaths) {
			try {
				// メタデータストアから取得
				const metadata = imageMetadataStore.actions.getMetadataItem(imagePath);
				// ロード完了を待つ
				if (metadata.loadingStatus !== 'loaded') {
					await imageMetadataStore.actions.loadMetadata(imagePath);
				}

				const sdParameters = metadata.sdParameters;

				if (sdParameters) {
					// タグ情報をキャッシュに保存
					const imageTags = new Set<string>();

					for (const tag of sdParameters.positive_sd_tags) {
						const normalizedTag = tag.name.trim().toLowerCase();
						if (normalizedTag) imageTags.add(normalizedTag);
					}
					for (const tag of sdParameters.negative_sd_tags) {
						const normalizedTag = tag.name.trim().toLowerCase();
						if (normalizedTag) imageTags.add(normalizedTag);
					}

					this.imageTagsCache.set(imagePath, imageTags);

					// 集計用の処理
					this.addTagsToCount(tagCounts, sdParameters.positive_sd_tags, false);
					this.addTagsToCount(tagCounts, sdParameters.negative_sd_tags, true);
					successCount++;
				} else {
					// SDパラメータがない場合は空のSetを保存
					this.imageTagsCache.set(imagePath, new Set());
				}
			} catch (error) {
				console.warn(`SDタグ取得失敗: ${imagePath}`, error);
				errorCount++;
				// エラーがあった場合も空のSetを保存
				this.imageTagsCache.set(imagePath, new Set());
			}
		}

		console.log(`Tag aggregation completed: success ${successCount}, errors ${errorCount}`);
		const result = this.processAggregationResult(tagCounts);
		console.log(`Result: ${result.uniqueTagNames.length} unique tags found`);
		return result;
	};

	/**
	 * タグ配列をカウントマップに追加
	 */
	private addTagsToCount = (
		tagCounts: Map<string, { count: number; isNegative: Set<boolean> }>,
		tags: SdTag[],
		isNegative: boolean
	): void => {
		for (const tag of tags) {
			const tagName = tag.name.trim().toLowerCase();
			if (!tagName) continue;

			if (!tagCounts.has(tagName)) {
				tagCounts.set(tagName, { count: 0, isNegative: new Set() });
			}

			const existing = tagCounts.get(tagName)!;
			existing.count++;
			existing.isNegative.add(isNegative);
		}
	};

	/**
	 * 集計結果を処理して返却用の形式に変換
	 */
	private processAggregationResult = (
		tagCounts: Map<string, { count: number; isNegative: Set<boolean> }>
	): TagAggregationResult => {
		const allTags: TagCount[] = [];
		const positiveTagNames: string[] = [];
		const negativeTagNames: string[] = [];
		const uniqueTagNames: string[] = [];

		for (const [tagName, data] of tagCounts.entries()) {
			// ポジティブとネガティブ両方で使われている場合は両方のエントリを作成
			if (data.isNegative.has(true) && data.isNegative.has(false)) {
				// 両方で使用されている場合、より多く使用されている方をメインとする
				allTags.push({ name: tagName, count: data.count, isNegative: false });
				positiveTagNames.push(tagName);
				negativeTagNames.push(tagName);
			} else if (data.isNegative.has(true)) {
				// ネガティブのみ
				allTags.push({ name: tagName, count: data.count, isNegative: true });
				negativeTagNames.push(tagName);
			} else {
				// ポジティブのみ
				allTags.push({ name: tagName, count: data.count, isNegative: false });
				positiveTagNames.push(tagName);
			}

			uniqueTagNames.push(tagName);
		}

		// 出現頻度順でソート
		allTags.sort((a, b) => b.count - a.count);
		positiveTagNames.sort();
		negativeTagNames.sort();
		uniqueTagNames.sort();

		return {
			allTags,
			positiveTagNames,
			negativeTagNames,
			uniqueTagNames
		};
	};

	/**
	 * 特定の画像のタグ一覧を取得（キャッシュから）
	 */
	getTagsForImage = (imagePath: string): string[] => {
		const tags = this.imageTagsCache.get(imagePath);
		return tags ? Array.from(tags) : [];
	};

	/**
	 * 特定の画像のSDタグが指定されたタグリストを全て含むかチェック（高速同期版）
	 * キャッシュされたタグ情報を使用するため非常に高速
	 */
	imageContainsAllTagsSync = (imagePath: string, requiredTags: string[]): boolean => {
		if (requiredTags.length === 0) return true;

		// キャッシュからタグ情報を取得
		const imageTags = this.imageTagsCache.get(imagePath);
		if (!imageTags) return false;

		// すべての必須タグが含まれているかチェック（AND条件）
		return requiredTags.every((requiredTag) => imageTags.has(requiredTag.trim().toLowerCase()));
	};

	/**
	 * 特定の画像のSDタグが指定されたタグリストを全て含むかチェック（レガシー版）
	 * 後方互換性のため残しているが、imageContainsAllTagsSyncの使用を推奨
	 */
	imageContainsAllTags = async (imagePath: string, requiredTags: string[]): Promise<boolean> => {
		if (requiredTags.length === 0) return true;

		// キャッシュがあれば同期版を使用
		if (this.imageTagsCache.has(imagePath)) {
			return this.imageContainsAllTagsSync(imagePath, requiredTags);
		}

		try {
			const metadata = imageMetadataStore.actions.getMetadataItem(imagePath);

			// SDパラメータを取得（ロード完了を待つ）
			if (metadata.loadingStatus !== 'loaded') {
				await imageMetadataStore.actions.loadMetadata(imagePath);
			}

			const sdParameters = metadata.sdParameters;
			if (!sdParameters) return false;

			// 正規化されたタグ名の配列を作成（positive + negative）
			const imageTags = new Set<string>();

			for (const tag of sdParameters.positive_sd_tags) {
				imageTags.add(tag.name.trim().toLowerCase());
			}
			for (const tag of sdParameters.negative_sd_tags) {
				imageTags.add(tag.name.trim().toLowerCase());
			}

			// すべての必須タグが含まれているかチェック（AND条件）
			return requiredTags.every((requiredTag) => imageTags.has(requiredTag.trim().toLowerCase()));
		} catch (error) {
			console.warn(`SDタグチェック失敗: ${imagePath}`, error);
			return false;
		}
	};

	/**
	 * キャッシュされたタグ情報を取得
	 */
	getImageTags = (imagePath: string): Set<string> | undefined => {
		return this.imageTagsCache.get(imagePath);
	};

	/**
	 * キャッシュの統計情報を取得（デバッグ用）
	 */
	getCacheStats = () => {
		return {
			cacheSize: this.imageTagsCache.size,
			totalTags: Array.from(this.imageTagsCache.values()).reduce(
				(total, tags) => total + tags.size,
				0
			)
		};
	};
}
