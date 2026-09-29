---
name: lyxy-vmware
description: 操作 VMware Workstation 虚拟机的标准作业规则：动手前先查记忆库「虚拟机环境」实体卡认机，再按通道选择表选 SSH/vmrun/captureScreen/VNC 通道操作，核心坑是 Git Bash 必须 MSYS_NO_PATHCONV=1、vmrun 用全路径且参数位置有讲究、guest 内输出不回显要落盘拉回；禁止写死 IP、禁止凭据落盘；凡是"操作 VMware""连虚拟机""vmrun""虚拟机截图""克隆虚拟机""快照回滚""在虚拟机里执行命令""虚拟机 GUI 自动化验证"这类需求，都按本规则执行。
metadata:
  author: lanyuanxiaoyao
  version: 1.1.0
---

# 操作 VMware Workstation 虚拟机

默认按 **Windows 宿主机 + Git Bash** 撰写（用户各主机环境同构）；命令在 PowerShell/CMD 下同样可用，仅 `MSYS_NO_PATHCONV=1` 前缀是 Git Bash 专属——其他 shell 没有路径转换问题，直接去掉该前缀。记忆库（OpenViking）跨主机共享，机器事实在任何主机上都查得到。

## 核心规则

- **动手前先认机**：用记忆库 `find`（query 带机器名或任务关键词）检索「虚拟机环境」实体卡，拿目标机器的 vmx 路径、IP、凭据来源、快照名、特有坑。本 skill 只写跨机器通用方法，机器事实全在记忆卡。记忆卡没有 vmx 路径时，列 `%USERPROFILE%\Documents\Virtual Machines`（VMware 默认库目录）按目录名定位。
- **不写死 IP**：NAT 下 DHCP 地址会漂移；运行中取 IP 用 `vmrun getGuestIPAddress`。
- **凭据存放边界**：IP、密码、快照名可以进记忆库实体卡，但禁止写进本 skill、脚本或代码仓库。密码查记忆卡；卡内没有时向用户索取，勿猜测复用其他机器的密码（模板克隆机的 guest 密码继承母机）。
- **删除/移除 VM 不是 Agent 的活**：克隆机测完后，删除磁盘目录、GUI 库右键移除都由**用户手动**完成，Agent 不执行、不代劳，最多在任务结束时提醒用户。
- **先定位 vmrun 再使用**（各主机安装路径可能不同），定位结果下文记作 `$VMRUN`，GUI 主程序 `vmware.exe` 在同级目录：

  ```bash
  VMRUN=$(command -v vmrun || echo "/c/Program Files (x86)/VMware/VMware Workstation/vmrun.exe")
  [ -f "$VMRUN" ] || VMRUN="/c/Program Files/VMware/VMware Workstation/vmrun.exe"
  ```

- Git Bash 下调用 vmrun **必须**加 `MSYS_NO_PATHCONV=1`，否则 `/bin/bash`、`/tmp` 等客户机路径会被转成宿主机 Windows 路径；Windows 客户机路径一律反斜杠。

## 三步决策流程

1. **认机**：`"$VMRUN" list` 看在跑哪台 → 记忆库实体卡拿 vmx / IP / 凭据 / 快照名。
2. **选通道**（细则 Read 对应 reference）：

| 任务 | 首选通道 | 救急通道 |
|---|---|---|
| guest 执行命令 | SSH 免密（实体卡有地址） | `vmrun runScriptInGuest`（网络坏时） |
| 系统截图 | `vmrun captureScreen`（宿主机侧） | VNC + vncdotool |
| 文件进出 | scp | `vmrun CopyFile*`（macOS 拉回不可用） |
| GUI 点击/输入 | vncdotool（VNC） | guest 内脚本（Windows 用 click.ps1） |
| 快照/开关机 | `vmrun`（快照尽量关机拍） | Workstation UI |

3. **过高频坑清单**（下表），再进对应 reference 拿命令配方。

## 高频坑速查（跨系统、踩过不止一次）

| 坑 | 正确做法 |
|---|---|
| Git Bash 把客户机路径转成 Windows 路径 | 一律 `MSYS_NO_PATHCONV=1`（仅 Git Bash 需要） |
| vmrun 吞掉以 `-` 开头的程序参数 | 参数写进 .bat/.sh 文件，包装执行 |
| `runScriptInGuest` 不回显 stdout | guest 内落盘日志，`CopyFileFromGuestToHost` 拉回 |
| guest `/tmp` 是 tmpfs，重启即丢 | vmrun 流程每次先上传脚本再执行 |
| 运行中拍快照报 VIX_E_INVALID_ARG | 快照尽量在关机后拍 |
| `getGuestIPAddress` 输出带错误文本 | 正则提取 IPv4，勿整行当 IP 用 |
| ssh 远程命令里 `pkill -f` 误杀自身 shell | 改用 `pkill -x` |
| 传密码与传脚本共用 stdin 互相吃掉 | `echo <pw> \| sudo -S` 与脚本上传分两步 |
| vmrun 克隆/直启的 VM 不进 GUI 库 | `vmware.exe <vmx>` 登记入库（中文路径用 PowerShell）；删除/移除交用户手动，**严禁杀 vmware.exe** |
| Git Bash 下 vmrun 中文路径"假成功"（exit 0 没建成） | 含中文路径的 vmrun 操作改用 PowerShell 调用 |

## 细则加载（按需 Read 本技能目录下 references/）

| 场景 | 文件 |
|---|---|
| vmrun 命令配方、参数位置、Tools 探针、高负载救急模式、克隆入库 | references/vmrun.md |
| 截图（captureScreen / VNC / guest 内方案） | references/screenshots.md |
| Ubuntu 客户机（克隆修复、apt、systemd 陷阱） | references/ubuntu-guest.md |
| macOS 黑苹果客户机（OC4VM、TCC、vncdotool） | references/macos-guest.md |
| Windows 客户机（bat 包装、-noWait、click.ps1） | references/windows-guest.md |

## 自维护：踩坑双写

- **通用坑**（所有 VM 或某 OS 都会遇到）→ 更新本 skill 对应 reference；本 skill 的坑清单就是通用坑的家。
- **机器特有**（IP 变了、新快照名、新装软件、机器怪癖）→ 写回记忆库对应实体卡。
- 只写一边，下次必踩。跨主机通用的知识直接写；单机实测的数值标注"本机实测"。

## Workflow

1. 定位 `$VMRUN` → `vmrun list` + 记忆库 `find` 认机，拿 vmx / IP / 凭据 / 快照名。
2. 按通道选择表定方案，Read 对应 reference 拿命令配方。
3. 执行任务；guest 内命令输出一律落盘后拉回，不依赖回显。
4. 任务结束：临时克隆机的删除与移除交用户手动处理（可提醒：GUI 右键移除库条目 + 删除磁盘目录）；按「踩坑双写」规则沉淀本次新经验。
