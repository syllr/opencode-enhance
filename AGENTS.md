# opencode-enhance

## 项目定位

`opencode-enhance` 本质上是**把 oh-my-openagent（omo）的特性搬到本项目里，再以 OpenCode 插件的形式提供给 opencode 使用**。

改动前先想清楚：这是「移植 omo 能力」还是「改 opencode 本身的行为」。前者在本仓库内完成，后者要去 opencode 源码仓库。

## 参考源码仓库

| 仓库                                   | 作用                                                                              |
| -------------------------------------- | --------------------------------------------------------------------------------- |
| `/Users/yutao/Projects/oh-my-openagent` | omo 源码。特性、规则（rule）、skill、agent 的**设计参考与移植来源**                |
| `/Users/yutao/WebstormProjects/opencode` | opencode 源码。插件的**宿主运行时**：插件 API、工具、hook、TUI 行为以它为准         |

使用要点：

- 移植 omo 特性时，先到 `oh-my-openagent` 找到对应实现与规则，再在本仓库落地。
- 不确定某个 hook / 插件接口 / 工具签名怎么用，去 `opencode` 源码查真实实现与类型定义，不要猜。
- 本项目通过 `agents/`、`skills/`、`commands/`、`rules/` 四个目录以**包内容**的形式向 opencode 注入能力，加载逻辑在 `src/`。
- 这两个仓库都在本项目目录之外，用普通文件工具读写即可；只对本项目内的路径强制走 IDEA MCP 工具。

# Agent Release Rules

## npm 版本发布规则

- 包名固定为 `opencode-enhance`。
- npm 已发布的版本不可覆盖；同一个版本号不能再次发布不同内容。
- 每次发布前必须先递增版本号，并同步更新 `package.json` 和 `package-lock.json`。
- 只允许递增最小版本位（patch）：`0.0.1 → 0.0.2 → 0.0.3`，禁止跳号。
- 更新 minor 或 major 版本（例如 `0.0.x → 0.1.0` 或 `1.0.0`）前，必须先得到用户明确同意。
- 不使用 `--force` 或任何方式覆盖已发布版本；发布失败时保留旧版本，改用新版本号。
- **未经用户明确指示，不发布、不 bump。**
- 发布前运行 `npm test` 和 `npm publish --dry-run`；发布后验证 `npm view opencode-enhance dist-tags`，确认 `latest` 指向新版本。

## 发布脚本

发布统一走 `scripts/release.mjs`，它会自动完成：递增 patch → 跳过 npm 上已存在的版本 → 同步两个文件 → `npm test` → 校验 git 干净 → `npm publish` → 轮询校验 `dist-tags`（npm 收下 tarball 后异步更新 `latest`，脚本会等它）。

| 命令                    | 作用                                                          |
| ----------------------- | ------------------------------------------------------------- |
| `npm run release`       | 完整发布：bump + test + publish + 校验 dist-tags              |
| `npm run release:dry`   | 只 bump + test + `npm publish --dry-run`，不真正发布          |
| `npm run release:bump`  | 只改版本，不测试、不发布                                      |
| `npm run release:check` | 只读检查：本地版本 vs npm `latest` / 已发布版本，不改任何文件 |

脚本强制的约束：

- 只递增 patch，不会自行做 minor / major；需要时人工改并先征得用户同意。
- 已发布到 npm 的版本号会被跳过，绝不覆盖。
- 正式发布会先检查 `git status --porcelain` 必须干净；未提交就中止。

### 发布鉴权（重要）

npm 发布要求**带 2FA 的登录态**。以下情况一定会 403：

- `~/.npmrc` 里存在 `//registry.npmjs.org/:_authToken=npm_xxx`，且该 token 是「bypass 2FA」的 granular token。
- 此时 `npm login` 的登录态会被这行 token 覆盖，`--otp=xxxxxx` 也会被忽略，命令直接报 `Two-factor authentication or granular access token with bypass 2fa enabled is required to publish packages`。

正确做法：

1. 删除 bypass token：`npm config delete //registry.npmjs.org/:_authToken`
2. 确认已删除：`grep _authToken ~/.npmrc || echo "已删除"`
3. 重新登录：`npm login`
4. 再执行 `npm run release`

不要用 `--force`，也不要用 bypass token 覆盖已发布版本。
