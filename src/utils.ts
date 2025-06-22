import { execSync, spawn } from 'child_process';

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
  options: { cwd?: string; detached?: boolean; interactive?: boolean } = {}
): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      detached: options.detached || false,
      stdio: options.interactive ? 'inherit' : (options.detached ? 'ignore' : 'inherit'),
    });

    if (options.detached && !options.interactive) {
      child.unref();
      resolve(0);
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

export function getUncommittedFiles(cwd: string): string[] {
  try {
    const output = execCommand('git status --porcelain', cwd);
    if (!output) {
      return [];
    }

    return output
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => line.substring(3));
  } catch (error) {
    return [];
  }
}

export function getBranchNameFromPath(worktreePath: string): string {
  try {
    return execCommand('git branch --show-current', worktreePath);
  } catch {
    return execCommand('git rev-parse --short HEAD', worktreePath);
  }
}