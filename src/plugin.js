// OpenCode enhancement plugin.
//
// It ships this package's own content and registers it with OpenCode:
//
//   commands/<name>.md    a slash command; the body is the prompt it sends
//   skills/<id>/SKILL.md  a skill
//   rules/<id>.md         a rule appended to every agent-loop system prompt
//   agents/<id>.json      field overrides for an agent that already exists
//
// Adding content is therefore a file, not a code change.
//
// Everything is registered through transforms, so OpenCode can rebuild its
// registries and disposing a registration restores the previous state. The
// content is read once during setup and the transform callbacks only replay it,
// which is what keeps them cheap and repeatable.
//
// The plugin does no I/O outside setup and starts no timer, subscription or
// background work. Rules reach the model through a `context` hook, which runs
// per model request and only edits that request.

import { readAgentPatches } from './agent/loader.js';
import { readCommands } from './command/loader.js';
import { readRules } from './rule/loader.js';
import { readSkills } from './skill/loader.js';

/**
 * @typedef {{ dispose: () => Promise<void> | void }} Registration
 *
 * @typedef {{
 *   command?: {
 *     transform: (cb: (editor: {
 *       add: (definition: {
 *         name: string,
 *         description?: string,
 *         execute: (input: {
 *           sessionID: string,
 *           prompt: { text: string },
 *           delivery: unknown,
 *         }) => Promise<void>,
 *       }) => void,
 *     }) => void) => Promise<Registration>,
 *   },
 *   skill?: {
 *     transform: (cb: (editor: { add: (definition: Record<string, unknown>) => void }) => void) => Promise<Registration>,
 *   },
 *   agent?: {
 *     transform: (cb: (editor: {
 *       get: (id: string) => unknown,
 *       update: (id: string, update: (agent: Record<string, unknown>) => void) => void,
 *     }) => void) => Promise<Registration>,
 *   },
 *   session?: {
 *     prompt: (input: Record<string, unknown>) => Promise<unknown>,
 *     hook: (name: 'context', cb: (event: { system?: unknown }) => void) => Promise<Registration>,
 *   },
 * }} EnhanceContext
 */

export default {
  id: 'opencode-enhance',

  /**
   * @param {EnhanceContext} ctx
   * @returns {Promise<() => Promise<void>>} Runs when the plugin unloads.
   */
  async setup(ctx) {
    /** @type {Registration[]} */
    const registrations = [];

    const commands = readCommands();
    if (commands.length > 0 && typeof ctx.command?.transform === 'function') {
      registrations.push(
        await ctx.command.transform((editor) => {
          for (const command of commands) {
            editor.add({
              name: command.name,
              description: command.description,
              execute: async ({ sessionID, prompt, delivery }) => {
                await ctx.session?.prompt({
                  ...prompt,
                  sessionID,
                  text: prompt.text ? `${command.text}\n\n${prompt.text}` : command.text,
                  delivery,
                });
              },
            });
          }
        }),
      );
    }

    const skills = readSkills();
    if (skills.length > 0 && typeof ctx.skill?.transform === 'function') {
      registrations.push(
        await ctx.skill.transform((editor) => {
          for (const skill of skills) editor.add(skill);
        }),
      );
    }

    const patches = readAgentPatches();
    if (patches.length > 0 && typeof ctx.agent?.transform === 'function') {
      registrations.push(
        await ctx.agent.transform((editor) => {
          for (const patch of patches) {
            if (!editor.get(patch.id)) continue;
            editor.update(patch.id, (agent) => {
              Object.assign(agent, patch.fields);
            });
          }
        }),
      );
    }

    const rules = readRules();
    if (rules.length > 0 && typeof ctx.session?.hook === 'function') {
      registrations.push(
        await ctx.session.hook('context', (event) => {
          const system = event?.system;
          if (!Array.isArray(system)) return;
          for (const rule of rules) {
            const already = system.some(
              (part) => /** @type {{ text?: string }} */ (part)?.text === rule.text,
            );
            if (already) continue;
            system.push({ type: 'text', text: rule.text });
          }
        }),
      );
    }

    return async () => {
      for (const registration of [...registrations].reverse()) {
        try {
          await registration.dispose();
        } catch {
          // best effort: unloading must not fail on one bad registration
        }
      }
    };
  },
};
