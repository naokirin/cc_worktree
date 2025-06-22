import { sanitizeBranchName, generateSessionId } from '../utils';

describe('Utils', () => {
  describe('sanitizeBranchName', () => {
    it('should replace invalid characters with dashes', () => {
      expect(sanitizeBranchName('feature/new-api')).toBe('feature/new-api');
      expect(sanitizeBranchName('feature@branch')).toBe('feature-branch');
      expect(sanitizeBranchName('feature branch')).toBe('feature-branch');
      expect(sanitizeBranchName('feature#123')).toBe('feature-123');
    });

    it('should handle empty string', () => {
      expect(sanitizeBranchName('')).toBe('');
    });

    it('should preserve valid characters', () => {
      expect(sanitizeBranchName('feature-123_test')).toBe('feature-123_test');
    });
  });

  describe('generateSessionId', () => {
    it('should generate unique session IDs', () => {
      const id1 = generateSessionId();
      const id2 = generateSessionId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^agent-\d+-[a-z0-9]+$/);
      expect(id2).toMatch(/^agent-\d+-[a-z0-9]+$/);
    });

    it('should start with "agent-"', () => {
      const id = generateSessionId();
      expect(id).toMatch(/^agent-/);
    });
  });
});