import { Config } from './types';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import os from 'os';

export class ConfigManager {
  private configDir: string;
  private configFile: string;
  private defaultConfig: Config = {
    defaultClaudeCommand: 'claude',
    maxConcurrentSessions: 5,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    autoCleanup: true,
  };

  constructor() {
    this.configDir = path.join(os.homedir(), '.claude-worktree');
    this.configFile = path.join(this.configDir, 'config.json');
    
    if (!existsSync(this.configDir)) {
      mkdirSync(this.configDir, { recursive: true });
    }
  }

  loadConfig(): Config {
    if (!existsSync(this.configFile)) {
      this.saveConfig(this.defaultConfig);
      return this.defaultConfig;
    }

    try {
      const configData = readFileSync(this.configFile, 'utf-8');
      const userConfig = JSON.parse(configData);
      return { ...this.defaultConfig, ...userConfig };
    } catch (error) {
      console.warn(`Failed to load config: ${error}`);
      return this.defaultConfig;
    }
  }

  saveConfig(config: Config): void {
    try {
      writeFileSync(this.configFile, JSON.stringify(config, null, 2));
    } catch (error) {
      throw new Error(`Failed to save config: ${error}`);
    }
  }

  getDefaultConfig(): Config {
    return { ...this.defaultConfig };
  }

  resetConfig(): void {
    this.saveConfig(this.defaultConfig);
  }
}