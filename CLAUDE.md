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
- トースト通知、確認ダイアログ、フォームラベルなども英語表記とする
- コメント、ログメッセージ、変数名などの開発者向け記述は日本語にする

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

## ディレクトリ構造

```
src/
├── lib/
│   ├── components/         # Svelteコンポーネント
│   │   └── metadata/       # メタデータ表示コンポーネント
│   │       ├── BasicInfoSection.svelte
│   │       ├── CameraInfoSection.svelte
│   │       ├── DateTimeSection.svelte
│   │       ├── ExifInfoSection.svelte
│   │       └── SdParamsSection.svelte
│   ├── hooks/              # カスタムフック
│   │   ├── use-cleanup.svelte
│   │   ├── use-keyboard-navigation.ts
│   │   └── use-resizer.svelte
│   ├── image/              # 画像処理関連
│   │   ├── image-loader.ts
│   │   ├── image-manipulation.ts
│   │   ├── mime-type.ts
│   │   ├── types.ts
│   │   └── utils.ts
│   ├── services/           # ビジネスロジック
│   │   ├── global-thumbnail-service.ts
│   │   ├── image-metadata-service.ts
│   │   ├── logger.ts
│   │   ├── navigation-service.ts
│   │   ├── tag-aggregation-service.ts
│   │   ├── thumbnail-queue-manager.ts
│   │   └── thumbnail-service.ts
│   ├── stores/             # グローバル状態管理
│   │   ├── app-store.ts
│   │   ├── filter-store.svelte.ts
│   │   └── toast.svelte
│   ├── types/              # 型定義
│   │   ├── shared-types.ts # Rust-TypeScript共通型
│   │   └── result.ts
│   ├── ui/                 # UI関連
│   │   └── types.ts
│   ├── utils/              # ユーティリティ関数
│   │   ├── delete-images.ts
│   │   ├── glob-utils.ts
│   │   ├── image-utils.ts
│   │   ├── rating-utils.ts
│   │   └── ui-utils.ts
│   ├── FilterPanel.svelte
│   ├── GridPage.svelte
│   ├── ImageCanvas.svelte
│   ├── ImageThumbnail.svelte
│   ├── MetadataPanel.svelte
│   ├── NavigationButtons.svelte
│   ├── ThumbnailGrid.svelte
│   ├── Toast.svelte
│   ├── ToolbarOverlay.svelte
│   ├── ViewerPage.svelte
│   └── WelcomeScreen.svelte
├── routes/                 # SvelteKitルーティング
│   ├── +layout.svelte
│   ├── +layout.ts
│   └── +page.svelte
├── app.css                # グローバルスタイル
└── app.html               # HTMLテンプレート

src-tauri/src/
├── image_handlers/         # 画像形式別処理
│   ├── mod.rs
│   ├── generic_processor.rs
│   └── png_processor.rs
├── thumbnail/              # サムネイル生成
│   ├── mod.rs
│   ├── cache.rs
│   ├── generator.rs
│   └── metadata_handler.rs
├── types/                  # Rust型定義
│   ├── mod.rs
│   ├── image_types.rs
│   └── thumbnail_types.rs
├── clipboard.rs            # クリップボード機能
├── common.rs               # 共通機能
├── exif_info.rs            # EXIF情報処理
├── image_info.rs           # 画像情報統合処理
├── lib.rs                  # ライブラリエントリーポイント
├── main.rs                 # メインエントリーポイント
└── sd_parameters.rs        # Stable Diffusion パラメータ処理
```

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
- `/src/lib/FilterPanel.svelte` - タグフィルタリング機能
- `/src/lib/ThumbnailGrid.svelte` - サムネイル表示グリッド
- `/src/lib/Toast.svelte` - 通知表示システム
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
- タグベースフィルタリング機能による画像検索
- レーティングシステムによる画像評価・管理

## 重要な設計パターン

### パフォーマンス最適化

- Rust側で1回のIO操作で全画像情報を取得（`read_comprehensive_image_info`）
- 隣接画像の事前読み込み・キャッシュによる高速ナビゲーション
- サムネイル生成の効率化

### 型安全性の確保

- Rust-TypeScript間の型同期は`src/lib/types/shared-types.ts`で管理
- フロントエンド専用型は`src/lib/image/types.ts`で分離管理
- 型変更時は必ずRust側と同時更新すること（詳細はTYPE_SYNC_GUIDE.md参照）

## 設定ファイル

### フロントエンド設定

- `vite.config.ts` - Viteビルド設定とTailwind CSS統合
- `svelte.config.js` - SvelteKit設定（SPA構成）
- `tsconfig.json` - TypeScript設定
- `src/app.css` - Tailwind CSS v4とDaisyUI設定

### Tauri設定

- `src-tauri/Cargo.toml` - Rust依存関係管理
- `src-tauri/tauri.conf.json` - Tauriアプリ設定
- `src-tauri/capabilities/default.json` - セキュリティ権限設定

## 主要依存関係

### フロントエンド

- `@sveltejs/kit` - フレームワーク
- `@tailwindcss/vite` - CSS フレームワーク（v4）
- `daisyui` - UIコンポーネント
- `@iconify/svelte` - アイコン
- `@tauri-apps/api` - Tauri API
- `@tauri-apps/plugin-dialog` - ファイルダイアログ
- `@tauri-apps/plugin-fs` - ファイルシステム
- `@tauri-apps/plugin-log` - ログ機能
- `@tauri-apps/plugin-os` - OS情報

### Rust（バックエンド）

- `image`, `png`, `webp` - 画像処理
- `little_exif` - EXIF メタデータ処理
- `serde`, `serde_json` - シリアライゼーション
- `memmap2` - メモリマップファイルアクセス
- `rayon` - 並列処理
- `objc2-*` - macOS ネイティブ機能統合（クリップボード）
- `sha2`, `hex` - ハッシュ機能
- `regex` - 正規表現
- `once_cell` - グローバル変数管理

## デバッグ・トラブルシューティング

### 開発時のトラブル対応

1. 型エラー → `bun run check` で確認
2. UI表示問題 → ブラウザ開発者ツールで確認
3. Rust側エラー → `cargo check` および Tauriログで確認
4. ビルドエラー → `bun run build` および `bun run tauri:build` で確認

### よくある問題

- Rust-TypeScript型不整合 → TYPE_SYNC_GUIDE.md参照
- パフォーマンス問題 → PERFORMANCE_OPTIMIZATION.md参照
- 権限エラー → `src-tauri/capabilities/default.json`確認
