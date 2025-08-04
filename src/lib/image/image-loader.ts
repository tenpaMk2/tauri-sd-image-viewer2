import { readDir, readFile } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import { invoke } from '@tauri-apps/api/core';
import { detectImageMimeType, SUPPORTED_IMAGE_EXTS } from './mime-type';
import type { ImageMetadataInfo, SdParameters } from '../types/shared-types';
import type { ImageData, MimeType } from './types';

/**
 * ディレクトリ内の画像ファイル一覧を取得
 */
export const getImageFiles = async (directoryPath: string): Promise<string[]> => {
	try {
		console.log('ディレクトリ読み込み:', directoryPath);
		const entries = await readDir(directoryPath);
		console.log('ディレクトリエントリ数:', entries.length);

		const imageExtensions = SUPPORTED_IMAGE_EXTS.map((ext) => `.${ext}`);
		const imageEntries = entries.filter(
			(entry) =>
				entry.isFile && imageExtensions.some((ext) => entry.name.toLowerCase().endsWith(ext))
		);

		// path.joinを使って正しいパスを構築
		const imageFiles = await Promise.all(
			imageEntries
				.sort((a, b) => a.name.localeCompare(b.name, 'ja', { numeric: true }))
				.map(async (entry): Promise<string> => await join(directoryPath, entry.name))
		);

		console.log('画像ファイル一覧:', imageFiles);
		return imageFiles;
	} catch (error) {
		console.error('ディレクトリの読み込みに失敗しました:', directoryPath, error);
		throw new Error(`ディレクトリの読み込みに失敗しました: ${directoryPath}`);
	}
};

/**
 * 画像ファイルを読み込み、Blob URLを作成
 */
export const loadImage = async (filePath: string): Promise<ImageData> => {
	try {
		const imageData = await readFile(filePath);
		const detectedMimeType = await detectImageMimeType(filePath);
		if (!detectedMimeType) {
			throw new Error(`サポートされていない画像形式: ${filePath}`);
		}
		const mimeType: MimeType = detectedMimeType;

		const blob = new Blob([new Uint8Array(imageData)], { type: mimeType });
		const url = URL.createObjectURL(blob);

		return {
			url,
			mimeType,
			filePath
		};
	} catch (error) {
		console.error('Failed to load image:', error);
		throw new Error(`画像の読み込みに失敗しました: ${filePath}`);
	}
};

/**
 * PNG画像からStable Diffusionメタデータを取得（レガシー関数）
 * @deprecated 新しい統合機能 loadComprehensiveImageInfo を使用してください
 */
export const loadSdParameters = async (filePath: string): Promise<SdParameters | null> => {
	try {
		// PNG画像でない場合は早期リターン
		const mimeType = await detectImageMimeType(filePath);
		if (mimeType !== 'image/png') {
			return null;
		}

		const result = await invoke<SdParameters | null>('read_png_sd_parameters', {
			path: filePath
		});
		return result;
	} catch (error) {
		console.warn('SD parameters取得に失敗:', filePath, error);
		return null;
	}
};

/**
 * ハイブリッドアプローチ: 画像とメタデータを並行取得
 * 画像データはフロントエンド、メタデータはRustで効率的に処理
 */
export const loadImageWithMetadata = async (filePath: string): Promise<{
	imageData: ImageData;
	imageInfo: ImageMetadataInfo;
}> => {
	try {
		// 並行実行でパフォーマンス最適化
		const [imageData, imageInfo] = await Promise.all([
			// フロントエンド: 画像データの高速読み込み
			loadImage(filePath),
			// Rust: メタデータのみの軽量取得
			invoke<ImageMetadataInfo>('read_image_metadata_info', { path: filePath })
		]);

		return { imageData, imageInfo };
	} catch (error) {
		console.error('画像・メタデータの取得に失敗:', filePath, error);
		throw new Error(`画像情報の取得に失敗しました: ${filePath}`);
	}
};

/**
 * レガシー関数（後方互換性のため）
 * @deprecated loadImageWithMetadata を使用してください
 */
export const loadComprehensiveImageInfo = loadImageWithMetadata;
