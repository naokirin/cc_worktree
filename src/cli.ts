#!/usr/bin/env node

import { Command } from 'commander';
import { WorktreeManager } from './worktree';
import { AgentManager } from './agent';
import { ConfigManager } from './config';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import path from 'path';

const packageJson = JSON.parse(
  readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8')
);

const program = new Command();
const configManager = new ConfigManager();
const config = configManager.loadConfig();
const agentManager = new AgentManager(config);

program
  .name('agent-worktree')
  .description('Git worktree and Claude Code integration tool for parallel development')
  .version(packageJson.version);

program
  .command('create')
  .description('Create a new worktree and start Claude Code session')
  .argument('<branch>', 'Branch name for the new worktree')
  .option('-p, --path <path>', 'Custom path for the worktree')
  .option('--no-session', 'Create worktree without starting Claude Code session')
  .action(async (branch, options) => {
    try {
      const worktreeManager = new WorktreeManager();
      
      console.log(chalk.blue(`Creating worktree for branch: ${branch}`));
      const worktree = worktreeManager.createWorktree(branch, options.path);
      console.log(chalk.green(`✓ Worktree created at: ${worktree.path}`));

      if (options.session !== false) {
        console.log(chalk.blue('Starting Claude Code session...'));
        const session = await agentManager.startSession(worktree.path, branch);
        console.log(chalk.green(`✓ Claude Code session started (ID: ${session.id})`));
        console.log(chalk.gray(`  PID: ${session.pid}`));
        console.log(chalk.gray(`  Path: ${session.worktreePath}`));
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });

program
  .command('start')
  .description('Start Claude Code session for existing worktree')
  .argument('<branch-or-path>', 'Branch name or worktree path')
  .action(async (branchOrPath) => {
    try {
      const worktreeManager = new WorktreeManager();
      const worktrees = worktreeManager.listWorktrees();
      
      let worktree = worktrees.find(w => w.branch === branchOrPath || w.path === branchOrPath);
      
      if (!worktree) {
        throw new Error(`Worktree not found: ${branchOrPath}`);
      }

      const existingSession = agentManager.getSessionForWorktree(worktree.path);
      if (existingSession) {
        console.log(chalk.yellow(`Session already running for this worktree (ID: ${existingSession.id})`));
        return;
      }

      console.log(chalk.blue(`Starting Claude Code session for: ${worktree.branch}`));
      const session = await agentManager.startSession(worktree.path, worktree.branch!);
      console.log(chalk.green(`✓ Claude Code session started (ID: ${session.id})`));
      console.log(chalk.gray(`  PID: ${session.pid}`));
      console.log(chalk.gray(`  Path: ${session.worktreePath}`));
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });

program
  .command('stop')
  .description('Stop Claude Code session')
  .argument('<session-id-or-branch>', 'Session ID or branch name')
  .action((sessionIdOrBranch) => {
    try {
      let session = agentManager.getSession(sessionIdOrBranch);
      
      if (!session) {
        session = agentManager.getSessionForBranch(sessionIdOrBranch);
      }

      if (!session) {
        throw new Error(`Session not found: ${sessionIdOrBranch}`);
      }

      agentManager.stopSession(session.id);
      console.log(chalk.green(`✓ Session stopped (ID: ${session.id})`));
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List all worktrees and sessions')
  .option('-w, --worktrees-only', 'Show only worktrees')
  .option('-s, --sessions-only', 'Show only sessions')
  .action((options) => {
    try {
      if (!options.sessionsOnly) {
        const worktreeManager = new WorktreeManager();
        const worktrees = worktreeManager.listWorktrees();
        
        console.log(chalk.bold('\nWorktrees:'));
        if (worktrees.length === 0) {
          console.log(chalk.gray('  No worktrees found'));
        } else {
          worktrees.forEach(worktree => {
            const status = worktree.locked ? ' (locked)' : worktree.prunable ? ' (prunable)' : '';
            console.log(`  ${chalk.cyan(worktree.branch || 'detached')}${status}`);
            console.log(`    ${chalk.gray(worktree.path)}`);
            console.log(`    ${chalk.gray(`HEAD: ${worktree.head}`)}`);
          });
        }
      }

      if (!options.worktreesOnly) {
        const sessions = agentManager.listSessions();
        
        console.log(chalk.bold('\nClaude Code Sessions:'));
        if (sessions.length === 0) {
          console.log(chalk.gray('  No active sessions'));
        } else {
          sessions.forEach(session => {
            const statusColor = session.status === 'running' ? chalk.green : 
                              session.status === 'error' ? chalk.red : chalk.yellow;
            const duration = new Date().getTime() - session.startTime.getTime();
            const durationStr = Math.floor(duration / 60000) + 'm';
            
            console.log(`  ${statusColor(session.status)} ${chalk.cyan(session.branch)} (${session.id})`);
            console.log(`    ${chalk.gray(session.worktreePath)}`);
            console.log(`    ${chalk.gray(`PID: ${session.pid || 'N/A'}, Duration: ${durationStr}`)}`);
          });
        }
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });

program
  .command('remove')
  .description('Remove worktree')
  .argument('<branch-or-path>', 'Branch name or worktree path')
  .option('-f, --force', 'Force remove even if worktree has uncommitted changes')
  .action((branchOrPath, options) => {
    try {
      const worktreeManager = new WorktreeManager();
      
      const session = agentManager.getSessionForBranch(branchOrPath) || 
                     agentManager.getSessionForWorktree(branchOrPath);
      
      if (session && session.status === 'running') {
        console.log(chalk.yellow('Stopping active Claude Code session...'));
        agentManager.stopSession(session.id);
      }

      console.log(chalk.blue(`Removing worktree: ${branchOrPath}`));
      worktreeManager.removeWorktree(branchOrPath, options.force);
      console.log(chalk.green('✓ Worktree removed'));

      if (session) {
        agentManager.removeSession(session.id);
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });

program
  .command('cleanup')
  .description('Clean up stopped sessions and prunable worktrees')
  .action(() => {
    try {
      const worktreeManager = new WorktreeManager();
      
      console.log(chalk.blue('Cleaning up sessions...'));
      agentManager.cleanupSessions();
      
      console.log(chalk.blue('Pruning worktrees...'));
      worktreeManager.pruneWorktrees();
      
      console.log(chalk.green('✓ Cleanup completed'));
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Manage configuration')
  .option('--show', 'Show current configuration')
  .option('--reset', 'Reset configuration to defaults')
  .option('--set <key=value>', 'Set configuration value')
  .action((options) => {
    try {
      if (options.show) {
        const currentConfig = configManager.loadConfig();
        console.log(chalk.bold('Current Configuration:'));
        console.log(JSON.stringify(currentConfig, null, 2));
        return;
      }

      if (options.reset) {
        configManager.resetConfig();
        console.log(chalk.green('✓ Configuration reset to defaults'));
        return;
      }

      if (options.set) {
        const config = configManager.loadConfig();
        const [key, value] = options.set.split('=');
        if (!key || value === undefined) {
          throw new Error('Invalid format. Use: key=value');
        }

        // Parse value based on key
        let parsedValue: any = value;
        if (key === 'maxConcurrentSessions' || key === 'sessionTimeout') {
          parsedValue = parseInt(value, 10);
          if (isNaN(parsedValue)) {
            throw new Error(`Invalid number value for ${key}: ${value}`);
          }
        } else if (key === 'autoCleanup') {
          parsedValue = value.toLowerCase() === 'true';
        }

        (config as any)[key] = parsedValue;
        configManager.saveConfig(config);
        console.log(chalk.green(`✓ Configuration updated: ${key}=${parsedValue}`));
        return;
      }

      program.help();
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });

program.parse();