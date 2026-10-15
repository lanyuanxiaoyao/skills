---
name: lyxy-vmware
description: 操作 VMware Workstation 虚拟机的标准作业规则：动手前先认机（vmx/IP/凭据/快照名从任务信息或用户处获取），再按通道选择表选 SSH/vmrun/captureScreen/VNC 通道操作，核心坑是 Git Bash 必须 MSYS_NO_PATHCONV=1、vmrun 用全路径且参数位置有讲究、guest 内输出不回显要落盘拉回；禁止写死 IP、禁止凭据落盘；凡是"操作 VMware""连虚拟机""vmrun""虚拟机截图""克隆虚拟机""快照回滚""在虚拟机里执行命令""虚拟机 GUI 自动化验证"这类需求，都按本规则执行。
metadata:
  author: lanyuanxiaoyao
  version: 1.3.0
---

# 操作 VMware Workstation 虚拟机

默认按 **Windows 宿主机 + Git Bash** 撰写；命令在 PowerShell/CMD 下同样可用，仅 `MSYS_NO_PATHCONV=1` 前缀是 Git Bash 专属——其他 shell 没有路径转换问题，直接去掉该前缀。

## 核心规则

- **动手前先认机**：确认目标机器的 vmx 路径、IP、凭据、快照名、特有坑。信息来源优先级：任务描述 → 用户提供的信息 → 列 `%USERPROFILE%\Documents\Virtual Machines`（VMware 默认库目录）按目录名推断 → 缺什么向用户问什么。本 skill 只写跨机器通用方法，机器事实不写死。
- **不确定就问（仅两类，其余操作直接执行）**：① **认机失败**——目标 VM 不存在、信息与现状不符：停下报告用户，勿擅自替代（不自行克隆新机、不换台机器继续干）；② **不可逆操作**——快照回滚/删除、`stop hard`/`reset`、删除文件或目录：执行前先向用户确认。
- **不写死 IP**：NAT 下 DHCP 地址会漂移；运行中取 IP 用 `vmrun getGuestIPAddress`。
- **凭据不落盘**：密码等凭据禁止写进本 skill、脚本或代码仓库。密码向用户索取，勿猜测复用其他机器的密码。
- **删除/移除/停机边界**：克隆机测完后，删除磁盘目录、GUI 库右键移除由用户手动完成，Agent 最多提醒。收官停机只做 `stop soft`；停机前 `vmrun list` 盘点，只关本次任务范围内的 VM，用户自有 VM 一律不动。
- **先定位 vmrun 再使用**（各主机安装路径可能不同），定位结果下文记作 `$VMRUN`，GUI 主程序 `vmware.exe` 在同级目录：

  ```bash
  VMRUN=$(command -v vmrun || echo "/c/Program Files (x86)/VMware/VMware Workstation/vmrun.exe")
  [ -f "$VMRUN" ] || VMRUN="/c/Program Files/VMware/VMware Workstation/vmrun.exe"
  ```

- Git Bash 下调用 vmrun **必须**加 `MSYS_NO_PATHCONV=1`，否则 `/bin/bash`、`/tmp` 等客户机路径会被转成宿主机 Windows 路径；Windows 客户机路径一律反斜杠。

## 三步决策流程

1. **认机**：`"$VMRUN" list` 看在跑哪台 → 按任务信息拿 vmx / IP / 凭据 / 快照名。
2. **选通道**（细则 Read 对应 reference）：

| 任务 | 首选通道 | 救急通道 |
|---|---|---|
| guest 执行命令 | SSH 免密（地址按任务信息） | `vmrun runScriptInGuest`（网络坏时） |
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
| Linux guest `/tmp` 是 tmpfs，重启即丢 | vmrun 流程每次先上传脚本再执行 |
| 运行中拍快照报 VIX_E_INVALID_ARG | 快照尽量在关机后拍 |
| `getGuestIPAddress` 输出带错误文本 | 正则提取 IPv4，勿整行当 IP 用 |
| ssh 远程命令里 `pkill -f` 误杀自身 shell | 改用 `pkill -x` |
| 传密码与传脚本共用 stdin 互相吃掉 | `echo <pw> \| sudo -S` 与脚本上传分两步 |
| vmrun 克隆/直启的 VM 不进 GUI 库 | `vmware.exe <vmx>` 登记入库（中文路径用 PowerShell）；删除/移除默认交用户手动，**严禁杀 vmware.exe** |
| 路径含中文时 Git Bash 下 vmrun"假成功"（exit 0 没建成） | 一律改用 PowerShell 调用 |
| 手改 vmx 后开机失败、中文值变 `?` | vmx 是 UTF-8 无 BOM，以 UTF-8 无 BOM 回写，文件名引用按目录内实际文件名写 |
| 跨进程窗口枚举/UIA 找不到 GUI 窗口 | 可见性由启动通道决定（详见 windows-guest.md）；跨通道只能真实输入 + 人工目视 |
| vmrun start 报成功但 VM 未启动 | 以 `vmrun list` 复核；未起则重跑 |
| vmrun 报错只走 stderr | 合并 `2>&1` 或按退出码判成败，勿丢 stderr 后按 stdout 关键字判错 |

## 细则加载（按需 Read 本技能目录下 references/）

| 场景 | 文件 |
|---|---|
| vmrun 命令配方、参数位置、Tools 探针、高负载救急模式、克隆入库 | references/vmrun.md |
| 截图（captureScreen / VNC / guest 内方案） | references/screenshots.md |
| Ubuntu 客户机（克隆修复、apt、systemd 陷阱） | references/ubuntu-guest.md |
| macOS 黑苹果客户机（OC4VM、TCC、vncdotool） | references/macos-guest.md |
| Windows 客户机（bat 包装、-noWait、click.ps1） | references/windows-guest.md |

## 自维护：踩坑沉淀

- **通用坑**（所有 VM 或某 OS 都会遇到）→ 更新本 skill 对应 reference；本 skill 的坑清单就是通用坑的家。
- **机器特有事实**（IP 变了、新快照名、新装软件、机器怪癖）→ 登记到该机器的信息记录里（环境有记录机制就用，没有就报告用户留存），下次直接查，不靠回忆。
- 只记一边，下次必踩。跨主机通用的知识直接写；单机实测的数值标注"本机实测"。

## Workflow

1. 定位 `$VMRUN` → `vmrun list` 看在跑哪台 → 按任务信息认机，拿 vmx / IP / 凭据 / 快照名。
2. 按通道选择表定方案，Read 对应 reference 拿命令配方。
3. 执行任务；guest 内命令输出一律落盘后拉回，不依赖回显。
4. 任务结束：临时克隆机的删除与移除交用户手动处理（可提醒：GUI 右键移除库条目 + 删除磁盘目录）；按「自维护」规则沉淀本次新经验。
