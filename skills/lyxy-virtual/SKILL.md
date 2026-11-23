---
name: lyxy-virtual
description: 为需要在隔离环境执行的任务路由虚拟环境，并承载 Docker 容器操作（OrbStack 等 Docker 运行时）、wslc 容器（Windows 无 docker 命令时）、VMware Workstation、WSL、OrbStack Linux 虚拟机的全套操作细则（自包含，选定环境后按需 Read references/ 内对应文件）：先按任务分级（L1 容器、L2 Linux 系统级、L3 完整 OS），探测主机平台与已装组件（Windows：WSL2、wslc、VMware Workstation；macOS：OrbStack；跨平台：docker 命令可用性），按「已运行优先、轻量优先、能力兜底」选定环境后直接操作；容器够就不开 VM，已运行者优先于冷启动，宿主能直接完成的任务不进虚拟环境。凡涉及隔离环境验证、容器/Linux 环境测试、Docker 容器操作、wslc 跑容器、操作 VMware 虚拟机（vmrun/克隆/快照/截图/GUI 自动化）、WSL 发行版操作与文件互访、OrbStack 建 Linux 虚拟机等需求，都按本规则执行。
metadata:
  author: lanyuanxiaoyao
  version: 0.6.0
---

# 虚拟环境路由与操作

本 skill 做**任务分级 → 环境探测 → 路由 → 按需加载细则操作**四件事；操作细则全在本 skill references/ 内，选定环境后 Read 对应文件执行。

细则按各自标注的宿主与 shell 口径撰写：Windows 系细则默认 **Git Bash**，OrbStack 细则默认 **macOS + zsh**；PowerShell/CMD 差异随文标注。

## 核心规则

- **边界：宿主能跑的不路由。** 本机可直接完成的任务（普通脚本运行、本地服务、文件处理）不进虚拟环境。只有以下情形才路由：
  - 需要隔离（毁伤性测试、依赖冲突、不可信代码）
  - 需要验证特定 OS / 内核 / 系统行为
  - 需要干净的全新环境复现问题
- **任务分级（按最高需求定级，宁高勿低）**：

| 级别 | 判定 | 典型场景 |
|---|---|---|
| L1 容器级 | 一条命令能起、能验证、能销毁；单进程或少量进程，无需 systemd | 起个 nginx 验证端口、跑个 alpine 测命令 |
| L2 Linux 系统级 | 需 systemd / 多服务编排 / 内核参数 / 完整用户态 | 验证 systemd unit、多服务联调、内核模块行为 |
| L3 完整 OS 级 | 需 GUI / 异构 OS / 硬件级隔离 / 快照回滚 | Windows 应用测试、macOS 环境复现、快照对比 |

- **选择优先级**（同平台内按序，命中即止）：
  1. **已运行者**——已在跑的环境优先，避免冷启动成本
  2. **轻量者**——同级别选资源占用小的（容器 > WSL > VM）
  3. **能力兜底**——首选缺必需能力（如 wslc 无 --privileged）：选择期直接降级到下一级并告知用户降级原因；执行中才发现能力不足 → 停下报告用户确认，勿擅自换方案
  4. **发行版/系统匹配**——同能力下看组件能直接提供哪个系统（细则文件「适用场景」节有各组件对比）：用户指定了系统时优先能直接建该系统的组件；组件只能间接满足（如往已有 Ubuntu 里装别的）时向用户说明并确认；需要多种发行版并存的场景优先 OrbStack 类按需建机的组件
- **用户已有环境优先**：宿主机上已有现成环境（模板机、已配好的 machine、用户长期使用的容器）时先考虑复用；新建仅用于无现成可用或需一次性隔离的场景
- **通用工作循环**：认目标 → 选通道 → 过坑清单 → 执行 → 收官清理。认目标的信息来源优先级：任务描述 → 用户指定 → 探测枚举 → 缺什么向用户问什么。
- **不确定就问（仅两类，其余操作直接执行）**：① **认目标失败**——目标不存在、信息与现状不符：停下报告用户，勿擅自替代；② **不可逆操作**：执行前先向用户确认。各细则文件列出本环境的具体触发清单。
- **机器事实与凭据**：机器事实（IP/凭据/快照名/路径/发行版名）不写死、用时实查；凭据不落盘（不写进 skill/脚本/代码仓库），向用户索取，勿猜测复用其他机器的密码。
- **命令权威**：各工具以自身 `--help` 为准；细则不复制命令清单，只写踩坑经验与通道选择。
- **输出不依赖回显**：guest/容器/发行版内命令输出一律落盘后拉回核验。
- **宿主机访问**：容器/VM 内访问宿主机服务不能走 `127.0.0.1`（那是自身回环），用宿主机真实 IP（Windows `ipconfig`、macOS `ipconfig getifaddr en0` 实查）；宿主机服务只监听 `127.0.0.1` 时需端口转发（配方见各细则）。
- **中文路径假成功**：Windows 宿主上 Git Bash 调原生工具（vmrun/wsl 等）传中文路径可能 exit 0 实际未生效，改用 PowerShell 调用。
- **探测一次，结论记录于上下文**，同任务内不重复探测。
- **销毁边界**：本次任务创建的环境，完成后报告清单由用户确认销毁；用户自有环境一律不动。
- **探测无可用组件**：如实报告探测结果，后续如何处理由 Agent 结合用户规则决定；如需安装工具，给出建议由用户确认。

## 通用经验

跨组件、跨环境反复验证的使用原则，用任何组件前先带这层意识：

- **宿主机零污染**：隔离的价值就是保护宿主。guest/容器内可自由处置——删机即清零，无需逐步请示；宿主机必须保持干净：任务文件放临时目录、只引用已有文件不复制散落；任何改变宿主机的操作（装软件、改网络/防火墙、写宿主文件）先向用户确认；收官清尽宿主残留（临时文件、中继进程、known_hosts 条目、端口转发规则）。
- **终态复核**：命令报成功 ≠ 目标达成。启动/执行后用独立命令复核终态（`vmrun list` / `docker ps` / `orbctl list`）；假成功（中文路径、参数静默无效）是虚拟环境操作的固有属性，非个例。
- **变更留退路**：动手前先建回滚点——改配置留 `.bak`、大变更先拍快照或 export；修复验证通过后固化（重拍快照），防回滚复活坏状态。
- **最小扰动**：只碰任务范围内的对象；非破坏手段优先（soft 优先于 hard/reset）；用户共享的服务与 GUI 进程严禁强杀；用户自有环境一律不动。

## 环境探测

按平台执行探测命令，确认组件**已安装**且**在运行**两态：

```bash
# 跨平台（Windows / macOS 均先判）
docker version 2>/dev/null                    # docker 命令可用性与 Engine 连通；可用则 L1 优先走 Docker 通道

# Windows（Git Bash / PowerShell 均可）
WSL_UTF8=1 wsl --list --verbose 2>/dev/null   # WSL2 发行版与运行态
wslc system info 2>/dev/null                  # wslc 容器运行时
vmrun list 2>/dev/null                        # VMware 在跑 VM

# macOS
orb status                                    # OrbStack 服务运行态
orbctl list                                   # Linux machines 清单与运行态
docker context show                           # Docker 形态：确认指向 "orbstack"
```

探测结论按「平台 | 组件 | 状态 | 备注」记录，例如：

```
Windows | WSL2 Ubuntu-22.04 | Running | 默认发行版
Windows | wslc | Running | 容器 VM 已起
Windows | VMware Workstation | Installed | 无在跑 VM
macOS | OrbStack 2.2.5 | Running | Docker Engine 可用；machines 空
```

## 路由矩阵

**L1 容器（跨平台，先于平台表判定）**

| 判定 | 出口（选定后 Read） |
|---|---|
| docker 命令可用（真实 Engine 在服务） | references/docker.md → 按其适配注册表定运行时细则 |
| docker 不可用 + Windows 宿主 | references/wslc.md（容器 CLI 备选） |
| docker 不可用 + macOS 宿主 | （暂无落地：按通用方式处理并告知用户局限，安装建议经用户确认） |

**Windows（L2/L3）**

| 级别 | 优先序 | 出口（选定后 Read） |
|---|---|---|
| L2 Linux 系统 | WSL2 发行版（wslc 缺所需能力时，如特权容器、systemd） | references/wsl.md |
| L3 完整 OS | VMware Workstation | references/vmware.md（再按 guest 类型读 references/vmware/ 下对应文件） |

（Windows 宿主上 VMware 内的 macOS 客户机属 L3，细则见 references/vmware/macos-guest.md）

**macOS（L2/L3）**

| 级别 | 优先序 | 出口（选定后 Read） |
|---|---|---|
| L2 Linux 系统 | OrbStack Linux machines（17 发行版按需直建；systemd 可用，degraded 属环境形态不影响任务，详见 machines.md） | references/orbstack.md，按形态再读 orbstack/machines.md |
| L3 完整 OS | （暂无：OrbStack machine 无 GUI/快照回滚，VMware/Parallels 类未落地） | 按通用方式处理并告知用户局限 |

## 细则文件

| 文件 | 覆盖 |
|---|---|
| references/docker.md | Docker 通用层：容器任务通用规则、运行时核对、适配注册表（跨平台） |
| references/vmware.md + references/vmware/ | VMware Workstation：操作总则（vmrun.md 命令配方、screenshots.md 截图、ubuntu/windows/macos-guest.md 各客户机） |
| references/wsl.md | WSL 发行版操作（含编码坑、文件互访、网络互通、.wslconfig 细节） |
| references/wslc.md | wslc 容器 CLI（Windows 无 docker 命令时的备选；能力边界、网络） |
| references/orbstack.md + references/orbstack/ | OrbStack 总则（形态判定、不可逆边界）＋ docker.md 运行时适配（Engine=OrbStack）、machines.md Linux 虚拟机形态 |
