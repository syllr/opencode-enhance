import { describe, expect, it } from 'vitest';

import { assertAgentFields, assertPermissions, readAgentDefinition, readAgents } from './loader.js';

describe('assertAgentFields', () => {
  it('accepts the V2 fields', () => {
    const fields = { description: 'x', mode: 'subagent' };
    expect(assertAgentFields(fields, 'agents/build.json')).toBe(fields);
  });

  it('rejects a legacy or misspelled field by name', () => {
    expect(() => assertAgentFields({ temperature: 0.1 }, 'agents/build.json')).toThrow(
      /unknown agent field "temperature"/,
    );
  });
});

describe('assertPermissions', () => {
  it('accepts a ruleset', () => {
    const rules = [{ action: 'edit', resource: '*', effect: 'deny' }];
    expect(assertPermissions(rules, 'agents/x/agent.json')).toBe(rules);
  });

  it('rejects the V1 map form, whose keys are not actions', () => {
    expect(() => assertPermissions({ edit: 'deny' }, 'agents/x/agent.json')).toThrow(
      /must be an array/,
    );
  });

  it('rejects an unknown effect instead of letting the rule fail open', () => {
    expect(() =>
      assertPermissions([{ action: 'edit', resource: '*', effect: 'nope' }], 'agents/x/agent.json'),
    ).toThrow(/must be allow, ask or deny/);
  });

  it('rejects a rule missing a key', () => {
    expect(() => assertPermissions([{ action: 'edit', effect: 'deny' }], 'agents/x/agent.json')).toThrow(
      /non-empty string "resource"/,
    );
  });
});

describe('readAgents', () => {
  it('every shipped entry names the V2 fields only', () => {
    for (const entry of readAgents()) {
      expect(entry.id).not.toBe('');
      expect(Object.keys(entry.fields).length).toBeGreaterThan(0);
      const source =
        entry.form === 'define' ? `agents/${entry.id}/agent.json` : `agents/${entry.id}.json`;
      expect(() => assertAgentFields(entry.fields, source)).not.toThrow();
    }
  });

  it('reads both forms and sorts them by id', () => {
    const ids = readAgents().map((entry) => entry.id);
    expect(ids).toEqual([...ids].sort());
  });

  it('gives every definition a non-empty system prompt', () => {
    const definitions = readAgents().filter((entry) => entry.form === 'define');
    expect(definitions.length).toBeGreaterThan(0);
    for (const entry of definitions) {
      expect(typeof entry.fields.system).toBe('string');
      expect(/** @type {string} */ (entry.fields.system).trim()).not.toBe('');
    }
  });

  it('asks every definition to answer in Chinese, per rules/output-language.md', () => {
    for (const entry of readAgents().filter((item) => item.form === 'define')) {
      expect(/** @type {string} */ (entry.fields.system)).toContain('一律用中文回复');
    }
  });

  it('leaves no prompt naming a tool OpenCode does not have', () => {
    // Copied prompts used to name OhMyOpenCode-only MCP tools, which would send
    // the model after tools that do not exist here.
    const absent = ['context7', 'grep_app', 'websearch_exa', 'ast-grep', 'new Date()'];
    for (const entry of readAgents().filter((item) => item.form === 'define')) {
      const system = /** @type {string} */ (entry.fields.system);
      for (const tool of absent) expect(system).not.toContain(tool);
    }
  });
});

describe('readAgentDefinition', () => {
  it('carries the prompt file in as the system prompt', () => {
    const entry = readAgentDefinition('oracle');
    expect(entry.form).toBe('define');
    expect(entry.fields.system).toContain('战略技术顾问');
    expect(entry.fields.mode).toBe('subagent');
  });

  it('denies the write tools through the one action they share', () => {
    expect(readAgentDefinition('librarian').fields.permissions).toEqual([
      { action: 'edit', resource: '*', effect: 'deny' },
      { action: 'subagent', resource: '*', effect: 'deny' },
    ]);
  });

  it('names an unknown directory instead of leaking a bare fs error', () => {
    expect(() => readAgentDefinition('nope')).toThrow(/agents\/nope\/agent\.json/);
  });
});
