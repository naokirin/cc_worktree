import { ConfigManager } from '../config';
import { existsSync, rmSync } from 'fs';
import path from 'path';
import os from 'os';

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let testConfigDir: string;

  beforeEach(() => {
    configManager = new ConfigManager();
    testConfigDir = path.join(os.homedir(), '.claude-worktree');
  });

  afterEach(() => {
    try {
      if (existsSync(testConfigDir)) {
        rmSync(testConfigDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('loadConfig', () => {
    it('should return default config when no config file exists', () => {
      const config = configManager.loadConfig();

      expect(config.defaultClaudeCommand).toBe('claude');
      expect(config.maxConcurrentSessions).toBe(5);
      expect(config.sessionTimeout).toBe(30 * 60 * 1000);
      expect(config.autoCleanup).toBe(true);
    });
  });

  describe('saveConfig', () => {
    it('should save config to file', () => {
      const customConfig = {
        defaultClaudeCommand: 'custom-claude',
        maxConcurrentSessions: 10,
        sessionTimeout: 60 * 60 * 1000,
        autoCleanup: false,
      };

      configManager.saveConfig(customConfig);
      const loadedConfig = configManager.loadConfig();

      expect(loadedConfig).toEqual(customConfig);
    });
  });

  describe('getDefaultConfig', () => {
    it('should return default config without modification', () => {
      const defaultConfig = configManager.getDefaultConfig();

      expect(defaultConfig.defaultClaudeCommand).toBe('claude');
      expect(defaultConfig.maxConcurrentSessions).toBe(5);
      expect(defaultConfig.sessionTimeout).toBe(30 * 60 * 1000);
      expect(defaultConfig.autoCleanup).toBe(true);
    });
  });

  describe('resetConfig', () => {
    it('should reset config to defaults', () => {
      const customConfig = {
        defaultClaudeCommand: 'custom-claude',
        maxConcurrentSessions: 10,
      };

      configManager.saveConfig(customConfig);
      configManager.resetConfig();

      const resetConfig = configManager.loadConfig();
      const defaultConfig = configManager.getDefaultConfig();

      expect(resetConfig).toEqual(defaultConfig);
    });
  });

  describe('Repository-based configuration', () => {
    it('should create repository-specific config manager', () => {
      const repoPath = '/test/repo/path';
      const repoConfig = new ConfigManager(repoPath);

      expect(repoConfig.getRepositoryHash()).toBeDefined();
    });

    it('should load repository-specific config with global fallback', () => {
      const repoPath = '/test/repo/path';
      const repoConfig = new ConfigManager(repoPath);

      const customGlobalConfig = {
        defaultClaudeCommand: 'global-claude',
        maxConcurrentSessions: 3,
      };

      const globalConfig = new ConfigManager();
      globalConfig.saveGlobalConfig(customGlobalConfig);

      const config = repoConfig.loadConfig();
      expect(config.defaultClaudeCommand).toBe('global-claude');
      expect(config.maxConcurrentSessions).toBe(3);
    });

    it('should override global config with repository config', () => {
      const repoPath = '/test/repo/path';
      const repoConfig = new ConfigManager(repoPath);

      const customGlobalConfig = {
        defaultClaudeCommand: 'global-claude',
        maxConcurrentSessions: 3,
      };

      const customRepoConfig = {
        defaultClaudeCommand: 'repo-claude',
        maxConcurrentSessions: 8,
      };

      const globalConfig = new ConfigManager();
      globalConfig.saveGlobalConfig(customGlobalConfig);
      repoConfig.saveRepositoryConfig(customRepoConfig);

      const config = repoConfig.loadConfig();
      expect(config.defaultClaudeCommand).toBe('repo-claude');
      expect(config.maxConcurrentSessions).toBe(8);
    });

    it('should create repository config manager from current directory', () => {
      const repoConfig = ConfigManager.createForRepository('/test/repo');
      expect(repoConfig).toBeInstanceOf(ConfigManager);
    });
  });
});
