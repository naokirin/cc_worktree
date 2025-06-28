import { MigrationManager } from '../migration';
import { existsSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import path from 'path';
import os from 'os';
import { AgentSession } from '../types';

describe('MigrationManager', () => {
  let migrationManager: MigrationManager;
  let testBaseDir: string;
  let testOldSessionDir: string;
  let testRepositoriesDir: string;

  beforeEach(() => {
    migrationManager = new MigrationManager();
    testBaseDir = path.join(os.homedir(), '.claude-worktree');
    testOldSessionDir = path.join(testBaseDir, 'sessions');
    testRepositoriesDir = path.join(testBaseDir, 'repositories');

    if (existsSync(testBaseDir)) {
      rmSync(testBaseDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    try {
      if (existsSync(testBaseDir)) {
        rmSync(testBaseDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('isMigrationNeeded', () => {
    it('should return false when no old sessions exist', () => {
      expect(migrationManager.isMigrationNeeded()).toBe(false);
    });

    it('should return true when old sessions exist and no migration marker', () => {
      mkdirSync(testOldSessionDir, { recursive: true });
      // Create a dummy session file to make directory non-empty
      writeFileSync(path.join(testOldSessionDir, 'dummy.json'), '{}');
      expect(migrationManager.isMigrationNeeded()).toBe(true);
    });

    it('should return false when migration marker exists', () => {
      mkdirSync(testOldSessionDir, { recursive: true });
      const markerFile = path.join(testBaseDir, '.migrated');
      writeFileSync(markerFile, new Date().toISOString());

      expect(migrationManager.isMigrationNeeded()).toBe(false);
    });
  });

  describe('migrateToRepositoryBased', () => {
    it('should handle empty old sessions directory', async () => {
      await expect(
        migrationManager.migrateToRepositoryBased()
      ).resolves.not.toThrow();
    });

    it('should migrate sessions to repository-based structure', async () => {
      mkdirSync(testOldSessionDir, { recursive: true });

      const testSession: AgentSession = {
        id: 'test-session-1',
        worktreePath: '/test/repo/worktree',
        branch: 'feature/test',
        status: 'completed',
        startTime: new Date(),
        lastActivity: new Date(),
      };

      const sessionFile = path.join(testOldSessionDir, 'test-session-1.json');
      writeFileSync(sessionFile, JSON.stringify(testSession, null, 2));

      const mockMigrationManager = migrationManager as unknown as {
        getRepositoryPathFromWorktree: jest.MockedFunction<
          (worktreePath: string) => string | null
        >;
      };

      const originalMethod = mockMigrationManager.getRepositoryPathFromWorktree;
      mockMigrationManager.getRepositoryPathFromWorktree = jest.fn(
        () => '/test/repo'
      );

      await migrationManager.migrateToRepositoryBased();

      expect(existsSync(testRepositoriesDir)).toBe(true);
      expect(existsSync(path.join(testBaseDir, '.migrated'))).toBe(true);

      mockMigrationManager.getRepositoryPathFromWorktree = originalMethod;
    });
  });

  describe('cleanupOldSessions', () => {
    it('should handle non-existent session directory', () => {
      expect(() => migrationManager.cleanupOldSessions()).not.toThrow();
    });

    it('should remove old session files', () => {
      mkdirSync(testOldSessionDir, { recursive: true });

      const sessionFile = path.join(testOldSessionDir, 'test-session.json');
      writeFileSync(sessionFile, '{}');

      migrationManager.cleanupOldSessions();

      expect(existsSync(sessionFile)).toBe(false);
    });
  });
});
