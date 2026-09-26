# agents/

One JSON file per agent to override, named after the agent id:

```
agents/build.json
```

```json
{
  "permissions": [{ "action": "shell", "resource": "git push *", "effect": "deny" }]
}
```

Each file is merged into that agent's fields. Files are applied in id order, and a
file whose agent does not exist is skipped.

**This plugin cannot create agents.** The agent editor in OpenCode's plugin API
exposes `list` / `get` / `default` / `update` / `remove` and has no `add`, so a new
agent is configuration work:

- an `agents` entry in `opencode.json(c)`, or
- a Markdown file under `~/.config/opencode/agents/` or `.opencode/agents/`.

Only these fields are accepted; anything else fails the plugin setup:

`description` · `mode` · `model` · `system` · `permissions` · `steps` · `hidden` ·
`color` · `disabled` · `request`
