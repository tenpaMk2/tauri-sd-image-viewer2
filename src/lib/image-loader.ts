import { readFile } from "@tauri-apps/plugin-fs";
import { detectImageMimeType, type MimeType } from "./mime-type";

export type ImageData = {
  url: string;
  mimeType: MimeType;
  filePath: string;
};

/**
 * 画像ファイルを読み込み、Blob URLを作成
 */
export const loadImage = async (filePath: string): Promise<ImageData> => {
  try {
    const imageData = await readFile(filePath);
    const mimeType: MimeType =
      (await detectImageMimeType(filePath)) ?? "image/jpeg";

    const blob = new Blob([imageData], { type: mimeType });
    const url = URL.createObjectURL(blob);

    return {
      url,
      mimeType,
      filePath,
    };
  } catch (error) {
    console.error("Failed to load image:", error);
    throw new Error(`画像の読み込みに失敗しました: ${filePath}`);
  }
};