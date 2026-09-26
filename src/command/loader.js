// The slash commands this plugin ships, loaded from `commands/<name>.md`.
//
// A command file is a `description:` frontmatter line plus a Markdown body. The
// body is the instruction sent to the model when the command runs, which is what
// OpenCode's own file-based commands do; this loader only carries the files as
// package content and hands the text to the plugin, which owns the `execute`
// that submits it.
//
// The file name is the command name, so `commands/readonly.md` is `/readonly`.

import { readFileSync, readdirSync } from 'node:fs';

import { parseFrontmatter, stripFrontmatter } from '../frontmatter.js';

/** Package-root `commands/`: one Markdown file per command, next to `src/`. */
const COMMANDS_DIR = new URL('../../commands/', import.meta.url);

const MARKDOWN = /\.md$/;

/**
 * Load one command file.
 *
 * @param {string} name File name without the `.md` extension.
 * @returns {{ name: string, description: string, text: string }}
 */
export function readCommand(name) {
  const source = `commands/${name}.md`;
  const text = readFileSync(new URL(`${name}.md`, COMMANDS_DIR), 'utf8');
  const fields = parseFrontmatter(text, source);
  const description = fields.description;
  if (!description) throw new Error(`${source}: frontmatter needs a "description"`);
  const body = stripFrontmatter(text);
  if (!body) throw new Error(`${source}: the body is the prompt the command sends, so it cannot be empty`);
  return { name, description, text: body };
}

/**
 * Every shipped command, sorted by name.
 *
 * @returns {Array<{ name: string, description: string, text: string }>}
 */
export function readCommands() {
  return readdirSync(COMMANDS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && MARKDOWN.test(entry.name))
    .map((entry) => entry.name.replace(MARKDOWN, ''))
    .sort()
    .map((name) => readCommand(name));
}
