---
name: lyxy-document-reader
description: 统一文档解析工具 - 将 DOC、DOCX、XLS、XLSX、PPT、PPTX、PDF、HTML/URL 转换为 Markdown。支持全文输出、字数统计、行数统计、标题提取、章节提取、正则搜索。当用户要求"读取/解析/打开文档"、上传 .doc/.docx/.xls/.xlsx/.ppt/.pptx/.pdf/.html 文件、或提供 URL 时使用。
license: MIT
metadata:
  version: "20260324_234756"
  author: "lanyuanxiaoyao <lanyuanxiaoyao@gmail.com>"
compatibility: Requires Python 3.11+。脚本自启动，自动检测依赖并使用 uv 执行。
---

# 统一文档解析 Skill

## 推荐用法

直接运行脚本即可，它会自动检测文件类型、当前平台，并用正确的 uv 命令执行：

```bash
python scripts/lyxy_document_reader.py <文件路径或URL>
```

## Purpose

**支持格式**
- DOC（Word 旧格式）
- DOCX（Word 文档）
- XLS（Excel 旧格式）
- XLSX（Excel 表格）
- PPT（PowerPoint 旧格式）
- PPTX（PowerPoint 演示文稿）
- PDF（PDF 文档，支持 OCR）
- HTML / URL（网页内容）

## When to Use

### 触发场景
- 文档转换：将各类文档转为 Markdown
- 文档元数据：字数、行数统计
- 标题分析：提取标题结构
- 章节提取：提取特定章节
- 内容搜索：关键词或正则搜索

### 触发词
- 中文："读取/解析/打开 文档/Word/Excel/PPT/PDF/网页"
- 英文："read/parse/extract document/doc/docx/xls/xlsx/ppt/pptx/pdf/html"
- 文件扩展名：`.doc`、`.docx`、`.xls`、`.xlsx`、`.ppt`、`.pptx`、`.pdf`、`.html`、`.htm`
- URL：`http://`、`https://`

## Quick Reference

| 参数 | 说明 |
|------|------|
| (无) | 输出完整 Markdown |
| `-c/--count` | 字数统计 |
| `-l/--lines` | 行数统计 |
| `-t/--titles` | 提取所有标题（1-6级） |
| `-tc <name>` | 提取指定标题的章节内容 |
| `-s <pattern>` | 正则表达式搜索 |
| `-n <num>/--context <num>` | 与 `-s` 配合，指定上下文行数（默认 2） |

## 参数使用示例

```bash
# 读取全文（自动检测依赖）
python scripts/lyxy_document_reader.py document.docx

# 统计字数
python scripts/lyxy_document_reader.py document.docx -c

# 提取标题
python scripts/lyxy_document_reader.py document.docx -t

# 提取指定章节
python scripts/lyxy_document_reader.py document.docx -tc "第三章"

# 搜索内容
python scripts/lyxy_document_reader.py document.docx -s "关键词"

# 正则搜索
python scripts/lyxy_document_reader.py document.docx -s "\d{4}-\d{2}-\d{2}"

# 指定搜索上下文行数
python scripts/lyxy_document_reader.py document.docx -s "关键词" -n 5
```

## 错误处理

| 错误 | 原因 | 解决 |
|------|------|------|
| 错误: input_path 不能为空 | 未提供输入 | 提供 file_path 或 URL |
| 错误: 不支持的文件类型 | 无对应 reader | 检查文件扩展名 |
| 所有解析方法均失败 | 所有解析器失败 | 检查文件是否损坏 |
| 错误: 无效的正则表达式 | 正则语法错误 | 检查正则语法 |
| 错误: 未找到匹配 | 搜索无结果 | 检查搜索词或正则 |
| ModuleNotFoundError | 缺少依赖 | 脚本会自动检测并安装依赖 |
