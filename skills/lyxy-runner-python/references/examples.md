# 示例

## 示例1: 数据分析

```python
import pandas as pd
import numpy as np

df = pd.read_csv('data.csv')
print(f"形状: {df.shape}")
print(df.describe())
```

**执行**: `uv run --with pandas --with numpy /tmp/script_xxx.py`

## 示例2: API交互

```python
import requests

resp = requests.get('https://api.github.com/repos/python/cpython')
data = resp.json()
print(f"仓库: {data['full_name']}, Stars: {data['stargazers_count']}")
```

**执行**: `uv run --with requests /tmp/script_xxx.py`

## 示例3: 文件操作

```python
import os
import glob

for i, file in enumerate(glob.glob('*.txt')):
    os.rename(file, f"file_{i:03d}.txt")
```

**执行**: `uv run /tmp/script_xxx.py`（无依赖）

## 示例4: uv项目内执行

```python
import pandas as pd
from my_project import helper

df = pd.read_csv('data.csv')
result = helper.process(df)
print(result)
```

**执行**: `uv run scripts/data_process.py`（使用项目环境）

## 示例5: 用户指定路径

```python
import requests

resp = requests.get('https://api.example.com/data')
print(f"处理完成: {len(resp.json())} 条")
```

**执行**: `uv run --with requests scripts/api_analyzer.py`（写入指定路径）
