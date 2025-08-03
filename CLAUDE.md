# CLAUDE.md

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
