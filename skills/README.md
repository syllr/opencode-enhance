# skills/

One directory per skill, containing a `SKILL.md`:

```
skills/my-skill/
  SKILL.md
  reference.md      ← optional, resolved relative to this directory
```

`SKILL.md` starts with YAML frontmatter and uses the body as the skill content:

```markdown
---
name: My Skill
description: One line saying when to use it.
---

What the model should do.
```

- The directory name is the skill id.
- `description` is required. A skill without one is never offered to the model.
- `autoinvoke: true` is optional.
- The frontmatter never reaches the model; only the body becomes `content`.
