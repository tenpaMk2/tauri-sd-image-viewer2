import type { SdTag } from '../types/shared-types';

/**
 * SDタグを文字列にフォーマット
 */
export const formatSdTags = (tags: SdTag[]): string => {
	return tags.map((tag) => (tag.weight ? `(${tag.name}:${tag.weight})` : tag.name)).join(', ');
};

/**
 * 画像拡張子の判定
 */
export const getSupportedImageExtensions = (): string[] => {
	return ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'avif'];
};

/**
 * ファイルが画像かどうかを判定
 */
export const isImageFile = (filename: string): boolean => {
	const extensions = getSupportedImageExtensions();
	const ext = filename.toLowerCase().split('.').pop();
	return ext ? extensions.includes(ext) : false;
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
