import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import plugin from './plugin.js';

/**
 * A context that records what the plugin registers instead of talking to
 * OpenCode. `agentExists` decides which agent overrides apply.
 */
function fakeCtx(agentExists = ['build', 'plan']) {
  const state = {
    commands: [],
    skills: [],
    agentUpdates: [],
    contextHooks: [],
    prompts: [],
    disposed: [],
  };
  const existing = new Set(agentExists);
  return {
    state,
    ctx: {
      command: {
        transform: async (cb) => {
          cb({ add: (definition) => state.commands.push(definition) });
          return { dispose: () => state.disposed.push('command') };
        },
      },
      skill: {
        transform: async (cb) => {
          cb({ add: (definition) => state.skills.push(definition) });
          return { dispose: () => state.disposed.push('skill') };
        },
      },
      agent: {
        transform: async (cb) => {
          cb({
            get: (id) => (existing.has(id) ? { id } : undefined),
            update: (id, update) => {
              const agent = { id };
              update(agent);
              state.agentUpdates.push({ id, agent });
            },
          });
          return { dispose: () => state.disposed.push('agent') };
        },
      },
      session: {
        prompt: async (input) => {
          state.prompts.push(input);
        },
        hook: async (name, cb) => {
          state.contextHooks.push({ name, cb });
          return { dispose: () => state.disposed.push('hook') };
        },
      },
    },
  };
}

describe('setup', () => {
  it('registers every shipped command and can run it', async () => {
    const { ctx, state } = fakeCtx();
    await plugin.setup(ctx);

    expect(state.commands.map((command) => command.name)).toEqual([
      'readonly',
      'readonly-off',
      'refresh-file',
    ]);

    await state.commands[0].execute({ sessionID: 's1', prompt: { text: 'now' }, delivery: 'steer' });
    expect(state.prompts).toHaveLength(1);
    expect(state.prompts[0]).toMatchObject({ sessionID: 's1', delivery: 'steer' });
    expect(state.prompts[0].text).toContain('【临时安全模式】');
    expect(state.prompts[0].text.endsWith('now')).toBe(true);
  });

  it('sends the command body alone when the invocation has no text', async () => {
    const { ctx, state } = fakeCtx();
    await plugin.setup(ctx);

    await state.commands[0].execute({ sessionID: 's1', prompt: { text: '' }, delivery: 'queue' });
    expect(state.prompts[0].text.startsWith('【')).toBe(true);
    expect(state.prompts[0].text).not.toMatch(/\n\s*$/);
  });

  it('appends every rule to a model request, once per request', async () => {
    const { ctx, state } = fakeCtx();
    await plugin.setup(ctx);

    expect(state.contextHooks.map((hook) => hook.name)).toEqual(['context']);

    const event = { system: [{ type: 'text', text: 'existing' }] };
    state.contextHooks[0].cb(event);
    state.contextHooks[0].cb(event);

    expect(event.system[0]).toEqual({ type: 'text', text: 'existing' });
    expect(event.system).toHaveLength(7);
  });

  it('leaves a request without a system array alone', async () => {
    const { ctx, state } = fakeCtx();
    await plugin.setup(ctx);

    const event = {};
    state.contextHooks[0].cb(event);
    expect(event).toEqual({});
  });

  it('registers nothing for an empty content kind', async () => {
    const { ctx, state } = fakeCtx();
    await plugin.setup(ctx);
    expect(state.skills).toEqual([]);
    expect(state.agentUpdates).toEqual([]);
  });

  it('disposes every registration when the plugin unloads', async () => {
    const { ctx, state } = fakeCtx();
    const dispose = await plugin.setup(ctx);
    await dispose();
    expect(state.disposed.sort()).toEqual(['command', 'hook']);
  });
});

describe('the plugin source', () => {
  it('starts no timer and subscribes to no event stream', () => {
    const source = readFileSync(new URL('./plugin.js', import.meta.url), 'utf8');
    for (const forbidden of ['setInterval', 'setTimeout', 'ctx.event', 'subscribe']) {
      expect(source).not.toContain(forbidden);
    }
  });
});
