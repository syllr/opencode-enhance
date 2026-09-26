# opencode-enhance

OpenCode 插件：把你自己写的 **command / skill / prompt 规则**（以及对已有 **agent** 的字段覆盖）作为包内容注册进 OpenCode。

**加内容就是加文件，不用改代码。**

## 内容放在哪

| 路径                   | 注册成什么                                      |
| ---------------------- | ----------------------------------------------- |
| `commands/<name>.md`   | 斜杠命令 `/<name>`，正文就是它发给模型的提示    |
| `skills/<id>/SKILL.md` | skill，frontmatter 里写 `name` / `description`  |
| `rules/<id>.md`        | 规则，追加到每次 agent 循环请求的 system prompt |
| `agents/<id>.json`     | 对**已存在** agent 的字段覆盖                   |

- `commands/readonly.md` 就是 `/readonly`
- `commands/` 与 `rules/` 里的文件与 `~/.config/opencode/` 下的同名文件格式一致，可以直接搬
- 各目录的格式说明在 `skills/README.md` 和 `agents/README.md`

## 安装

```jsonc title="opencode.jsonc"
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-enhance"],
}
```

本地开发指目录：

```jsonc
{ "plugins": [{ "package": "/path/to/opencode-enhance" }] }
```

## 关于 agent

**插件不能新增 agent。** OpenCode 的 agent editor 只有 `list` / `get` / `default` /
`update` / `remove`，没有 `add`。所以 `agents/<id>.json` 只能覆盖已经存在的 agent
（内置的 `build` / `plan` / `general` / `explore`，或你在配置里定义的）；指向不存在的
agent 会被跳过。

新增 agent 走配置：`opencode.json(c)` 的 `agents`，或 `~/.config/opencode/agents/<name>.md`。
字段清单和示例见 `agents/README.md`。

## 行为

- 启动时读一次内容，之后 transform 只回放，不做 I/O。
- 规则通过 `context` 钩子注入，只改当次请求。
- 不用定时器、不订阅事件、不做后台动作、不响应工具报错。
- 卸载时逐个 dispose 注册。
- 内容文件不合规则**直接抛错**（例如 skill 缺 `description`、agent 字段名不认识），不做静默兜底。

## 开发

```bash
npm install
npm test
```

## 发布

包名 `opencode-enhance`，只递增 patch。

| 命令                    | 作用                                   |
| ----------------------- | -------------------------------------- |
| `npm run release`       | bump + test + publish + 校验 dist-tags |
| `npm run release:dry`   | bump + test + `npm publish --dry-run`  |
| `npm run release:bump`  | 只改版本                               |
| `npm run release:check` | 只读检查：本地版本 vs npm `latest`     |

## License

MIT
