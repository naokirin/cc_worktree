# Agent Worktree 開発ガイド

## プロジェクト概要

このプロジェクトは、Git worktreeとClaude Codeを統合して並行開発を効率化するためのCLIツールです。

## 技術スタック

- **言語**: TypeScript
- **ランタイム**: Node.js 18+
- **CLI フレームワーク**: Commander.js
- **テスト**: Jest
- **リント**: ESLint
- **フォーマット**: Prettier
- **その他の依存関係**:
  - chalk: ターミナル出力の色付け
  - inquirer: インタラクティブなCLI

## アーキテクチャ

### コアモジュール

1. **WorktreeManager** (`src/worktree.ts`)
   - Git worktreeの作成、削除、一覧表示
   - ブランチの存在確認
   - worktreeのパース機能

2. **AgentManager** (`src/agent.ts`)
   - Claude Codeセッションの管理
   - セッションの開始、停止、監視
   - セッション状態の永続化

3. **ConfigManager** (`src/config.ts`)
   - 設定ファイルの読み書き
   - デフォルト設定の管理
   - 設定のバリデーション

4. **CLIインターフェース** (`src/cli.ts`)
   - コマンドラインインターフェース
   - ユーザー入力の処理
   - 出力フォーマット

### ユーティリティ

- **utils.ts**: 共通的なヘルパー関数
- **types.ts**: TypeScript型定義

## 開発方針

### コミットメッセージ

- 日本語で記述
- Todoごとにコミットする
- 変更内容を簡潔に表現

### コード品質

- TypeScriptの厳格な型チェックを使用
- ESLintルールに従う
- Prettierで統一されたコードフォーマット
- 100%のテストカバレッジを目指す

### エラーハンドリング

- 明確なエラーメッセージを提供
- ユーザーに対して解決方法を示唆
- 予期しないエラーもキャッチして適切に処理

### セキュリティ

- ユーザー入力のサニタイゼーション
- ファイルパスの検証
- プロセス実行時のセキュリティ考慮

## テスト戦略

- ユニットテスト: 各クラス・関数の単体テスト
- 統合テスト: モジュール間の連携テスト
- E2Eテスト: CLI全体の動作テスト

## ビルドとデプロイ

```bash
# 開発環境
npm run dev          # TypeScriptウォッチモード

# ビルド
npm run build        # TypeScriptコンパイル

# 品質チェック
npm run lint         # ESLintチェック
npm run format       # Prettierフォーマット
npm test             # Jestテスト実行

# 本番環境
npm start            # ビルド済みCLI実行
```

## 設定管理

設定は以下の場所に保存されます：
- グローバル設定: `~/.agent-worktree/config.json`
- セッション情報: `~/.agent-worktree/sessions/`

## デバッグ

```bash
# デバッグモードでの実行
DEBUG=agent-worktree* npm start

# TypeScriptソースマップ有効
node --inspect dist/cli.js
```

## パフォーマンス考慮事項

- Git操作は最小限に留める
- セッション情報の効率的な管理
- 大量のworktreeに対するスケーラビリティ

## トラブルシューティング

### 開発中によくある問題

1. **TypeScriptコンパイルエラー**
   - 型定義の不一致
   - インポートパスの問題

2. **Git操作エラー**
   - 権限問題
   - 不正なリポジトリ状態

3. **プロセス管理問題**
   - ゾンビプロセス
   - セッションの不正な状態

### 解決方法

- ログレベルを上げてデバッグ情報確認
- 設定をリセットして再試行
- セッションクリーンアップコマンド実行