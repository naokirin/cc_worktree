# cc-worktree

Git worktreeとClaude Code統合ツール。複数のブランチで並行開発を効率的に行うためのツールです。

## 特徴

- **Git Worktree管理**: 新しいブランチ用のworktreeを簡単に作成・管理
- **Claude Code統合**: worktreeごとにClaude Codeセッションを自動起動
- **並行開発サポート**: 複数のブランチで同時に作業可能
- **セッション管理**: アクティブなClaude Codeセッションの監視・制御
- **設定管理**: カスタマイズ可能な設定オプション

## インストール

```bash
npm install -g cc-worktree
```

### npxでの実行

グローバルインストールを避けたい場合は、npxを使用して直接実行することもできます：

```bash
# 新しいブランチ用のworktreeを作成してClaude Codeを起動
npx cc-worktree create feature/new-api

# 既存のworktreeでClaude Codeセッションを開始
npx cc-worktree start feature/bug-fix

# 全worktreeとセッションの状態を確認
npx cc-worktree list
```

> **注意**: npxを使用する場合、初回実行時にパッケージのダウンロードが発生するため、少し時間がかかる場合があります。

## 使用方法

### 基本的な使い方

```bash
# 新しいブランチ用のworktreeを作成してClaude Codeを起動
cc-worktree create feature/new-api

# 既存のworktreeでClaude Codeセッションを開始
cc-worktree start feature/bug-fix

# 全worktreeとセッションの状態を確認
cc-worktree list

# セッションを停止
cc-worktree stop feature/new-api

# worktreeを削除
cc-worktree remove feature/new-api
```

### コマンド一覧

#### `create <branch> [options]`
新しいworktreeを作成し、Claude Codeセッションを開始します。

```bash
cc-worktree create feature/new-api
cc-worktree create feature/new-api --path /custom/path
cc-worktree create feature/new-api --no-session  # セッション無しで作成
```

#### `start <branch-or-path>`
既存のworktreeでClaude Codeセッションを開始します。

```bash
cc-worktree start feature/bug-fix
cc-worktree start /path/to/worktree
```

#### `stop <session-id-or-branch>`
Claude Codeセッションを停止します。

```bash
cc-worktree stop feature/new-api
cc-worktree stop agent-1234567890-abc123def
```

#### `list [options]`
worktreeとセッションの一覧を表示します。

```bash
cc-worktree list                # 全て表示
cc-worktree list --worktrees-only  # worktreeのみ
cc-worktree list --sessions-only   # セッションのみ
```

#### `remove <branch-or-path> [options]`
worktreeを削除します。

```bash
cc-worktree remove feature/old-feature
cc-worktree remove feature/old-feature --force  # 強制削除
```

#### `cleanup`
停止したセッションと不要なworktreeをクリーンアップします。

```bash
cc-worktree cleanup
```

#### `config [options]`
設定を管理します。

```bash
cc-worktree config --show                    # 設定表示
cc-worktree config --reset                   # 設定リセット
cc-worktree config --set maxConcurrentSessions=10
```

## 設定

設定ファイルは `~/.cc-worktree/config.json` に保存されます。

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