# Claude Worktree

Git worktreeとClaude Code統合ツール。複数のブランチで並行開発を効率的に行うためのツールです。

## 特徴

- **Git Worktree管理**: 新しいブランチ用のworktreeを簡単に作成・管理
- **Claude Code統合**: worktreeごとにClaude Codeセッションを自動起動
- **並行開発サポート**: 複数のブランチで同時に作業可能
- **セッション管理**: アクティブなClaude Codeセッションの監視・制御
- **設定管理**: カスタマイズ可能な設定オプション

## インストール

```bash
npm install -g claude-worktree
```

## 使用方法

### 基本的な使い方

```bash
# 新しいブランチ用のworktreeを作成してClaude Codeを起動
claude-worktree create feature/new-api

# 既存のworktreeでClaude Codeセッションを開始
claude-worktree start feature/bug-fix

# 全worktreeとセッションの状態を確認
claude-worktree list

# セッションを停止
claude-worktree stop feature/new-api

# worktreeを削除
claude-worktree remove feature/new-api
```

### コマンド一覧

#### `create <branch> [options]`
新しいworktreeを作成し、Claude Codeセッションを開始します。

```bash
claude-worktree create feature/new-api
claude-worktree create feature/new-api --path /custom/path
claude-worktree create feature/new-api --no-session  # セッション無しで作成
```

#### `start <branch-or-path>`
既存のworktreeでClaude Codeセッションを開始します。

```bash
claude-worktree start feature/bug-fix
claude-worktree start /path/to/worktree
```

#### `stop <session-id-or-branch>`
Claude Codeセッションを停止します。

```bash
claude-worktree stop feature/new-api
claude-worktree stop agent-1234567890-abc123def
```

#### `list [options]`
worktreeとセッションの一覧を表示します。

```bash
claude-worktree list                # 全て表示
claude-worktree list --worktrees-only  # worktreeのみ
claude-worktree list --sessions-only   # セッションのみ
```

#### `remove <branch-or-path> [options]`
worktreeを削除します。

```bash
claude-worktree remove feature/old-feature
claude-worktree remove feature/old-feature --force  # 強制削除
```

#### `cleanup`
停止したセッションと不要なworktreeをクリーンアップします。

```bash
claude-worktree cleanup
```

#### `config [options]`
設定を管理します。

```bash
claude-worktree config --show                    # 設定表示
claude-worktree config --reset                   # 設定リセット
claude-worktree config --set maxConcurrentSessions=10
```

## 設定

設定ファイルは `~/.claude-worktree/config.json` に保存されます。

### 設定オプション

- `defaultClaudeCommand`: Claude Codeコマンド（デフォルト: `claude`）
- `maxConcurrentSessions`: 最大同時セッション数（デフォルト: `5`）
- `sessionTimeout`: セッションタイムアウト時間（ミリ秒、デフォルト: `1800000` = 30分）
- `autoCleanup`: 自動クリーンアップ（デフォルト: `true`）

### 設定例

```json
{
  \"defaultClaudeCommand\": \"claude\",
  \"maxConcurrentSessions\": 3,
  \"sessionTimeout\": 3600000,
  \"autoCleanup\": true
}
```

## 要件

- Node.js 18以上
- Git 2.5以上
- Claude Code CLI

## トラブルシューティング

### Claude Codeが見つからない
```bash
claude-worktree config --set defaultClaudeCommand=/path/to/claude
```

### セッションが応答しない
```bash
claude-worktree cleanup
```

### worktreeが削除できない
```bash
claude-worktree remove <branch> --force
```

## ライセンス

MIT License

## 貢献

Issue報告やPull Requestは歓迎します。

## 開発

```bash
# 依存関係をインストール
npm install

# 開発モード
npm run dev

# ビルド
npm run build

# テスト
npm test

# リント
npm run lint
```