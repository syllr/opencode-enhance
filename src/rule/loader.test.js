import { describe, expect, it } from 'vitest';

import { readRule, readRules } from './loader.js';

describe('readRules', () => {
  it('lists every shipped rule, sorted, each starting with its heading', () => {
    const rules = readRules();
    expect(rules.map((rule) => rule.id)).toEqual([
      'git-commit-block',
      'local-env-changes-block',
      'output-language',
      'remote-shell-execution',
      'user-decision',
      'webfetch-fallback',
    ]);
    for (const rule of rules) {
      expect(rule.text.startsWith('#')).toBe(true);
    }
  });
});

describe('readRule', () => {
  it('fails on a file that does not exist', () => {
    expect(() => readRule('nope')).toThrow();
  });
});
