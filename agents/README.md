# agents/

Two forms, one agent per name.

## `agents/<id>.json` — override an agent that already exists

```
agents/build.json
```

```json
{
  "description": "...",
  "permissions": [{ "action": "shell", "resource": "git push *", "effect": "deny" }]
}
```

A patch is applied only when OpenCode already has that agent, so naming one it
does not have is a no-op rather than a new agent.

## `agents/<id>/` — ship a new agent

```
agents/oracle/agent.json
agents/oracle/prompt.md
```

`agent.json` holds the fields; `prompt.md` is the whole system prompt, verbatim,
with no frontmatter — so it can be diffed line by line against whatever it was
copied from.

```json
{
  "description": "Shown in the parent agent's subagent list, so say when to use it.",
  "mode": "subagent",
  "permissions": [{ "action": "edit", "resource": "*", "effect": "deny" }]
}
```

A definition creates its agent, because the V2 agent editor's `update` seeds
`Info.default(id)` for an id it has not seen.

Three fields are refused in `agent.json`:

- `system` — that is what `prompt.md` is for.
- `model` — a definition inherits the calling agent's model. Pin one in your own
  `opencode.json`, where OpenCode builds the `Model.Ref` itself.
- `disabled` — a configuration-level switch, not a property of an agent.

## `permissions` are appended, never assigned

Every agent starts from `Info.default`, whose first rule is
`{ action: "*", resource: "*", effect: "allow" }`, and `Permission.evaluate`
resolves with `findLast`. A rule only wins if it lands **after** the defaults, so
the plugin pushes onto `agent.permissions` instead of replacing the array.
Assigning it would drop OpenCode's defaults (`read *.env` stops being ask-only)
and put your denies in the wrong place.

Each rule is `{ action, resource, effect }` with `effect` one of
`allow` / `ask` / `deny`. `action` is matched literally, so a V1 map
(`{ "edit": "deny" }`) is rejected rather than silently never matching.

To replace a ruleset wholesale, do it in your own `opencode.json`: it is applied
after this plugin, so it wins.

## Accepted fields

`description` · `mode` · `model` · `system` · `permissions` · `steps` ·
`hidden` · `color` · `disabled` · `request`

Anything else fails the plugin setup by name, rather than being merged into an
agent where it would do nothing.
