# 示例

## 场景1：执行已存在的脚本文件

```bash
# 步骤 1: 检查 Bun 是否已安装
bun --version

# 步骤 2: 直接执行已存在的脚本
bun ./scripts/my-script.js

# 脚本的输出将自动显示
```

**关键特点：**
- ✅ **无需生成临时文件** - 直接执行用户提供的脚本
- ✅ **保持脚本位置** - 脚本留在原位置，不会被移动或复制
- ✅ **简洁快速** - 跳过文件生成步骤，直接执行

## 场景2：在指定路径创建并执行脚本

```bash
# 步骤 1: 检查 Bun 是否已安装
bun --version

# 步骤 2: 使用 Write 工具在指定路径创建脚本
# (以下步骤由大模型使用 Write 工具完成)
# write content to "./scripts/new-script.js"

const greeting = "Hello from custom path!";
console.log(greeting);

# 步骤 3: 执行脚本
bun ./scripts/new-script.js
```

**关键特点：**
- ✅ **自定义路径** - 脚本创建到用户指定的位置
- ✅ **持久化存储** - 脚本文件保存在指定位置，不会被自动清理
- ✅ **灵活控制** - 用户可以精确控制脚本位置和命名

## 场景3：使用临时路径执行（默认流程）

### 基础示例

```bash
# 步骤 1: 检查 Bun 是否已安装
bun --version

# 步骤 2: 生成临时文件路径
TEMP_FILE=$(bun scripts/get_temp_path.js js)

# 步骤 3: 将脚本内容写入临时文件
cat <<EOF > "$TEMP_FILE"
const greeting = "Hello from lyxy-runner-js!";
console.log(greeting);
EOF

# 步骤 4: 执行脚本
bun "$TEMP_FILE"

# 步骤 5: 输出已在上面捕获
# 临时文件将由系统自动清理
```

### TypeScript 示例

```bash
# 生成 TypeScript 临时文件
TEMP_TS=$(bun scripts/get_temp_path.js ts)

# 写入 TypeScript 脚本
cat <<EOF > "$TEMP_TS"
const message: string = 'TypeScript execution';
console.log(message);
EOF

# 执行 - Bun 会自动转译 TypeScript
bun "$TEMP_TS"
```

## 依赖管理示例

### 导入外部包

```javascript
// ESM import（推荐）
import axios from 'axios'
import lodash from 'lodash'

// CommonJS import（也支持）
const axios = require('axios')
```

首次执行带有外部导入的脚本时，Bun 会：

1. 分析导入
2. 从 npm 下载缺失的依赖
3. 全局缓存到 `~/.bun/install/cache`
4. 后续运行使用缓存版本

### 不需要 package.json

与 Node.js 不同，你无需创建 `package.json` 或单独运行 `bun install`。Bun 在运行时自动处理所有操作。
