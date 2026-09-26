import { describe, expect, it } from 'vitest';

import { parseFrontmatter, stripFrontmatter } from './frontmatter.js';

describe('parseFrontmatter', () => {
  it('reads flat pairs and unquotes the value', () => {
    const fields = parseFrontmatter('---\nname: A\ndescription: "B: C"\n---\nbody\n', 'x.md');
    expect(fields).toEqual({ name: 'A', description: 'B: C' });
  });

  it('skips blank lines and comments', () => {
    const fields = parseFrontmatter('---\n# a comment\n\nname: A\n---\n', 'x.md');
    expect(fields).toEqual({ name: 'A' });
  });

  it('fails without a block', () => {
    expect(() => parseFrontmatter('body only', 'x.md')).toThrow(/x\.md/);
  });

  it('fails on a nested line instead of flattening it', () => {
    expect(() => parseFrontmatter('---\nmodel:\n  id: x\n---\n', 'x.md')).toThrow(/must be flat/);
  });
});

describe('stripFrontmatter', () => {
  it('returns the body without the block, leading blank lines or trailing space', () => {
    expect(stripFrontmatter('---\na: 1\n---\n\nbody\n\n')).toBe('body');
  });
});
