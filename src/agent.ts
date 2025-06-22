import { AgentSession, Config } from './types';
import { spawnCommand, generateSessionId } from './utils';
import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'fs';
import path from 'path';
import os from 'os';

export class AgentManager {
  private sessions: Map<string, AgentSession> = new Map();
  private config: Config;
  private sessionDir: string;

  constructor(config: Config = {}) {
    this.config = {
      defaultClaudeCommand: 'claude',
      maxConcurrentSessions: 5,
      sessionTimeout: 60 * 60 * 1000, // 60 minutes
      autoCleanup: true,
      ...config,
    };

    this.sessionDir = path.join(os.homedir(), '.claude-worktree', 'sessions');
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
      const pid = await spawnCommand(
        this.config.defaultClaudeCommand!,
        [],
        {
          cwd: worktreePath,
          detached: true,
        }
      );

      session.pid = pid;
      this.sessions.set(sessionId, session);
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

    if (session.pid) {
      try {
        process.kill(session.pid, 'SIGTERM');
      } catch (error) {
        console.warn(`Failed to kill process ${session.pid}: ${error}`);
      }
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
      session => session.worktreePath === worktreePath && session.status === 'running'
    );
  }

  getSessionForBranch(branch: string): AgentSession | undefined {
    return Array.from(this.sessions.values()).find(
      session => session.branch === branch && session.status === 'running'
    );
  }

  cleanupSessions(): void {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.status === 'running' && session.lastActivity) {
        const timeSinceActivity = now.getTime() - session.lastActivity.getTime();
        if (timeSinceActivity > this.config.sessionTimeout!) {
          expiredSessions.push(sessionId);
        }
      }

      if (session.pid && session.status === 'running') {
        try {
          process.kill(session.pid, 0);
        } catch {
          session.status = 'stopped';
          this.sessions.set(sessionId, session);
          this.saveSession(session);
        }
      }
    }

    for (const sessionId of expiredSessions) {
      this.stopSession(sessionId);
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
}