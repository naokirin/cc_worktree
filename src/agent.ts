import { AgentSession, Config } from './types';
import { spawnCommand, generateSessionId, getGitRoot, hashRepositoryPath } from './utils';
import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'fs';
import path from 'path';
import os from 'os';

export class AgentManager {
  private sessions: Map<string, AgentSession> = new Map();
  private config: Config;
  private sessionDir: string;
  private repositoryPath?: string;

  constructor(config: Config = {}, repositoryPath?: string) {
    this.config = {
      defaultClaudeCommand: 'claude',
      maxConcurrentSessions: 5,
      sessionTimeout: 60 * 60 * 1000, // 60 minutes
      autoCleanup: true,
      ...config,
    };

    this.repositoryPath = repositoryPath;
    
    if (repositoryPath) {
      const repoHash = hashRepositoryPath(repositoryPath);
      this.sessionDir = path.join(os.homedir(), '.cc-worktree', 'repositories', repoHash, 'sessions');
    } else {
      this.sessionDir = path.join(os.homedir(), '.cc-worktree', 'sessions');
    }
    
    if (!existsSync(this.sessionDir)) {
      mkdirSync(this.sessionDir, { recursive: true });
    }

    this.loadSessions();
  }

  async startSession(worktreePath: string, branch: string): Promise<AgentSession> {
    if (!existsSync(worktreePath)) {
      throw new Error(`Worktree path does not exist: ${worktreePath}`);
    }

    if (this.sessions.size >= this.config.maxConcurrentSessions!) {
      throw new Error(`Maximum concurrent sessions reached (${this.config.maxConcurrentSessions})`);
    }

    const sessionId = generateSessionId();
    const session: AgentSession = {
      id: sessionId,
      worktreePath,
      branch,
      status: 'running',
      startTime: new Date(),
      lastActivity: new Date(),
    };

    try {
      this.saveSession(session);
      this.sessions.set(sessionId, session);

      const result = await spawnCommand(
        this.config.defaultClaudeCommand!,
        [],
        {
          cwd: worktreePath,
          interactive: true,
        }
      );

      session.status = 'completed';
      this.saveSession(session);

      return session;
    } catch (error) {
      session.status = 'error';
      throw new Error(`Failed to start Claude Code session: ${error}`);
    }
  }

  stopSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }


    session.status = 'stopped';
    this.sessions.set(sessionId, session);
    this.saveSession(session);
  }

  listSessions(): AgentSession[] {
    this.cleanupSessions();
    return Array.from(this.sessions.values());
  }

  getSession(sessionId: string): AgentSession | undefined {
    return this.sessions.get(sessionId);
  }

  getSessionForWorktree(worktreePath: string): AgentSession | undefined {
    return Array.from(this.sessions.values()).find(
      session => session.worktreePath === worktreePath
    );
  }

  getSessionForBranch(branch: string): AgentSession | undefined {
    return Array.from(this.sessions.values()).find(
      session => session.branch === branch || session.branch === `refs/heads/${branch}`
    );
  }

  cleanupSessions(): void {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.status === 'stopped') {
        this.removeSession(sessionId);
      }

      if (session.status === 'running' && session.lastActivity) {
        const timeSinceActivity = now.getTime() - session.lastActivity.getTime();
        if (timeSinceActivity > this.config.sessionTimeout!) {
          expiredSessions.push(sessionId);
        }
      }

    }

    for (const sessionId of expiredSessions) {
      this.stopSession(sessionId);
      this.removeSession(sessionId);
    }
  }

  private saveSession(session: AgentSession): void {
    const sessionFile = path.join(this.sessionDir, `${session.id}.json`);
    writeFileSync(sessionFile, JSON.stringify(session, null, 2));
  }

  private loadSessions(): void {
    if (!existsSync(this.sessionDir)) {
      return;
    }

    try {
      const sessionFiles = require('fs').readdirSync(this.sessionDir);
      for (const file of sessionFiles) {
        if (file.endsWith('.json')) {
          try {
            const sessionData = readFileSync(path.join(this.sessionDir, file), 'utf-8');
            const session: AgentSession = JSON.parse(sessionData);

            session.startTime = new Date(session.startTime);
            if (session.lastActivity) {
              session.lastActivity = new Date(session.lastActivity);
            }

            this.sessions.set(session.id, session);
          } catch (error) {
            console.warn(`Failed to load session from ${file}: ${error}`);
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to load sessions: ${error}`);
    }
  }

  removeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    const sessionFile = path.join(this.sessionDir, `${sessionId}.json`);
    if (existsSync(sessionFile)) {
      require('fs').unlinkSync(sessionFile);
    }
  }

  getRepositoryHash(): string | undefined {
    if (this.repositoryPath) {
      return hashRepositoryPath(this.repositoryPath);
    }
    return undefined;
  }

  static createForRepository(config: Config = {}, cwd: string = process.cwd()): AgentManager {
    try {
      const repoRoot = getGitRoot(cwd);
      return new AgentManager(config, repoRoot);
    } catch {
      return new AgentManager(config);
    }
  }
}