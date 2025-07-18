import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import path from 'path';
import os from 'os';
import { AgentSession } from './types';
import { hashRepositoryPath, getGitRoot } from './utils';

export class MigrationManager {
  private baseDir: string;
  private oldSessionDir: string;
  private repositoriesDir: string;

  constructor() {
    this.baseDir = path.join(os.homedir(), '.cc-worktree');
    this.oldSessionDir = path.join(this.baseDir, 'sessions');
    this.repositoriesDir = path.join(this.baseDir, 'repositories');
  }

  async migrateToRepositoryBased(): Promise<void> {
    if (!existsSync(this.oldSessionDir)) {
      console.log('No old sessions to migrate');
      return;
    }

    if (!existsSync(this.repositoriesDir)) {
      mkdirSync(this.repositoriesDir, { recursive: true });
    }

    try {
      const sessionFiles = readdirSync(this.oldSessionDir);
      const sessionsByRepo = new Map<string, AgentSession[]>();

      for (const file of sessionFiles) {
        if (file.endsWith('.json')) {
          try {
            const sessionData = readFileSync(path.join(this.oldSessionDir, file), 'utf-8');
            const session: AgentSession = JSON.parse(sessionData);
            
            session.startTime = new Date(session.startTime);
            if (session.lastActivity) {
              session.lastActivity = new Date(session.lastActivity);
            }

            const repoPath = this.getRepositoryPathFromWorktree(session.worktreePath);
            if (repoPath) {
              const repoHash = hashRepositoryPath(repoPath);
              if (!sessionsByRepo.has(repoHash)) {
                sessionsByRepo.set(repoHash, []);
              }
              sessionsByRepo.get(repoHash)!.push(session);
            } else {
              console.warn(`Could not determine repository for session: ${session.id}`);
            }
          } catch (error) {
            console.warn(`Failed to migrate session from ${file}: ${error}`);
          }
        }
      }

      for (const [repoHash, sessions] of sessionsByRepo.entries()) {
        const repoSessionDir = path.join(this.repositoriesDir, repoHash, 'sessions');
        if (!existsSync(repoSessionDir)) {
          mkdirSync(repoSessionDir, { recursive: true });
        }

        for (const session of sessions) {
          const sessionFile = path.join(repoSessionDir, `${session.id}.json`);
          writeFileSync(sessionFile, JSON.stringify(session, null, 2));
        }
      }

      this.createMigrationMarker();
      console.log(`Migrated ${sessionFiles.length} sessions to repository-based structure`);
    } catch (error) {
      throw new Error(`Migration failed: ${error}`);
    }
  }

  private getRepositoryPathFromWorktree(worktreePath: string): string | null {
    try {
      return getGitRoot(worktreePath);
    } catch {
      return null;
    }
  }

  private createMigrationMarker(): void {
    const markerFile = path.join(this.baseDir, '.migrated');
    writeFileSync(markerFile, new Date().toISOString());
  }

  isMigrationNeeded(): boolean {
    const markerFile = path.join(this.baseDir, '.migrated');
    return existsSync(this.oldSessionDir) && !existsSync(markerFile);
  }

  cleanupOldSessions(): void {
    if (existsSync(this.oldSessionDir)) {
      try {
        const sessionFiles = readdirSync(this.oldSessionDir);
        for (const file of sessionFiles) {
          if (file.endsWith('.json')) {
            unlinkSync(path.join(this.oldSessionDir, file));
          }
        }
        console.log('Cleaned up old session files');
      } catch (error) {
        console.warn(`Failed to cleanup old sessions: ${error}`);
      }
    }
  }
}