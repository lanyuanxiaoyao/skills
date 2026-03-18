# 错误处理

## 未安装 Bun

**症状:** `bun --version` 失败或返回 "command not found: bun"

**错误处理：**

当检测到 Bun 未安装时，必须：

1. **停止执行** - 不进行任何后续操作
2. **输出明确错误信息** - 清晰说明 "Bun 运行时未安装" 或类似提示
3. **提供安装说明** - 参考下方安装命令

**安装 Bun：**

**macOS/Linux:**
```bash
curl -fsSL https://bun.sh/install | bash
```

**Windows:**
```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

**重要限制：**

- ❌ **禁止自动安装** - 不要尝试自动安装 Bun，由用户自行决定
- ❌ **禁止使用其他工具** - 不要尝试使用 nodejs、npm、yarn、pnpm 等其他 JavaScript 运行时或包管理工具
- ❌ **禁止格式转换** - 不要建议用户将脚本转换为其他运行时格式

**正确做法：**

- ✅ 仅输出错误信息和安装说明
- ✅ 等待用户安装 Bun 后再继续
- ✅ 保持使用 Bun 作为唯一运行时

## 脚本语法错误

Bun 提供详细的语法错误信息：

```bash
$ bun "$TEMP_FILE"
error: Unexpected token
   --> /var/folders/.../script.js:2:10
    |
  2 |   const = 123;
    |          ^
```

错误信息包括：

- 文件路径和行号
- 错误的确切位置
- 问题描述

## 运行时错误

运行时错误包含完整的堆栈跟踪：

```bash
$ bun "$TEMP_FILE"
ReferenceError: foo is not defined
    at script.js:3:5
    at main (script.js:1:1)
```

## 其他错误

其他任何形式的错误都原样输出。
