# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

SPAの画像ビュワーアプリ。
Tauriを使ったデスクトップアプリで、MacとWindowsに対応。

## 全体ルール

- 必ず日本語で回答

## 技術スタック

- Bun
- TypeScript
- SvelteKit v5
- Tailwind CSS v4
- DaisyUI
- Tauri v2

## コーディング規約

- モダンなコードを心がけること
  - Svelte 5の書き方に従うこと。Svelte 4の書き方はしないこと。
- `function` は使わないこと
- 状態が必要なもののみ `class` を使い、それ以外は関数を使うこと
- `interface` は使わず、 `type` を使うこと

## Git規約

- コミットメッセージの先頭には https://gitmoji.dev/ のアイコンを使うこと。

## 開発コマンド

### 開発環境
- `bun run tauri:dev` - 開発サーバー起動（フロントエンド + Tauriアプリ同時起動）
- `bun run dev` - フロントエンドのみ開発サーバー起動

### ビルド
- `bun run tauri:build` - Tauriアプリプロダクションビルド
- `bun run build` - フロントエンドのみビルド
- `bun run preview` - ビルド結果のプレビュー

### 型チェック・整形
- `bun run check` - TypeScript型チェック実行
- `bun run check:watch` - TypeScript型チェック（ウォッチモード）
- `bun run format` - Prettier実行
- `bun run format:check` - Prettier整形チェック

## アーキテクチャ

### SPAアーキテクチャ
- SvelteKitでSPA構成（`ssr = false`）
- `@sveltejs/adapter-static`で静的サイト生成
- Tauri v2でデスクトップアプリ化

### 主要コンポーネント
- `/src/routes/+page.svelte` - メインページ（ファイル選択とImageViewer表示）
- `/src/lib/ImageViewer.svelte` - 画像表示・ナビゲーション機能
- `/src/lib/image-loader.ts` - ファイル読み込みとディレクトリナビゲーション
- `/src/lib/mime-type.ts` - 画像MIME型検出

### Tauri統合
- `@tauri-apps/plugin-dialog` - ファイル選択ダイアログ
- `@tauri-apps/plugin-fs` - ファイルシステムアクセス
- セキュリティ権限は`src-tauri/capabilities/default.json`で管理

### 画像ナビゲーション機能
- 選択画像と同ディレクトリ内の画像ファイル自動検出
- 対応形式: PNG, JPG, JPEG, GIF, BMP, WebP, AVIF
- 前後画像への移動機能
