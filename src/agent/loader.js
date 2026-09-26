// Agent field overrides this plugin ships, loaded from `agents/<agentId>.json`.
//
// The plugin API can change an existing agent but cannot create one: the agent
// editor exposes `list` / `get` / `default` / `update` / `remove` and has no
// `add`. So a file here patches fields on an agent that already exists — a
// built-in (`build`, `plan`, `general`, `explore`) or one defined in OpenCode's
// own configuration.
//
// Adding a new agent is configuration work, not plugin work: an `agents` entry
// in opencode.json(c), or a Markdown file under `~/.config/opencode/agents/` or
// `.opencode/agents/`.
//
// Only the V2 fields below are accepted. A file that names anything else throws,
// so a typo or a legacy field name fails the plugin setup instead of being
// merged into an agent where it would do nothing.

import { readFileSync, readdirSync } from 'node:fs';

/** Package-root `agents/`: one JSON file per patched agent, next to `src/`. */
const AGENTS_DIR = new URL('../../agents/', import.meta.url);

const JSON_FILE = /\.json$/;

/** Agent fields OpenCode V2 accepts. Legacy names are deliberately absent. */
export const AGENT_FIELDS = new Set([
  'description',
  'mode',
  'model',
  'system',
  'permissions',
  'steps',
  'hidden',
  'color',
  'disabled',
  'request',
]);

/**
 * Reject any field the V2 agent schema does not define.
 *
 * @param {Record<string, unknown>} fields
 * @param {string} source Used in error messages.
 * @returns {Record<string, unknown>} the same object
 */
export function assertAgentFields(fields, source) {
  for (const key of Object.keys(fields)) {
    if (!AGENT_FIELDS.has(key)) {
      throw new Error(
        `${source}: unknown agent field "${key}"; allowed: ${[...AGENT_FIELDS].join(', ')}`,
      );
    }
  }
  return fields;
}

/**
 * Load one agent override file.
 *
 * @param {string} id File name without the `.json` extension; also the agent id.
 * @returns {{ id: string, fields: Record<string, unknown> }}
 */
export function readAgentPatch(id) {
  const source = `agents/${id}.json`;
  const text = readFileSync(new URL(`${id}.json`, AGENTS_DIR), 'utf8');
  /** @type {unknown} */
  let fields;
  try {
    fields = JSON.parse(text);
  } catch (error) {
    throw new Error(`${source}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (typeof fields !== 'object' || fields === null || Array.isArray(fields)) {
    throw new Error(`${source}: must be a JSON object of agent fields`);
  }
  return { id, fields: assertAgentFields(/** @type {Record<string, unknown>} */ (fields), source) };
}

/**
 * Every shipped agent override, sorted by agent id.
 *
 * @returns {Array<{ id: string, fields: Record<string, unknown> }>}
 */
export function readAgentPatches() {
  return readdirSync(AGENTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && JSON_FILE.test(entry.name))
    .map((entry) => entry.name.replace(JSON_FILE, ''))
    .sort()
    .map((id) => readAgentPatch(id));
}
