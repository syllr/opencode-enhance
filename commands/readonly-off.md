---
description: 关闭临时只读模式，恢复正常文件操作权限
---

【只读模式已解除】用户已通过 `/readonly-off` 命令退出只读模式。

## 立即生效的变更

- 之前 `/readonly` 施加的所有限制**全部解除**，恢复正常工具权限：
  - **Write** — 恢复写入文件
  - **Edit** — 恢复编辑文件
  - **Bash** — 恢复写操作（重定向、管道到文件、rm、mv、cp 等）
  - **lsp_rename / lsp_prepare_rename** — 恢复重命名符号
  - **ast_grep_replace** — 恢复批量替换
  - **playwright_browser\*** 系列 — 恢复全部功能（含 file_upload、fill_form、evaluate 等）
  - **crawl4ai 的 output_path 参数** — 恢复输出到文件
- 委托子代理时**不再需要**附加「只读约束」提示

## 注意事项

- 恢复正常操作后，仍需遵守项目其他既有规则（如 Git commit/push 禁止规则、本机环境变更规则等）
- 本解除仅对本次对话生效，不影响后续 session
