# macOS 黑苹果客户机经验

> 单源是 SKILL.md，本文与其不一致时以 SKILL.md 为准。来源：macOS（OpenCore/OC4VM 方案）虚拟机实证。是否黑苹果、具体引导方案查记忆卡。

## 方案约束（先记住再动手）

- **若为 OpenCore/OC4VM 黑苹果方案**（用户的 macOS VM 均是）：**绝对不要点系统大版本升级**——会毁引导；系统自动更新应全关。opencore.vmdk 是引导设备，勿从 VM 移除；macOS 启动后 OpenCore 卷可弹出，重启自动回挂，属正常。
- 快照回滚用 `vmrun revertToSnapshot <vmx> <快照名>`（快照名查记忆库实体卡；快照拍摄注意见 references/vmrun.md）。

## 首要通道

SSH 免密（宿主机密钥已入 authorized_keys）。交互式 GUI 操作走 VNC（地址/端口/密码查记忆卡），不用 VNC 截图验证——直接 SSH 跑批量命令。

## vmrun 在 macOS guest 上的能力边界

| 操作 | 可用性 |
|---|---|
| `runScriptInGuest` / `fileExistsInGuest` | ✅ 可用 |
| `CopyFileFromHostToGuest` | ✅ 可用 |
| `CopyFileFromGuestToHost` | ❌ **不可用**，拉文件走 scp |

- `/tmp` 是 `/private/tmp` 的符号链接：vmrun 文件操作用 `/tmp` 路径报"未找到文件"，写 `/private/tmp` 或干脆走 scp。

## GUI 自动化必须走 VNC

SSH 会话里 osascript **无 TCC 辅助功能权限**：System Events 的 key code / click button 全部报 1002 错误——弹窗按钮自动化走 SSH 不可行，用 vncdotool（见 references/screenshots.md）。

其他 GUI 相关实证：

- SSH 启动 GUI 进程与 console 同用户共享会话：GUI 能正常出现（如 Safari 自动打开、菜单栏托盘渲染正常），可用 `lsappinfo list | grep <进程名>` 验证。
- adhoc 签名 + quarantine 属性的 app 经 `open` 启动不会被 Gatekeeper 拦截，但会发生 **App Translocation**（拷贝到 /var/folders 随机只读位置运行）——黑苹果上无法复现 Gatekeeper 拦截场景；遇到"已损坏"提示用 `xattr -cr <app>` 解。
- `kill -TERM` 优雅停机已实证可用。

## 装 VMware Tools

macOS 没有 open-vm-tools 时用 VMware 官方 darwin.iso：若 OpenCore 卷自带（OC4VM 模板通常在 `OC4VM/iso/darwin.iso`）直接 `hdiutil attach` 挂载，否则从 VMware 安装目录取；挂载后 GUI 安装（需"访问可移除宗卷"授权 + 管理员密码）→ 装完重启。

## 环境注意

- sudo 是否免密、MacPorts/Homebrew 等包管理器细节是机器事实，查记忆卡；通用规律：非交互 ssh 不继承登录 shell 的 PATH，调包管理器用全路径。
- 系统卷密封（SSV），/System/Applications 不可删也不占多少空间，别做系统精简的尝试。
