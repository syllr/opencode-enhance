// The agent content this plugin ships, loaded from `agents/`.
//
// Two forms live side by side:
//
//   agents/<id>.json        field overrides for an agent OpenCode already has
//   agents/<id>/agent.json  a new agent, with <id>/prompt.md as its system prompt
//
// The plugin API has no `add`, but it does not need one: the V2 agent editor's
// `update` seeds `Info.default(id)` when the id is unknown, so calling it
// creates the agent. A definition is therefore applied unconditionally, while a
// patch only lands when its agent is already registered.
//
// `permissions` is appended, never assigned. Every agent starts from
// `Info.default`, whose first rule is `{ action: "*", resource: "*", effect:
// "allow" }`, and `Permission.evaluate` resolves with `findLast` — so a rule only
// wins when it lands after the defaults. Assigning the array would drop the
// defaults (`read *.env` stops being ask-only) and put the denies in the wrong
// place. Appending also leaves OpenCode's own defaults intact, and a user who
// wants to replace the whole ruleset does it in their own configuration, which
// is applied after this plugin.
//
// Only the V2 fields below are accepted. A file that names anything else throws,
// so a typo or a legacy field name fails the plugin setup instead of being
// merged into an agent where it would do nothing.

import { readFileSync, readdirSync } from 'node:fs';

/** Package-root `agents/`: patch files and definition directories, next to `src/`. */
const AGENTS_DIR = new URL('../../agents/', import.meta.url);

const JSON_FILE = /\.json$/;

/** Field file inside a definition directory. */
export const AGENT_FILE_NAME = 'agent.json';

/** Document holding a definition's system prompt, next to its field file. */
export const AGENT_PROMPT_FILE_NAME = 'prompt.md';

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
 * Fields a definition may not carry in its `agent.json`.
 *
 * `system` is what `prompt.md` is for. `model` is deliberately absent: a
 * definition inherits the calling agent's model, and a user who wants to pin one
 * does it in their own configuration, where OpenCode builds the V2 `Model.Ref`
 * itself instead of this package parsing a string. `disabled` is a
 * configuration-level switch, not a property of an agent.
 */
const DEFINITION_EXCLUDED = new Set(['system', 'model', 'disabled']);

/** Effects a permission rule may carry. */
const PERMISSION_EFFECTS = new Set(['allow', 'ask', 'deny']);

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
 * Reject a `permissions` value that is not a V2 ruleset.
 *
 * OpenCode's ruleset is an array of `{ action, resource, effect }` objects, and
 * `Permission.evaluate` matches `action` literally, so a malformed entry would
 * never match anything and would fail open.
 *
 * @param {unknown} value
 * @param {string} source Used in error messages.
 * @returns {unknown} the same value
 */
export function assertPermissions(value, source) {
  if (!Array.isArray(value)) {
    throw new Error(`${source}: "permissions" must be an array of { action, resource, effect } rules`);
  }
  for (const rule of value) {
    if (typeof rule !== 'object' || rule === null || Array.isArray(rule)) {
      throw new Error(`${source}: every "permissions" entry must be a { action, resource, effect } object`);
    }
    const entry = /** @type {Record<string, unknown>} */ (rule);
    for (const key of ['action', 'resource', 'effect']) {
      if (typeof entry[key] !== 'string' || entry[key] === '') {
        throw new Error(`${source}: a "permissions" entry needs a non-empty string "${key}"`);
      }
    }
    if (!PERMISSION_EFFECTS.has(/** @type {string} */ (entry.effect))) {
      throw new Error(
        `${source}: "permissions" effect must be allow, ask or deny, got "${String(entry.effect)}"`,
      );
    }
  }
  return value;
}

/**
 * Read and validate one JSON field file.
 *
 * @param {URL} url
 * @param {string} source Used in error messages.
 * @returns {Record<string, unknown>}
 */
function readFields(url, source) {
  /** @type {string} */
  let text;
  try {
    text = readFileSync(url, 'utf8');
  } catch (error) {
    throw new Error(`${source}: ${error instanceof Error ? error.message : String(error)}`);
  }
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
  const checked = assertAgentFields(/** @type {Record<string, unknown>} */ (fields), source);
  if ('permissions' in checked) assertPermissions(checked.permissions, source);
  return checked;
}

/**
 * Load one agent override file.
 *
 * @param {string} id File name without the `.json` extension; also the agent id.
 * @returns {{ id: string, form: 'patch', fields: Record<string, unknown> }}
 */
export function readAgentPatch(id) {
  const source = `agents/${id}.json`;
  return { id, form: 'patch', fields: readFields(new URL(`${id}.json`, AGENTS_DIR), source) };
}

/**
 * Load one agent definition directory.
 *
 * @param {string} id Directory name; also the agent id.
 * @returns {{ id: string, form: 'define', fields: Record<string, unknown> }}
 */
export function readAgentDefinition(id) {
  const dir = new URL(`${id}/`, AGENTS_DIR);
  const source = `agents/${id}/${AGENT_FILE_NAME}`;
  const fields = readFields(new URL(AGENT_FILE_NAME, dir), source);
  for (const key of DEFINITION_EXCLUDED) {
    if (!(key in fields)) continue;
    const instead =
      key === 'system'
        ? `put the prompt in agents/${id}/${AGENT_PROMPT_FILE_NAME}`
        : 'set it in your own opencode configuration instead';
    throw new Error(`${source}: "${key}" is not part of a definition; ${instead}`);
  }
  const promptSource = `agents/${id}/${AGENT_PROMPT_FILE_NAME}`;
  /** @type {string} */
  let system;
  try {
    system = readFileSync(new URL(AGENT_PROMPT_FILE_NAME, dir), 'utf8').trim();
  } catch (error) {
    throw new Error(`${promptSource}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!system) throw new Error(`${promptSource}: the system prompt is empty`);
  return { id, form: 'define', fields: { ...fields, system } };
}

/**
 * Every shipped patch and definition, sorted by agent id.
 *
 * @returns {Array<{ id: string, form: 'patch' | 'define', fields: Record<string, unknown> }>}
 */
export function readAgents() {
  const entries = readdirSync(AGENTS_DIR, { withFileTypes: true });
  const patches = entries
    .filter((entry) => entry.isFile() && JSON_FILE.test(entry.name))
    .map((entry) => entry.name.replace(JSON_FILE, ''));
  const definitions = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  for (const id of definitions) {
    if (!patches.includes(id)) continue;
    throw new Error(
      `agents/${id}: both ${id}.json and ${id}/ exist; an agent ships as one form or the other`,
    );
  }
  return [
    ...patches.sort().map((id) => readAgentPatch(id)),
    ...definitions.sort().map((id) => readAgentDefinition(id)),
  ].sort((a, b) => a.id.localeCompare(b.id));
}
