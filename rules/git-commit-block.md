# Git Commit/Push Rule: 禁止 AI 自动提交

## Core Rule (Highest Priority)

**AI 绝对不能自己执行 git commit 或 git push。**

## 严格禁止的行为

- ❌ 禁止 AI 主动询问"是否需要提交"或主动建议 commit/push
- ❌ 禁止 AI 在用户授权一次后，在同一 session 内"记住"授权继续 commit/push
- ❌ 禁止任何形式的自动 commit/push
- ❌ 禁止以下所有改写历史或不可逆操作：`git rebase -i`、`git reset --hard`、`git push --force`、`git stash pop`、`git commit --amend`（历史改写）、`git clean -fd`（不可恢复删除）、`git tag -d` 等

## 唯一合法的 Commit/Push 流程

**必须用户通过 prompt 显式要求，AI 才能执行，并且是一次性授权：**

1. 用户在 prompt 中明确说 `/git-commit` 或 `/git-push`（OpenCode 自定义斜杠命令），或显式指令 "commit this" / "push this" / "提交这个" / "推送这个" / "帮我提交"（必须为明确执行意图的动词短语，祈使句或带 "请/帮我" 开头也算）
2. AI 执行**这一次**操作
3. **下次 commit/push 需要用户再次显式授权**（无论同一 session 还是新 session）

**授权触发判定**：用户 prompt 含 `/git-commit` / `/git-push` 斜杠命令，或"commit this"/"push this"/"提交这个"/"推送这个"/"帮我提交"等明确执行意图短语（含祈使变体 "go ahead and commit"/"please commit"/"请帮我提交"），即触发授权。**否定/疑问/讨论性提及**（"don't commit"/"should I commit?"/"the commit looks wrong"）不触发。同一 prompt 含多次 commit/push 算多次授权。后续 prompt 引用/回顾之前的 commit 行为不触发新授权。

**`git add` 的边界**：`git add` 不构成 commit，仅是 staging 暂存。如已通过授权执行 commit，可顺带执行必要的 `git add`（仅限当前 commit 涉及的文件）。不得用 `git add .` / `git add -A` 批量暂存后未经授权即 commit。

## 允许的只读操作

✅ AI 可以执行所有 git 只读操作（不含写入），例如：`git status`、`git diff`、`git log`、`git branch`、`git show`、`git remote -v`、`git reflog`、`git stash list`、`git tag -l` 等

## 违规处理

**⚠️ 时序警告**：违规发生后，**第一动作永远是停止所有 git 操作并报告用户**。不要在报告前执行任何 git 命令（包括 `git status` / `git log` 等"诊断"命令），除非用户明确要求。

如果 AI 发现或被用户告知自己违规执行了 commit/push：

1. AI **必须立即**停止所有后续 git 操作
2. AI **必须立即**告诉用户：违规的具体命令、影响范围（改了哪些文件、是否已 push）
3. AI **绝对不能自己执行回滚命令**（包括 `git reset` / `git push --force` / `git commit --amend` 等）
4. AI **可执行 `git status` 和 `git log -1` 告知用户当前状态**（读取类操作）
5. AI **将撤销指令告知用户**，由用户手动执行：

   ```bash
   # 撤销上次 commit（保留变更在暂存区）
   git reset --soft HEAD~1

   # 如果已 push，需要强制回退（危险！）
   git push --force
   ```

## 与其他规则的关系

本规则与 `local-env-changes-block.md` 互补：

- `git commit` / `git push` 属于"本机持久性变更"，两者均适用
- 违规时按本规则的恢复流程处理（因为有专门的撤销指令）
- 本规则的优先级最高（已在 §Core Rule 声明）
