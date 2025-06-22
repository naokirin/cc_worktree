export interface WorktreeInfo {
  path: string;
  branch: string;
  head: string;
  bare?: boolean;
  detached?: boolean;
  locked?: boolean;
  prunable?: boolean;
}

export interface AgentSession {
  id: string;
  worktreePath: string;
  branch: string;
  status: 'running' | 'stopped' | 'error';
  startTime: Date;
  lastActivity?: Date;
  pid?: number;
}

export interface Config {
  defaultClaudeCommand?: string;
  maxConcurrentSessions?: number;
  sessionTimeout?: number;
  autoCleanup?: boolean;
}