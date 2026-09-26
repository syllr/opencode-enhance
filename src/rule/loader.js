// The prompt rules this plugin ships, loaded from `rules/<id>.md`.
//
// Each file is one rule in plain Markdown, and the plugin appends every rule to
// the system prompt of each agent-loop model request, so a rule is in context
// without the model having to ask for it. No frontmatter: the document is used as
// written and its first heading is its title.

import { readFileSync, readdirSync } from 'node:fs';

/** Package-root `rules/`: one Markdown file per rule, next to `src/`. */
const RULES_DIR = new URL('../../rules/', import.meta.url);

const MARKDOWN = /\.md$/;

/**
 * Load one rule file.
 *
 * @param {string} id File name without the `.md` extension.
 * @returns {{ id: string, text: string }}
 */
export function readRule(id) {
  const source = `rules/${id}.md`;
  const text = readFileSync(new URL(`${id}.md`, RULES_DIR), 'utf8').trim();
  if (!text) throw new Error(`${source}: the rule is empty`);
  return { id, text };
}

/**
 * Every shipped rule, sorted by id.
 *
 * @returns {Array<{ id: string, text: string }>}
 */
export function readRules() {
  return readdirSync(RULES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && MARKDOWN.test(entry.name))
    .map((entry) => entry.name.replace(MARKDOWN, ''))
    .sort()
    .map((id) => readRule(id));
}
