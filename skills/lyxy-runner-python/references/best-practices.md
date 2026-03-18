# 最佳实践和注意事项

## 为什么使用uv？

| 特性 | 优势 |
|------|------|
| 环境隔离 | 不污染系统Python |
| 自动依赖 | `--with`语法，无需pip install |
| 快速启动 | 比venv快10-100倍 |
| 项目集成 | 自动检测uv项目 |
| 零配置 | 开箱即用，无需PEP 723 |

## 最佳实践

1. **依赖解析**: 排除标准库；失败时检查遗漏依赖；复杂项目用uv项目模式
2. **路径**: 用户指定优先；临时文件用于自主生成；跨平台由辅助脚本保证
3. **错误**: 预期错误脚本内处理；意外错误立即停止；检测失败自动回退
4. **清理**: 临时文件使用系统目录，自动清理，失败时手动删除

## 限制

- ✗ 不支持命令行参数、stdin输入、持久化环境
- ✗ 使用uv默认Python版本（项目可在pyproject.toml指定）
- ✗ 依赖解析可能不完整（动态导入、条件导入可能遗漏）
- ✗ 项目检测可能误判（网络问题导致回退）

## uv工具要求

- **uv是此skill的必需依赖，不可替代**
- **不支持**: python, pip, poetry, venv, virtualenv
- 如果检测到uv未安装，必须停止任务并引导用户安装
- 不要尝试使用替代方案或自动安装uv

## 自动依赖解析详细说明

分析import语句，提取外部包名，排除标准库。

### 标准库（排除）

**核心**: os, sys, pathlib, shutil, json, csv, re, datetime, math
**网络**: http.client, urllib, socket, io, logging
**高级**: itertools, functools, typing, dataclasses, enum

### 解析规则

1. 提取：`import pandas` → `pandas`, `from numpy import array` → `numpy`
2. 排除标准库
3. 去重

### 示例

```python
import pandas as pd
import numpy as np
import json  # 标准库，排除
from pathlib import Path  # 标准库，排除

# 结果: [pandas, numpy]
```

## 智能项目检测

### 检测命令

```bash
uv sync --dry-run
```

### 判断逻辑

- Exit code 0 → uv项目
- 非零退出码 → 非uv项目
- 失败 → 回退到非uv项目模式（使用`--with`），不阻塞执行

## 路径处理

### 三层逻辑

1. **用户指定存储路径** → 写入指定路径
2. **用户指定现有脚本** → 直接执行
3. **未指定** → 临时文件

```bash
# 临时文件获取
temp_file_path=$(uv run ./scripts/get_temp_path.py)
```
