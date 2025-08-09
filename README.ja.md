# Tauri SD Image Viewer

_[English](README.md) | 日本語_

Tauri v2で構築されたデスクトップ画像ビューアーアプリケーション。Stable Diffusionのメタデータ表示と管理に特化しています。

## スクリーンショット

### グリッド表示

![グリッド表示](images/sample-grid.png)
_レーティングシステムとSDタグフィルタリング機能を持つサムネイルグリッドで画像を閲覧_

### 単一画像表示

![単一画像表示](images/sample-single.png)
_Stable Diffusionパラメータを含む詳細なメタデータとともに画像を表示_

## 機能

- **画像表示**: PNG、JPEG、WebP形式をサポート
- **Stable Diffusionメタデータ**: 生成画像からSDパラメータを抽出・表示
- **EXIF対応**: 基本的なEXIF情報を表示
- **レーティングシステム**: 星評価で画像を評価（EXIFとXMPメタデータの両方に書き込み）
- **サムネイルグリッド**: グリッドレイアウトで画像を閲覧
- **キーボードナビゲーション**: 矢印キーで画像間を移動
- **SDタグフィルタリング**: Stable Diffusionタグで画像をフィルタリング
- **クロスプラットフォーム**: macOSとWindowsで動作

## 技術スタック

- **フロントエンド**: SvelteKit 5、TypeScript、Tailwind CSS 4、DaisyUI
- **バックエンド**: Tauri v2（Rust）
- **ビルドツール**: Bun

## 開発

### 前提条件

- [Bun](https://bun.sh/) - JavaScript ランタイム・パッケージマネージャー
- [Rust](https://rustup.rs/) - Tauriバックエンドに必要

### はじめに

1. リポジトリをクローン:

```bash
git clone https://github.com/tenpaMk2/tauri-sd-image-viewer2.git
cd tauri-sd-image-viewer2
```

2. 依存関係をインストール:

```bash
bun install
```

3. 開発サーバー起動:

```bash
bun run tauri:dev
```

### ビルドコマンド

- `bun run tauri:dev` - 開発サーバー起動（フロントエンド + Tauriアプリ）
- `bun run tauri:build` - Tauriアプリプロダクションビルド
- `bun run dev` - フロントエンドのみ開発サーバー起動
- `bun run build` - フロントエンドのみビルド
- `bun run check` - TypeScript型チェック実行
- `bun run format` - Prettierでコード整形

### 推奨開発フロー

1. 開発開始: `bun run tauri:dev`
2. コードを変更
3. 型チェック実行: `bun run check`
4. コミット前にコード整形: `bun run format`

## 画像形式対応

| 形式     | 機能                                                                   |
| -------- | ---------------------------------------------------------------------- |
| **PNG**  | フルサポート: SDメタデータ、EXIF、EXIF+XMPレーティング書き込み         |
| **JPEG** | 限定サポート: EXIF、EXIF+XMPレーティング書き込み（SDメタデータ非対応） |
| **WebP** | 基本サポート: EXIF読み取りのみ                                         |

## アーキテクチャ

- **SPAアーキテクチャ**: SvelteKitによるSingle Page Application
- **3つの表示モード**: ウェルカム → グリッド → ビューアー
- **統合メタデータサービス**: 効率的なメタデータキャッシングと管理
- **パフォーマンス最適化**: 単一I/O操作、画像プリロード、キャッシング

## ライセンス

MIT License - 詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 貢献

[GitHub](https://github.com/tenpaMk2/tauri-sd-image-viewer2/issues)でのIssueやPull Requestを歓迎します。
