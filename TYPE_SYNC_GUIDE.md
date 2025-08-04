# RustとTypeScriptの型定義同期ガイド

## 現在の課題
現在、RustとTypeScriptで同じ構造体を手動で管理しており、型の不整合が発生する可能性があります。

## 推奨解決策

### 1. ts-rs を使用した自動生成（推奨）

#### インストール

```toml
# Cargo.toml の [dependencies] に追加
ts-rs = "6.2"
```

#### Rust側の修正

```rust
// src-tauri/src/sd_parameters.rs
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)] // TypeScript定義を自動生成
pub struct SdTag {
    pub name: String,
    pub weight: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct SdParameters {
    pub positive_sd_tags: Vec<SdTag>,
    pub negative_sd_tags: Vec<SdTag>,
    pub steps: Option<String>,
    // ... 他のフィールド
    pub raw: String,
}
```

#### 型生成コマンド

```bash
# Rust側で型定義を生成
cd src-tauri
cargo test --features ts-rs

# 生成されたファイルをフロントエンドにコピー
cp generated/bindings/*.ts ../src/lib/types/
```

### 2. tauri-specta を使用した自動生成

#### インストール

```toml
# Cargo.toml
[dependencies] 
tauri-specta = { version = "1.0", features = ["typescript"] }
specta = { version = "1.0", features = ["typescript"] }
```

#### 使用例

```rust
use specta::Type;
use tauri_specta::collect_commands;

#[derive(Serialize, Type)]
struct SdParameters {
    // フィールド定義
}

#[tauri::command]
#[specta::specta] // この属性で自動収集
fn read_sd_parameters() -> SdParameters {
    // 実装
}

// ビルド時に型定義を生成
fn main() {
    tauri_specta::ts::export(
        collect_commands![read_sd_parameters],
        "../src/lib/types/bindings.ts"
    ).unwrap();
}
```

## 現在の手動管理での注意点

現在のアプローチでは以下の規則を厳守してください：

### Rust → TypeScript 型対応表

| Rust型 | TypeScript型 | 注意点 |
|--------|-------------|--------|
| `String` | `string` | - |
| `Option<T>` | `T \| undefined` | `null`ではなく`undefined` |
| `Vec<T>` | `T[]` | - |
| `u32, u64` | `number` | JavaScriptの数値精度に注意 |
| `f32, f64` | `number` | - |
| `bool` | `boolean` | - |

### ファイル対応関係

- `src-tauri/src/sd_parameters.rs` ↔ `src/lib/image/types.ts` (SdParameters部分)
- `src-tauri/src/image_info.rs` ↔ `src/lib/image/types.ts` (ComprehensiveImageInfo部分)

### 変更時の手順

1. Rust側で構造体を変更
2. TypeScript側で対応する型を更新
3. 両側でコンパイルエラーがないことを確認
4. テストで型整合性を検証

## おすすめの移行手順

1. **段階的導入**: まず`ts-rs`を既存の1つの構造体に適用
2. **CI統合**: 型生成をビルドプロセスに組み込み
3. **自動化**: 型の不整合を検出するテストを追加
4. **完全移行**: 全ての手動型定義を自動生成に置き換え