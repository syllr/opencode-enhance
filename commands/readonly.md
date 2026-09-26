---
description: 开启临时只读模式，禁止修改本机文件
---

【临时安全模式】本次对话应用以下限制：

## 禁用工具（完全禁止调用）

- **Write** — 禁止写入文件
- **Edit** — 禁止编辑文件
- **Bash** — 禁止写操作（如重定向、管道到文件、rm、mv、cp 等），只读命令（如 ls、cat、git status、grep 等）允许，但 AI 需确保命令只读，无法判断时询问用户
- **lsp_rename** — 禁止重命名符号
- **lsp_prepare_rename** — 重命名工作流前置步骤，一并禁用
- **ast_grep_replace** — 禁止批量替换
- **playwright_browser_run_code_unsafe** — 禁止执行任意代码
- **playwright_browser_evaluate** — 可执行任意 JS，禁止
- **playwright_browser_fill_form** — 可提交表单触发写操作，禁止
- **playwright_browser_file_upload** — 上传文件，禁止
- **playwright_browser_type** — 输入可触发表单提交，禁止
- **playwright_browser_select_option** — 选择选项可能触发副作用，禁止
- **playwright_browser_drag** — 拖放操作，禁止
- **playwright_browser_drop** — 拖放文件/数据，禁止
- **playwright_browser_handle_dialog** — 确认对话框可能触发写操作，禁止
- **crawl4ai** 的 output_path 参数 — 禁止输出到文件
- **所有 playwright*browser*\* 工具的 filename 参数** — 禁止通过截图、日志等输出到文件

## 允许工具（可正常使用）

- **Read** — 读取文件
- **grep / Glob** — 搜索文件内容和文件名
- **ast_grep_search** — AST 结构搜索（只读）
- **look_at** — 读取 PDF/图片基本信息（只读）
- **MiniMax_understand_image** — 图片分析（只读）
- **MiniMax_web_search** — 网络搜索（只读）
- **todowrite** — 管理任务列表（不涉及文件操作）
- **lsp_diagnostics / lsp_goto_definition / lsp_find_references / lsp_symbols** — 代码分析和跳转
- **webfetch / searchweb / crawl4ai（不含 output_path）** — 网络读取
- `playwright_browser_*` 系列（仅允许：snapshot、take_screenshot、navigate、navigate_back、tabs、wait_for、hover、press_key、console_messages、network_requests、network_request，其他已禁用）— 浏览器只读操作
- **Bash** — 允许只读命令（ls、cat、git status、grep 等），AI 必须确保命令不修改文件系统，无法判断时询问用户
- **skill / task** — 查询信息和委托子代理
  ⚠️ 委托子代理时，必须在 task() 的 prompt 参数开头添加：
  `【只读约束】禁止使用 Write/Edit/Bash 写操作/lsp_rename/ast_grep_replace 及任何写文件工具。Bash 只读命令允许。`
- `session_*` — session 管理
- 其他只读工具未明确列出的视为允许

## 退出方式

要退出只读模式，请说"退出只读模式"。如果已创建 `/readonly-off` 命令，也可使用该命令退出。

本限制仅对本次对话生效，不影响后续 session。
