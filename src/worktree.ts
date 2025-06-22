import { execCommand, isGitRepository, getGitRoot, sanitizeBranchName } from './utils';
import { WorktreeInfo } from './types';
import path from 'path';
import { existsSync } from 'fs';

export class WorktreeManager {
  private gitRoot: string;

  constructor(cwd: string = process.cwd()) {
    if (!isGitRepository(cwd)) {
      throw new Error('Not in a git repository');
    }
    this.gitRoot = getGitRoot(cwd);
  }

  listWorktrees(): WorktreeInfo[] {
    try {
      const output = execCommand('git worktree list --porcelain', this.gitRoot);
      return this.parseWorktreeList(output);
    } catch (error) {
      throw new Error(`Failed to list worktrees: ${error}`);
    }
  }

  private parseWorktreeList(output: string): WorktreeInfo[] {
    const worktrees: WorktreeInfo[] = [];
    const lines = output.split('\n');
    let currentWorktree: Partial<WorktreeInfo> = {};

    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        if (currentWorktree.path) {
          worktrees.push(currentWorktree as WorktreeInfo);
        }
        currentWorktree = { path: line.substring(9) };
      } else if (line.startsWith('HEAD ')) {
        currentWorktree.head = line.substring(5);
      } else if (line.startsWith('branch ')) {
        currentWorktree.branch = line.substring(7);
      } else if (line === 'bare') {
        currentWorktree.bare = true;
      } else if (line === 'detached') {
        currentWorktree.detached = true;
      } else if (line.startsWith('locked')) {
        currentWorktree.locked = true;
      } else if (line === 'prunable') {
        currentWorktree.prunable = true;
      }
    }

    if (currentWorktree.path) {
      worktrees.push(currentWorktree as WorktreeInfo);
    }

    return worktrees;
  }

  createWorktree(branchName: string, targetPath?: string): WorktreeInfo {
    const sanitizedBranch = sanitizeBranchName(branchName);
    const worktreePath = targetPath || path.join(
      path.dirname(this.gitRoot),
      `${path.basename(this.gitRoot)}-${sanitizedBranch}`
    );

    if (existsSync(worktreePath)) {
      throw new Error(`Path already exists: ${worktreePath}`);
    }

    try {
      const branchExists = this.branchExists(branchName);
      
      if (branchExists) {
        execCommand(`git worktree add "${worktreePath}" "${branchName}"`, this.gitRoot);
      } else {
        execCommand(`git worktree add -b "${branchName}" "${worktreePath}"`, this.gitRoot);
      }

      const worktrees = this.listWorktrees();
      const newWorktree = worktrees.find(w => w.path === worktreePath);
      
      if (!newWorktree) {
        throw new Error('Failed to create worktree');
      }

      return newWorktree;
    } catch (error) {
      throw new Error(`Failed to create worktree: ${error}`);
    }
  }

  removeWorktree(pathOrBranch: string, force: boolean = false): void {
    const worktrees = this.listWorktrees();
    const worktree = worktrees.find(w => 
      w.path === pathOrBranch || w.branch === pathOrBranch
    );

    if (!worktree) {
      throw new Error(`Worktree not found: ${pathOrBranch}`);
    }

    try {
      const forceFlag = force ? '--force' : '';
      execCommand(`git worktree remove ${forceFlag} "${worktree.path}"`, this.gitRoot);
    } catch (error) {
      throw new Error(`Failed to remove worktree: ${error}`);
    }
  }

  private branchExists(branchName: string): boolean {
    try {
      execCommand(`git show-ref --verify --quiet refs/heads/${branchName}`, this.gitRoot);
      return true;
    } catch {
      try {
        execCommand(`git show-ref --verify --quiet refs/remotes/origin/${branchName}`, this.gitRoot);
        return true;
      } catch {
        return false;
      }
    }
  }

  getWorktreeForBranch(branchName: string): WorktreeInfo | undefined {
    const worktrees = this.listWorktrees();
    return worktrees.find(w => w.branch === branchName);
  }

  pruneWorktrees(): void {
    try {
      execCommand('git worktree prune', this.gitRoot);
    } catch (error) {
      throw new Error(`Failed to prune worktrees: ${error}`);
    }
  }
}