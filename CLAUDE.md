# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

SPAの画像ビュワーアプリ。
Tauriを使ったデスクトップアプリで、MacとWindowsに対応。
Stable Diffusionの生成メタデータを表示可能。

## 技術スタック

- Bun
- TypeScript
- SvelteKit v5
- Tailwind CSS v4
- DaisyUI
- Tauri v2

## 開発コマンド

### 開発環境

- `bun run tauri:dev` - 開発サーバー起動（フロントエンド + Tauriアプリ同時起動）
- `bun run tauri:build` - Tauriアプリプロダクションビルド
- `bun run check` - TypeScript型チェック実行
- `bun run format` - Prettier実行

### 推奨開発フロー

1. `bun run tauri:dev` で開発環境起動
2. 変更後は `bun run check` で型チェック実行
3. コミット前に `bun run format` で整形

## ディレクトリ構造

```
src/
├── lib/
│   ├── components/         # Svelteコンポーネント
│   ├── hooks/              # カスタムフック
│   ├── image/              # 画像処理関連
│   ├── services/           # ビジネスロジック
│   ├── stores/             # グローバル状態管理
│   ├── types/              # 型定義
│   ├── ui/                 # UI関連
│   ├── utils/              # ユーティリティ関数
│   └── *.svelte
├── routes/                 # SvelteKitルーティング
│   ├── +layout.svelte
│   ├── +layout.ts
│   └── +page.svelte
├── app.css                # グローバルスタイル
└── app.html               # HTMLテンプレート

src-tauri/src/
├── metadata_api/               # メタデータ処理API
├── thumbnail_api/              # サムネイル生成API
├── clipboard_api.rs            # クリップボード機能
├── image_file_lock_service.rs  # 画像ファイル排他制御
├── lib.rs                      # ライブラリエントリーポイント
└── main.rs                     # メインエントリーポイント
```

## アーキテクチャ

### SPAアーキテクチャ

- SvelteKitでSPA構成（`ssr = false`）
- `@sveltejs/adapter-static`で静的サイト生成
- Tauri v2でデスクトップアプリ化
- ViewMode状態管理：'welcome' → 'grid' → 'viewer'の3つのモード

### Stable Diffusion メタデータ対応

- PNG画像からSDパラメータを抽出・表示
- Positive/Negative プロンプト、Seed、CFG Scale等の表示

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
- `objc2-*` - macOS ネイティブ機能統合（クリップボード）
- `sha2`, `hex` - ハッシュ機能
- `regex` - 正規表現（XMPパーシング用）
- `crc32fast` - CRC32計算（PNG chunk用）
- `once_cell` - グローバル変数管理

## ルール

- 必ず日本語で回答
- 共通
  - **重要**: `src/lib/types/shared-types.ts`はRust側の構造体と完全同期が必要
  - 数値比較は `<` や `<=` のみを使って、必ず左側が小さい値にする
- フロントエンド
  - Svelte 5の書き方に従う。Svelte 4の書き方はしない。
    - `$:` は使わない。 `$derived` や `$effect` を使う。
  - アロー関数を使う。 `function` は使わない。
  - 状態が必要なもののみ `class` を使い、それ以外はアロー関数を使う。
  - `interface` は使わず、 `type` を使う。
  - なるべくDaisyUIのクラスを有効利用する。
  - **ユーザー向けUI表示は全て英語で統一する。**
  - **コンソールログ（console.log, console.error等）も英語で統一する**
  - `console.debug` , `console.log` , `console.warn` , `console.error` は文字列結合して第１引数のみを使う。
    - 第２引数は使えない。Rust側にログを転送する制限上そうなっている。
  - `invoke` でRustのAPIをコールするときは引数をlowerCamelCaseにする。
  - **Props vs Store使い分けルール:**
    - **Props使用**: 単純データ（文字列、数値、boolean）、親コンポーネントから渡されるイベントハンドラー、コンポーネント間の直接的な依存関係
    - **Store使用**: アプリケーション全体で共有される状態、複雑なビジネスロジックを含む処理、非同期処理が必要な操作
- バックエンド（Rust）
  - 型チェックは `cargo check` でやる（src-tauriディレクトリで実行）
- Git
  - コミットメッセージの先頭には https://gitmoji.dev/ のアイコンを使う
  - コミットメッセージは日本語
