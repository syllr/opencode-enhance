// The skills this plugin ships, loaded from `skills/<id>/SKILL.md`.
//
// The layout is the convention OpenCode itself reads: one directory per skill,
// the document named `SKILL.md`, `name` / `description` in YAML frontmatter, and
// the directory as the base for any relative asset the skill ships next to it.
// Adding a skill is therefore a directory, not a code change.
//
// The definition satisfies `Skill.Info` exactly (`id` / `name` / `description` /
// `path` / `content`, plus `autoinvoke` when the frontmatter asks for it). A
// rejected definition fails the skill transform, and a transform failure
// disables the whole plugin, so nothing is filled in with a default. `content`
// is the body only: the frontmatter is metadata and must not reach the prompt.

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { parseFrontmatter, stripFrontmatter } from '../frontmatter.js';

/** Package-root `skills/`: one sub-directory per skill, next to `src/`. */
const SKILLS_DIR = new URL('../../skills/', import.meta.url);

/** Document name inside each skill directory. */
export const SKILL_FILE_NAME = 'SKILL.md';

/**
 * Load one skill directory into a `Skill.Info`-shaped definition.
 *
 * @param {string} id Directory name, used as the skill id.
 * @returns {{ id: string, name: string, description: string, autoinvoke?: boolean, path: string, content: string }}
 */
export function readSkill(id) {
  const file = new URL(`${id}/${SKILL_FILE_NAME}`, SKILLS_DIR);
  const source = `skills/${id}/${SKILL_FILE_NAME}`;
  const text = readFileSync(file, 'utf8');
  const fields = parseFrontmatter(text, source);
  const description = fields.description;
  if (!description) {
    throw new Error(`${source}: frontmatter needs a "description", otherwise the skill is never offered`);
  }
  const autoinvoke = fields.autoinvoke;
  if (autoinvoke !== undefined && autoinvoke !== 'true' && autoinvoke !== 'false') {
    throw new Error(`${source}: "autoinvoke" must be true or false`);
  }
  return {
    id,
    name: fields.name || id,
    description,
    ...(autoinvoke === 'true' ? { autoinvoke: true } : {}),
    path: fileURLToPath(file),
    content: stripFrontmatter(text),
  };
}

/**
 * Every shipped skill, sorted by id.
 *
 * @returns {Array<{ id: string, name: string, description: string, autoinvoke?: boolean, path: string, content: string }>}
 */
export function readSkills() {
  return readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((id) => readSkill(id));
}
