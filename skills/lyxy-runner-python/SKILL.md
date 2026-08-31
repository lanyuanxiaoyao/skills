---
name: lyxy-runner-python
description: 用 uv 运行 Python 脚本的环境规则：一律优先 uv，依赖免预装、不污染系统 Python。自己写的临时脚本用 inline metadata（PEP 723）声明依赖，外部脚本用 --with 参数注入依赖并加 --no-project；禁止直接调用系统 Python，禁止 pip 等方式往主机装全局包；进入具体项目按项目自身约定走。凡是"跑个 Python 脚本""执行 .py 文件""加个依赖试一下""用 pandas 处理数据"这类 Python 执行需求，都按本规则执行。
metadata:
  author: lanyuanxiaoyao
  version: 2.0.0
---

# 用 uv 运行 Python 脚本

以下为全部规则，无引用文件。

## 核心规则

- 运行 Python 一律 `uv run <script.py>`。禁用系统 `python` / `python3` / `py`；禁止 `pip install` 等任何方式往主机装全局包。
- uv 必需，不可替代。不支持 python、pip、poetry、venv、virtualenv。
- uv 未安装：立即停止任务，告知用户安装 uv（https://docs.astral.sh/uv/getting-started/installation/ ，Windows：`powershell -c "irm https://astral.sh/uv/install.ps1 | iex"`），等待用户安装后再继续。不自动安装（全局安装须用户确认），不退回替代工具。

## 依赖引入（二选一，不可叠加）

### 自写脚本：PEP 723 inline metadata（首选）

脚本头部注释声明依赖，照常 `uv run xxx.py`，uv 自动创建隔离环境并装依赖：

```python
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "pandas>=2.0",
#     "requests",
# ]
# ///
```

- `dependencies` 写 PyPI 包名，非 import 名：`pillow`（非 PIL）、`opencv-python`（非 cv2）、`scikit-learn`（非 sklearn）、`beautifulsoup4`（非 bs4）、`pyyaml`（非 yaml）、`pymupdf`（非 fitz）
- 需固定 Python 版本则写 `requires-python`；纯标准库脚本免此头部
- 也可用命令维护：`uv init --script xxx.py` 生成骨架；`uv add --script xxx.py pandas` 追加依赖

### 外部脚本：--with + --no-project

脚本本体不可改（用户下载、他人提交）时，从命令行注入：

```bash
uv run --no-project --with pyyaml --with rich external_script.py
```

- `--with` 可重复，注入多个包；写包名不写 import 名
- `--no-project` 必加：否则 uv 在当前目录做项目发现，遇 `pyproject.toml`（poetry 项目等）会在用户项目创建 `.venv`，污染项目

## 项目内按项目约定

仅临时脚本场景强制 uv。进入具体项目：

- 有 `uv.lock` 或 `pyproject.toml` 含 `[tool.uv]` → uv 项目，复用项目环境：`uv run <script_path>`
- poetry / venv / virtualenv / requirements.txt 项目 → 用对应工具和环境，不强套 uv
- 项目类型看文件判断，禁跑探测命令（如 `uv sync --dry-run`）：文件检查零副作用，命令探测可能改动环境

## 临时脚本位置

一律放系统临时目录（Windows `%TEMP%`，Git Bash `/tmp`），文件名带前缀（如 `lyxy_*.py`）便于清理；不放当前工作目录，除非用户指定。

## 命令速查

| 场景 | 命令 |
|------|------|
| 自写临时脚本，无第三方依赖 | `uv run <script_path>` |
| 自写临时脚本，有第三方依赖 | 脚本头 PEP 723 → `uv run <script_path>` |
| 外部脚本，有第三方依赖 | `uv run --no-project --with pkg <script_path>` |
| uv 项目内 | `uv run <script_path>`（复用项目环境） |

## 常见错误

| 错误 | 处理 |
|------|------|
| `uv: command not found` | 停止任务，按"核心规则"引导安装，等待用户 |
| 找不到包 / no matching distribution | 写成 import 名了，按上文映射改正后重试 |
| 依赖冲突 / no solution | 放宽 PEP 723 版本约束；确需冲突版本拆成多次运行 |
| 脚本语法错误 | 停止，报告文件路径和行号，修复后重试 |
| 路径权限问题 | 回退系统临时目录执行 |
| uv 项目环境同步失败 | 报告项目环境问题（依赖冲突、锁文件过期），不绕过项目环境强行执行 |

## 示例

自写脚本（PEP 723），存 `/tmp/lyxy_analysis.py`，执行 `uv run /tmp/lyxy_analysis.py`：

```python
# /// script
# requires-python = ">=3.11"
# dependencies = ["pandas"]
# ///
import pandas as pd

df = pd.read_csv('data.csv')
print(f"形状: {df.shape}")
```

外部脚本（不动本体）：

```bash
uv run --no-project --with pandas analyze.py
```

uv 项目内（项目根有 `uv.lock`）：

```bash
cd /path/to/uv-project
uv run scripts/data_process.py
```

## 已知限制

- ✗ 交互式输入（input()）：执行环境无交互终端
- ✗ 持久化环境：脚本环境和 `--with` 环境均临时（uv 有缓存，重复运行快，不保留状态）
- ✗ Python 版本默认由 uv 决定；需特定版本写 PEP 723 `requires-python`

## Workflow

1. 判断脚本来源：自写 → PEP 723；外部 → `--with` + `--no-project`
2. 判断位置：uv 项目内 → 复用项目环境；其他 → 系统临时目录
3. 构造命令并执行；出错按"常见错误"处理
4. 临时脚本用完删除
