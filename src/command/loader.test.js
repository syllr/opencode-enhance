import { readdirSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { readCommand, readCommands } from './loader.js';

describe('readCommand', () => {
  it('uses the file name as the name and the body as the prompt', () => {
    const command = readCommand('readonly');
    expect(command.name).toBe('readonly');
    expect(command.description).toContain('只读');
    expect(command.text.startsWith('【临时安全模式】')).toBe(true);
  });

  it('fails on a file that does not exist', () => {
    expect(() => readCommand('nope')).toThrow();
  });
});

describe('readCommands', () => {
  it('lists every shipped command, sorted, each with a description and a body', () => {
    const commands = readCommands();
    const shipped = readdirSync(new URL('../../commands/', import.meta.url), { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => entry.name.replace(/\.md$/, ''))
      .sort();
    expect(commands.map((command) => command.name)).toEqual(shipped);
    for (const command of commands) {
      expect(command.description).not.toBe('');
      expect(command.text).not.toBe('');
    }
  });
});
