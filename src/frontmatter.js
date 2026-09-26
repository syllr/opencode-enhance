// The flat `key: value` frontmatter reader shared by the skill and command
// loaders.
//
// It is not a YAML engine and must not grow into one: both loaders accept only
// the flat form this package writes. Anything else throws, naming the file, so a
// malformed document fails the plugin setup instead of registering half a
// definition.

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n)?/;

/**
 * @param {string} value
 * @returns {string}
 */
function unquote(value) {
  const quote = value[0];
  if (value.length >= 2 && (quote === '"' || quote === "'") && value.endsWith(quote)) {
    return value.slice(1, -1);
  }
  return value;
}

/**
 * Read the flat frontmatter block a document must start with.
 *
 * @param {string} text
 * @param {string} source Used in error messages.
 * @returns {Record<string, string>}
 */
export function parseFrontmatter(text, source) {
  const match = FRONTMATTER.exec(text);
  if (!match) throw new Error(`${source}: must start with a YAML frontmatter block`);
  /** @type {Record<string, string>} */
  const fields = {};
  for (const raw of match[1].split(/\r?\n/)) {
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    if (raw !== raw.trimStart()) {
      throw new Error(`${source}: frontmatter must be flat "key: value" lines, got: ${trimmed}`);
    }
    const entry = /^([A-Za-z0-9_/-]+):[ \t]*(.*)$/.exec(raw);
    if (!entry) throw new Error(`${source}: unsupported frontmatter line: ${trimmed}`);
    fields[entry[1]] = unquote(entry[2].trim());
  }
  return fields;
}

/**
 * The document body: everything after the frontmatter, without leading blank
 * lines and without trailing whitespace.
 *
 * @param {string} text
 * @returns {string}
 */
export function stripFrontmatter(text) {
  return text.replace(FRONTMATTER, '').replace(/^\s+/, '').trimEnd();
}
