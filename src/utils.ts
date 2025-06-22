import { execSync, spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

export function execCommand(command: string, cwd?: string): string {
  try {
    return execSync(command, { 
      cwd, 
      encoding: 'utf-8',
      stdio: 'pipe'
    }).toString().trim();
  } catch (error) {
    throw new Error(`Command failed: ${command}\n${error}`);
  }
}

export function isGitRepository(cwd: string = process.cwd()): boolean {
  try {
    execCommand('git rev-parse --git-dir', cwd);
    return true;
  } catch {
    return false;
  }
}

export function getGitRoot(cwd: string = process.cwd()): string {
  try {
    return execCommand('git rev-parse --show-toplevel', cwd);
  } catch {
    throw new Error('Not in a git repository');
  }
}

export function getBranchName(cwd: string = process.cwd()): string {
  try {
    return execCommand('git branch --show-current', cwd);
  } catch {
    return execCommand('git rev-parse --short HEAD', cwd);
  }
}

export function sanitizeBranchName(branchName: string): string {
  return branchName.replace(/[^a-zA-Z0-9\-_\/]/g, '-');
}

export function generateSessionId(): string {
  return `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function spawnCommand(
  command: string,
  args: string[],
  options: { cwd?: string; detached?: boolean } = {}
): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      detached: options.detached || false,
      stdio: options.detached ? 'ignore' : 'inherit',
    });

    if (options.detached) {
      child.unref();
      resolve(child.pid!);
    } else {
      child.on('close', (code) => {
        if (code === 0) {
          resolve(code);
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });

      child.on('error', reject);
    }
  });
}