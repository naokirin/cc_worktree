import { Config } from './types';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import os from 'os';
import { getGitRoot, hashRepositoryPath } from './utils';

export class ConfigManager {
  private configDir: string;
  private configFile: string;
  private repositoryPath?: string;
  private repositoryConfigDir?: string;
  private repositoryConfigFile?: string;
  private defaultConfig: Config = {
    defaultClaudeCommand: 'claude',
    maxConcurrentSessions: 5,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    autoCleanup: true,
  };

  constructor(repositoryPath?: string) {
    this.configDir = path.join(os.homedir(), '.cc-worktree');
    this.configFile = path.join(this.configDir, 'config.json');
    
    if (repositoryPath) {
      this.repositoryPath = repositoryPath;
      const repoHash = hashRepositoryPath(repositoryPath);
      this.repositoryConfigDir = path.join(this.configDir, 'repositories', repoHash);
      this.repositoryConfigFile = path.join(this.repositoryConfigDir, 'config.json');
    }
    
    if (!existsSync(this.configDir)) {
      mkdirSync(this.configDir, { recursive: true });
    }
    
    if (this.repositoryConfigDir && !existsSync(this.repositoryConfigDir)) {
      mkdirSync(this.repositoryConfigDir, { recursive: true });
    }
  }

  loadConfig(): Config {
    let globalConfig = this.defaultConfig;
    
    if (existsSync(this.configFile)) {
      try {
        const configData = readFileSync(this.configFile, 'utf-8');
        const userConfig = JSON.parse(configData);
        globalConfig = { ...this.defaultConfig, ...userConfig };
      } catch (error) {
        console.warn(`Failed to load global config: ${error}`);
      }
    } else {
      this.saveGlobalConfig(this.defaultConfig);
    }

    if (this.repositoryConfigFile && existsSync(this.repositoryConfigFile)) {
      try {
        const repoConfigData = readFileSync(this.repositoryConfigFile, 'utf-8');
        const repoConfig = JSON.parse(repoConfigData);
        return { ...globalConfig, ...repoConfig };
      } catch (error) {
        console.warn(`Failed to load repository config: ${error}`);
      }
    }

    return globalConfig;
  }

  saveConfig(config: Config): void {
    const targetFile = this.repositoryConfigFile || this.configFile;
    const targetDir = path.dirname(targetFile);
    
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }
    
    try {
      writeFileSync(targetFile, JSON.stringify(config, null, 2));
    } catch (error) {
      throw new Error(`Failed to save config: ${error}`);
    }
  }

  saveGlobalConfig(config: Config): void {
    try {
      writeFileSync(this.configFile, JSON.stringify(config, null, 2));
    } catch (error) {
      throw new Error(`Failed to save global config: ${error}`);
    }
  }

  saveRepositoryConfig(config: Config): void {
    if (!this.repositoryConfigFile) {
      throw new Error('Repository config file not initialized');
    }
    try {
      writeFileSync(this.repositoryConfigFile, JSON.stringify(config, null, 2));
    } catch (error) {
      throw new Error(`Failed to save repository config: ${error}`);
    }
  }

  getDefaultConfig(): Config {
    return { ...this.defaultConfig };
  }

  resetConfig(): void {
    this.saveConfig(this.defaultConfig);
  }

  getRepositoryHash(): string | undefined {
    if (this.repositoryPath) {
      return hashRepositoryPath(this.repositoryPath);
    }
    return undefined;
  }

  static createForRepository(cwd: string = process.cwd()): ConfigManager {
    try {
      const repoRoot = getGitRoot(cwd);
      return new ConfigManager(repoRoot);
    } catch {
      return new ConfigManager();
    }
  }
}