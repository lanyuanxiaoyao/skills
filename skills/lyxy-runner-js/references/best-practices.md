# 最佳实践和输出处理

## 最佳实践

1. **始终先检查 Bun 环境** - 所有场景第一步都执行 `bun --version`
2. **根据用户意图选择场景** - 查看快速参考选择合适的使用方式
3. **单独处理 stdout/stderr** - 以区分输出和错误
4. **检查退出码** - 以检测脚本失败
5. **使用 ESM imports** - 使用 `import from` 编写现代 JavaScript
6. **捕获并显示错误** - 以帮助用户调试问题

## 输出处理

### 标准输出

所有 `console.log()`, `console.info()`, `console.warn()` 输出都到 stdout：

```bash
bun "$TEMP_FILE"  # stdout 由调用代码捕获
```

### 错误输出

`console.error()` 输出到 stderr：

```bash
bun "$TEMP_FILE" 2>error.log  # 单独捕获 stderr
```

### 退出码

脚本可以设置自定义退出码：

```javascript
process.exit(1) // 错误
process.exit(0) // 成功
```

调用者接收这些退出码以确定执行状态。

## 临时文件管理

执行后 **不会主动删除** 临时文件。这是设计使然：

- 操作系统自动管理临时目录空间
- 文件可以保留用于调试目的
- 大多数操作系统定期清理旧的临时文件

## 辅助函数 API

### `get_temp_path.js`

为脚本执行生成唯一的临时文件路径。

**CLI 使用方式:**

```bash
bun scripts/get_temp_path.js <extension>
```

**参数:**

- `extension` (可选): 文件扩展名。默认为 `js`。常用值: `js`, `ts`, `mjs`, `mts`

**输出:** 返回类似 `/var/folders/.../lyxy-runner-js-1234567890-abc123.js` 的路径

**路径格式:**

- 使用操作系统临时目录（Unix 上为 `/tmp`，Windows 上为 `%TEMP%`）
- 前缀: `lyxy-runner-js-`
- 时间戳: 自纪元以来的毫秒数
- 随机字符串: 7 字符字母数字
- 扩展名: 参数中提供的值

**示例:**

```bash
$ bun scripts/get_temp_path.js js
/var/folders/8m/0hm18pdd7ts2bwp0530drz500000gn/T/lyxy-runner-js-1770257905333-na6ujx.js

$ bun scripts/get_temp_path.js ts
/var/folders/8m/0hm18pdd7ts2bwp0530drz500000gn/T/lyxy-runner-js-1770257905333-v8yzt.ts
```
