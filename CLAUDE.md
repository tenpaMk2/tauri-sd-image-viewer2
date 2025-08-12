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
- **コンソールログ（console.log, console.error等）も英語で統一すること**
- 変数名、関数名は英語で記述すること
- コメント、コミットメッセージのみ日本語にする

## Git規約

- コミットメッセージの先頭には https://gitmoji.dev/ のアイコンを使うこと。
- コミットメッセージは日本語

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
│   │   ├── unified-metadata-service.ts  # 統合メタデータ管理
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
├── metadata_api/           # メタデータ処理API
│   ├── mod.rs
│   ├── cache.rs            # メタデータキャッシュ
│   ├── metadata_info.rs    # 画像メタデータ統合
│   ├── png_handler.rs      # PNG特有処理
│   ├── sd_parameters.rs    # SD パラメータ抽出
│   ├── service.rs          # Tauriコマンド
│   └── xmp_handler.rs      # XMPメタデータ処理（レーティング）
├── thumbnail_api/          # サムネイル生成API
│   └── mod.rs
├── clipboard_api/          # クリップボード機能
│   └── mod.rs
├── image_loader/           # 画像読み込み統合
│   └── mod.rs
├── lib.rs                  # ライブラリエントリーポイント
└── main.rs                 # メインエントリーポイント
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
- `/src/lib/MetadataPanel.svelte` - SDメタデータ表示（EXIF表示は削除済み）
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
  - **PNG**: フル機能（SD、XMP Rating読み書き）
  - **JPEG**: 限定機能（XMP Rating読み書き、SD非対応）
  - **WebP**: 基本機能（表示のみ、メタデータ非対応）
- キーボードナビゲーション（←→キー）
- 隣接画像のプリロード機能とキャッシュ

### Stable Diffusion メタデータ対応

- PNG画像からSDパラメータを抽出・表示
- Positive/Negative プロンプト、Seed、CFG Scale等の表示
- 生成設定の詳細情報をサイドパネルで確認可能
- タグベースフィルタリング機能による画像検索
- XMPベースレーティングシステムによる画像評価・管理

## 重要な設計パターン

### パフォーマンス最適化

- Rust側で1回のIO操作で全画像情報を取得（`read_image_metadata`）
- 隣接画像の事前読み込み・キャッシュによる高速ナビゲーション
- サムネイル生成の効率化
- **統合メタデータキャッシュシステム**: 重複キャッシュを排除し、効率的なメタデータ管理を実現

### キャッシュ変更検出システム

- **軽量変更検出**: ファイルサイズ + 更新時刻による高速判定（解像度チェックを削除して100倍高速化）
- **フロントエンド・Rust統一仕様**: 両側で同じ変更検出ロジックを使用
- **リアルタイム整合性**: 外部ツールでの変更も即座に検出・反映

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
- `serde`, `serde_json` - シリアライゼーション
- `memmap2` - メモリマップファイルアクセス
- `rayon` - 並列処理
- `objc2-*` - macOS ネイティブ機能統合（クリップボード）
- `sha2`, `hex` - ハッシュ機能
- `regex` - 正規表現（XMPパーシング用）
- `crc32fast` - CRC32計算（PNG chunk用）
- `once_cell` - グローバル変数管理

## デバッグ・トラブルシューティング

### 開発時のトラブル対応

1. 型エラー → `bun run check` で確認
2. UI表示問題 → ブラウザ開発者ツールで確認
3. Rust側エラー → `cargo check` および Tauriログで確認
4. ビルドエラー → `bun run build` および `bun run tauri:build` で確認

### よくある問題

- Rust-TypeScript型不整合 → TYPE_SYNC_GUIDE.md参照
- 権限エラー → `src-tauri/capabilities/default.json`確認

### その他ルール

- `console.debug` , `console.log` , `console.warn` , `console.error` は文字列結合して第１引数のみを使うこと
- Rust側の型チェックは `cargo check` でやること（src-tauriディレクトリで実行）
- フロントエンドから `invoke` でRustのAPIをコールするときは引数をlowerCamelCaseにすること

## レーティングシステム設計（重要）

### XMPベースレーティングシステム

- **EXIFサポートは完全廃止済み** - 全てXMPベースに統一
- **対応形式**: PNG、JPEG（XMP埋め込み対応形式のみ）
- **WebPは非対応**（XMPメタデータ埋め込み制限のため）

### レーティング処理フロー

1. **読み取り**: `xmp_handler::extract_existing_xmp` → regex でrating抽出
2. **書き込み**: `write_xmp_image_rating` Tauriコマンド経由
3. **XMPフォーマット**: `xmp:Rating` + `xmp:RatingPercent` を同時設定
4. **ファイル埋め込み**: PNG（iTXtチャンク）、JPEG（APP1セグメント）

### 重要な実装ポイント

- **統一API**: `read_image_metadata` でXMP rating取得
- **キャッシュ無効化**: rating更新後は`invalidateMetadata`で強制リフレッシュ
- **排他制御**: `writingFilesArray`で同時書き込み防止
- **エラー処理**: XMP処理失敗時も適切なフォールバック