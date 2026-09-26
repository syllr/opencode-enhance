import { describe, expect, it } from 'vitest';

import { SKILL_FILE_NAME, readSkill, readSkills } from './loader.js';

describe('readSkills', () => {
  it('every shipped skill carries the fields the schema requires', () => {
    for (const skill of readSkills()) {
      expect(skill.id).not.toBe('');
      expect(skill.name).not.toBe('');
      expect(skill.description).not.toBe('');
      expect(skill.path.endsWith(SKILL_FILE_NAME)).toBe(true);
      expect(skill.content.startsWith('---')).toBe(false);
    }
  });
});

describe('readSkill', () => {
  it('fails when the document is missing', () => {
    expect(() => readSkill('nope')).toThrow();
  });
});
