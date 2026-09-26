import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { readAgents } from './agent/loader.js';
import { readCommands } from './command/loader.js';
import plugin from './plugin.js';
import { readRules } from './rule/loader.js';
import { readSkills } from './skill/loader.js';

/**
 * A context that records what the plugin registers instead of talking to
 * OpenCode. The agent editor mirrors the real one: `update` creates an unknown
 * id from a `* allow` default, so an appended rule has to be able to win.
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
  const created = new Map();
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
              const agent = created.get(id) ?? {
                id,
                mode: 'primary',
                hidden: false,
                permissions: [{ action: '*', resource: '*', effect: 'allow' }],
              };
              update(agent);
              created.set(id, agent);
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

    expect(state.commands.map((command) => command.name)).toEqual(readCommands().map((command) => command.name));

    const readonly = state.commands.find((command) => command.name === 'readonly');
    await readonly.execute({ sessionID: 's1', prompt: { text: 'now' }, delivery: 'steer' });
    expect(state.prompts).toHaveLength(1);
    expect(state.prompts[0]).toMatchObject({ sessionID: 's1', delivery: 'steer' });
    expect(state.prompts[0].text).toContain('【临时安全模式】');
    expect(state.prompts[0].text.endsWith('now')).toBe(true);
  });

  it('sends the command body alone when the invocation has no text', async () => {
    const { ctx, state } = fakeCtx();
    await plugin.setup(ctx);

    const readonly = state.commands.find((command) => command.name === 'readonly');
    await readonly.execute({ sessionID: 's1', prompt: { text: '' }, delivery: 'queue' });
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
    expect(event.system).toHaveLength(1 + readRules().length);
  });

  it('leaves a request without a system array alone', async () => {
    const { ctx, state } = fakeCtx();
    await plugin.setup(ctx);

    const event = {};
    state.contextHooks[0].cb(event);
    expect(event).toEqual({});
  });

  it('creates every shipped definition, which OpenCode does not have yet', async () => {
    const { ctx, state } = fakeCtx();
    await plugin.setup(ctx);

    const definitions = readAgents().filter((entry) => entry.form === 'define');
    expect(definitions.length).toBeGreaterThan(0);
    expect(state.agentUpdates.map((update) => update.id).sort()).toEqual(
      definitions.map((entry) => entry.id).sort(),
    );
  });

  it('gives a created agent its prompt as the system prompt', async () => {
    const { ctx, state } = fakeCtx();
    await plugin.setup(ctx);

    for (const entry of readAgents().filter((item) => item.form === 'define')) {
      const update = state.agentUpdates.find((item) => item.id === entry.id);
      expect(update.agent.system).toBe(entry.fields.system);
      expect(update.agent.mode).toBe('subagent');
    }
  });

  it('appends permissions after the defaults instead of replacing them', async () => {
    const { ctx, state } = fakeCtx();
    await plugin.setup(ctx);

    for (const entry of readAgents()) {
      const update = state.agentUpdates.find((item) => item.id === entry.id);
      const rules = entry.fields.permissions;
      if (!Array.isArray(rules)) continue;
      // `Permission.evaluate` resolves with findLast, so an appended rule wins
      // over the `* allow` every agent is created with.
      expect(update.agent.permissions[0]).toEqual({
        action: '*',
        resource: '*',
        effect: 'allow',
      });
      expect(update.agent.permissions.slice(-rules.length)).toEqual(rules);
    }
  });

  it('updates a shipped patch only when OpenCode already has that agent', async () => {
    const { ctx, state } = fakeCtx(['build', 'plan']);
    await plugin.setup(ctx);

    const shipped = readAgents();
    const patched = shipped
      .filter((entry) => entry.form === 'patch')
      .map((entry) => entry.id)
      .filter((id) => ['build', 'plan'].includes(id));
    const updated = state.agentUpdates.map((update) => update.id);
    for (const id of patched) expect(updated).toContain(id);
    // `build` and `plan` are the pre-existing ids; nothing ships a patch for
    // either, so the plugin must not invent them.
    for (const id of ['build', 'plan']) {
      if (shipped.some((entry) => entry.id === id)) continue;
      expect(updated).not.toContain(id);
    }
    expect(updated).toEqual(
      expect.arrayContaining(shipped.filter((e) => e.form === 'define').map((e) => e.id)),
    );
  });

  it('disposes every registration when the plugin unloads', async () => {
    const { ctx, state } = fakeCtx();
    const dispose = await plugin.setup(ctx);
    await dispose();
    const expected = [];
    if (readCommands().length > 0) expected.push('command');
    if (readSkills().length > 0) expected.push('skill');
    if (readAgents().length > 0) expected.push('agent');
    if (readRules().length > 0) expected.push('hook');
    expect(state.disposed.sort()).toEqual(expected.sort());
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
