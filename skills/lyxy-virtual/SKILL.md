---
name: lyxy-virtual
description: 为需要在隔离环境执行的任务路由虚拟环境：先按任务分级（L1 容器能装下的跑通、L2 需 Linux 系统行为如 systemd/多服务、L3 需完整 OS 如 GUI/异构系统/快照回滚），探测主机平台与已装组件（Windows：WSL2、wslc、VMware Workstation），按「已运行优先、轻量优先、能力兜底」选定环境后转对应子 skill 操作。容器够就不开 VM，已运行者优先于冷启动；宿主能直接完成的任务不进虚拟环境，只处理宿主跑不动、或必须换环境的任务。凡是"起个隔离环境验证""用容器/Linux 环境测试""需要干净的 Windows/Linux 环境跑一下""帮我搭个环境复现"这类需求，都按本规则执行。
metadata:
  author: lanyuanxiaoyao
  version: 0.1.0
---

# 虚拟环境路由

本 skill 只做**任务分级 → 环境探测 → 路由**三件事，不含任何环境操作命令；操作细则在子 skill，选定环境后加载执行。

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
  3. **能力兜底**——首选缺必需能力（如 wslc 无 --privileged），降级到下一级，并告知用户降级原因
- **探测一次，结论记录于上下文**，同任务内不重复探测。机器事实（IP/凭据/快照名/路径）不写死、不落盘，用时实查。
- **销毁边界**：本次任务创建的环境，完成后报告清单由用户确认销毁；用户自有环境一律不动。
- **探测无可用组件**：如实报告探测结果，后续如何处理由 Agent 结合用户规则决定；如需安装工具，给出建议由用户确认。

## 环境探测

按平台执行探测命令，确认组件**已安装**且**在运行**两态：

```bash
# Windows（Git Bash / PowerShell 均可）
wsl --list --verbose 2>/dev/null          # WSL2 发行版与运行态
wslc system info 2>/dev/null              # wslc 容器运行时
vmrun list 2>/dev/null                    # VMware 在跑 VM

# macOS：暂无子 skill 落地，探测从略
```

探测结论按「平台 | 组件 | 状态 | 备注」记录，例如：

```
Windows | WSL2 Ubuntu-22.04 | Running | 默认发行版
Windows | wslc | Running | 容器 VM 已起
Windows | VMware Workstation | Installed | 无在跑 VM
```

## 路由矩阵

**Windows**

| 级别 | 优先序 | 出口 |
|---|---|---|
| L1 容器 | 在跑的 wslc 容器 | lyxy-wslc |
| L2 Linux 系统 | WSL2 发行版 > 特权容器 | lyxy-wsl |
| L3 完整 OS | VMware Workstation | lyxy-vmware |

**macOS**

（暂无子 skill 落地）

## 路由出口

| 子 skill | 覆盖 |
|---|---|
| lyxy-vmware | Windows VMware Workstation |
| lyxy-wsl | Windows WSL 发行版（Linux 系统环境） |
| lyxy-wslc | Windows wslc 容器（WSL containers） |

- **路由目标已有子 skill**：加载子 skill，按其规则执行；本 skill 职责至此结束。
- **路由目标暂无子 skill**：提示用户需安装对应子 skill，然后停下，等待用户处理；不自行尝试通用方式绕过。
