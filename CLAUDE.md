# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

SPAの画像ビュワーアプリ。
Tauriを使ったデスクトップアプリで、MacとWindowsに対応。
Stable Diffusionの生成メタデータを表示可能。

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
- 数値比較は `>` や `>=` ではなく `<` と `<=` を使うこと。直感的に分かりやすくするため
- なるべくDaisyUIのクラスを有効利用すること

### UI表示言語規約

- **ユーザー向けUI表示は全て英語で統一すること**
- ボタンのタイトル、メッセージ、エラー文など、ユーザーが視覚的に確認できる文言は英語にする
- コメント、ログメッセージ、変数名などの開発者向け記述は日本語を使用可能
- トースト通知、確認ダイアログ、フォームラベルなども英語表記とする

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

### 推奨開発フロー

1. `bun run tauri:dev` で開発環境起動
2. 変更後は `bun run check` で型チェック実行
3. コミット前に `bun run format` で整形

## アーキテクチャ

### SPAアーキテクチャ

- SvelteKitでSPA構成（`ssr = false`）
- `@sveltejs/adapter-static`で静的サイト生成
- Tauri v2でデスクトップアプリ化
- ViewMode状態管理：'welcome' → 'grid' → 'viewer'の3つのモード

### 主要コンポーネント

- `/src/routes/+page.svelte` - アプリケーション状態統合とモード管理
- `/src/lib/ViewerPage.svelte` - 画像表示・ナビゲーション機能（プリロード/キャッシュ対応）
- `/src/lib/GridPage.svelte` - ディレクトリ内画像のサムネイル一覧表示
- `/src/lib/ImageCanvas.svelte` - 画像表示とズーム・パン機能
- `/src/lib/MetadataPanel.svelte` - Exif/SDメタデータ表示
- `/src/lib/image/image-loader.ts` - 統合画像読み込み（1回のIO操作で全情報取得）

### Tauri統合とRust-TypeScript型同期

- `@tauri-apps/plugin-dialog` - ファイル選択ダイアログ
- `@tauri-apps/plugin-fs` - ファイルシステムアクセス
- セキュリティ権限は`src-tauri/capabilities/default.json`で管理
- **重要**: `src/lib/types/shared-types.ts`はRust側の構造体と完全同期が必要
- 型変更時は必ず対応するRustファイルも同時修正すること

### 画像ナビゲーション機能

- 選択画像と同ディレクトリ内の画像ファイル自動検出
- 対応形式: PNG, JPEG, WebP（機能サポートレベル別）
  - **PNG**: フル機能（SD、EXIF、XMP Rating書き込み）
  - **JPEG**: 限定機能（EXIF、XMP Rating書き込み、SD非対応）
  - **WebP**: 基本機能（EXIF読み取りのみ）
- キーボードナビゲーション（←→キー）
- 隣接画像のプリロード機能とキャッシュ

### Stable Diffusion メタデータ対応

- PNG画像からSDパラメータを抽出・表示
- Positive/Negative プロンプト、Seed、CFG Scale等の表示
- 生成設定の詳細情報をサイドパネルで確認可能

## 重要な設計パターン

### パフォーマンス最適化

- Rust側で1回のIO操作で全画像情報を取得（`read_comprehensive_image_info`）
- 隣接画像の事前読み込み・キャッシュによる高速ナビゲーション
- サムネイル生成の効率化

### 型安全性の確保

- Rust-TypeScript間の型同期は`src/lib/types/shared-types.ts`で管理
- フロントエンド専用型は`src/lib/image/types.ts`で分離管理
- 型変更時は必ずRust側と同時更新すること（詳細はTYPE_SYNC_GUIDE.md参照）
