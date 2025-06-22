import { ConfigManager } from '../config';
import { existsSync, unlinkSync, rmdirSync } from 'fs';
import path from 'path';
import os from 'os';

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let testConfigDir: string;

  beforeEach(() => {
    configManager = new ConfigManager();
    testConfigDir = path.join(os.homedir(), '.agent-worktree');
  });

  afterEach(() => {
    try {
      const configFile = path.join(testConfigDir, 'config.json');
      if (existsSync(configFile)) {
        unlinkSync(configFile);
      }
      if (existsSync(testConfigDir)) {
        rmdirSync(testConfigDir);
      }
    } catch (error) {
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
});