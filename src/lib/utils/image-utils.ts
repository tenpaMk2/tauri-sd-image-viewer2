import { SUPPORTED_IMAGE_EXTS } from '$lib/services/mime-type';
import type { SdTag } from '$lib/types/shared-types';

/**
 * SDタグを文字列にフォーマット
 */
export const formatSdTags = (tags: SdTag[]): string => {
	return tags.map((tag) => (tag.weight ? `(${tag.name}:${tag.weight})` : tag.name)).join(', ');
};

/**
 * ファイルが画像かどうかを判定
 */
export const isImageFile = (filename: string): boolean => {
	const ext = filename.toLowerCase().split('.').pop();
	return ext ? (SUPPORTED_IMAGE_EXTS as readonly string[]).includes(ext) : false;
};

/**
 * 画像の比率を計算
 */
export const calculateAspectRatio = (width: number, height: number): number => {
	return width / height;
};

/**
 * 画像のサイズテキストを生成
 */
export const formatImageDimensions = (width: number, height: number): string => {
	return `${width} × ${height}`;
};
