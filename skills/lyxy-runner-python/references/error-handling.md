# 错误处理

## uv未安装

**检测**: `uv`命令失败

**错误消息**:
```
uv not found

此skill依赖uv工具运行Python脚本。

请安装uv: https://docs.astral.sh/uv/getting-started/installation/

安装命令示例：
  curl -LsSf https://astral.sh/uv/install.sh | sh    # Linux/macOS
  powershell -c "irm https://astral.sh/uv/install.ps1 | iex"  # Windows
```

**重要提示**:
- **立即停止任务**，等待用户安装uv后再继续
- **不要尝试使用**：python, pip, poetry, venv, virtualenv等
- **不要自动安装**uv
- 用户安装uv完成后，可以重新执行任务

**操作**: 立即停止所有执行，等待用户安装uv

## 其他错误

| 场景 | 错误消息 | 操作 |
|------|---------|------|
| 项目检测失败 | 回退到非uv模式，使用`--with` | 警告后继续 |
| 依赖解析不准确 | 依赖可能不完整<br>Traceback: [traceback] | 停止，保留脚本调试 |
| 语法错误 | Python语法错误: [描述]<br>文件: <path><br>行号: <line> | 停止 |
| 路径权限问题 | 无法写入: <path><br>建议: 使用临时文件模式 | 回退到临时文件 |
