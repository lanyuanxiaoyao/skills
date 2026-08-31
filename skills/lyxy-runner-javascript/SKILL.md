---
name: lyxy-runner-javascript
description: 用 bun 运行 JavaScript / TypeScript 脚本的环境规则：一律优先用 bun 命令执行，bun 原生支持 .js 和 .ts，import 的第三方依赖自动下载安装，无需 package.json 和任何依赖声明步骤；禁止 node/npm/yarn/pnpm 等替代方式执行，禁止 npm install 等方式往主机装全局包；进入具体项目按项目自身的包管理器约定走。凡是"跑个脚本""执行 .js/.ts 文件""运行 JavaScript/TypeScript"这类需求，都按本规则执行。
compatibility: Requires bun (https://bun.sh)
metadata:
  author: lanyuanxiaoyao
  version: 2.0.0
---

# 用 bun 运行 JavaScript / TypeScript 脚本

以下为全部规则，无引用文件。

## 核心规则

- 运行 JS/TS 一律 `bun <script_path>`。bun 原生支持 .js / .ts / .mjs，TypeScript 直接执行，无编译步骤。
- bun 必需，不可替代。不支持 node、npm、yarn、pnpm、tsx、ts-node。
- bun 未安装（`command not found: bun`）：立即停止任务，告知用户安装 bun（https://bun.sh ，Windows：`powershell -c "irm bun.sh/install.ps1 | iex"`，macOS/Linux：`curl -fsSL https://bun.sh/install | bash`），等待用户安装后再继续。不自动安装（全局安装须用户确认），不退回替代工具，不建议把脚本转成其他运行时格式。
- 禁止 `npm install` / `bun add` 等手动装包；禁止往主机装全局包。import 的依赖由 bun 自动处理。

## 依赖

- 脚本 `import` / `require` 的第三方包，bun 首次运行时自动从 npm 下载并缓存（`~/.bun/install/cache`），后续走缓存。无 package.json、无 `bun install`、无任何声明步骤，默认最新版。
- ESM（`import`）和 CommonJS（`require`）都支持，优先 ESM。

## 项目内按项目约定

仅临时脚本场景强制 bun。进入具体项目：

- 项目用 bun 管理 → 正常 `bun <script_path>`，依赖来自项目 node_modules
- 项目用 npm / yarn / pnpm 管理 → 按项目自身约定执行；不在项目里跑 `bun add` / `npm install` 装依赖（装依赖须用户明确要求并按项目约定）
- 项目目录有 node_modules 时，bun 按项目依赖解析 import，不再自动安装；带项目外依赖的临时脚本移到系统临时目录执行

## 临时脚本位置

自写临时脚本一律放系统临时目录（Windows `%TEMP%`，Git Bash `/tmp`），文件名带前缀（如 `lyxy-runner-javascript-*.ts`）便于清理；不放当前工作目录，除非用户指定。执行后不主动删除：系统自管临时目录，保留便于调试。

## 命令速查

| 场景 | 命令 |
|------|------|
| 执行已有脚本（.js/.ts 均可） | `bun <script_path>` |
| 自写临时脚本 | 写入系统临时目录 → `bun <temp_path>` |
| 用户指定路径创建脚本 | 写入指定路径 → `bun <path>` |

## 常见错误

| 错误 | 处理 |
|------|------|
| `command not found: bun` | 停止任务，按"核心规则"引导安装，等待用户 |
| 语法错误 | bun 输出含文件路径、行列号和位置指示，按提示修复后重试 |
| 运行时错误（ReferenceError 等） | bun 输出完整堆栈跟踪，按堆栈定位修复 |
| 模块找不到（Cannot find module） | 项目目录内：缺依赖，与用户确认后按项目约定装；临时目录内：检查 import 拼写 |

输出处理：`console.log` / `info` / `warn` → stdout；`console.error` → stderr（`2>` 单独捕获）；退出码 `process.exit(0|1)` 表示成败。

## 示例

执行已有 TypeScript 脚本（无需编译）：

```bash
bun ./scripts/my-script.ts
```

自写临时脚本：写入 `/tmp/lyxy-runner-javascript-stars.ts` 后执行 `bun /tmp/lyxy-runner-javascript-stars.ts`：

```typescript
import axios from 'axios'; // 首次运行自动安装，无需任何声明

const resp = await axios.get('https://api.github.com/repos/oven-sh/bun');
console.log(`Stars: ${resp.data.stargazers_count}`);
```

## 已知限制

- ✗ 长驻进程（服务器、watcher）会阻塞当前命令，不适用
- ✗ 少数依赖原生二进制的 npm 包可能与 bun 不兼容：报错时如实告知用户，不换运行时

## Workflow

1. 判断脚本来源：已有脚本 → 直接执行；自写 → 写入系统临时目录
2. `bun <script_path>` 执行；出错按"常见错误"处理
3. 临时脚本不主动删除
