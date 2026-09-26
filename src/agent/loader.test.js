import { describe, expect, it } from 'vitest';

import { assertAgentFields, readAgentPatches } from './loader.js';

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

describe('readAgentPatches', () => {
  it('every shipped patch names the V2 fields only', () => {
    for (const patch of readAgentPatches()) {
      expect(patch.id).not.toBe('');
      expect(Object.keys(patch.fields).length).toBeGreaterThan(0);
      expect(() => assertAgentFields(patch.fields, `agents/${patch.id}.json`)).not.toThrow();
    }
  });
});
