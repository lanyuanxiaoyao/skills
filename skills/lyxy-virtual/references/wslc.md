# wslc 跑容器

> **适用场景（组件选型）**：Windows 宿主无 docker 命令时的 L1 落点；发行版概念不适用（跑的是容器镜像，基础镜像即事实上的「发行版」）。

> **定位**：wslc 是 docker parity 的**容器 CLI**（命令语法对齐 docker），但**不是 Docker 运行时**——无 Docker Engine API socket，docker CLI 无法连接，compose 等能力缺失。docker 命令不可用的 Windows 宿主上，它是容器任务的路由落点（见 SKILL.md L1 路由）；若宿主机以 shim 把 `docker` 命令名转发到 wslc，实际能力仍以本文为准。

wslc 参数语义与 docker 基本一致，命令用 wslc 直发。

## 核心规则

- **wslc 能力边界**：
  - 完全缺失：compose、swarm/service/stack、plugin/manifest/buildx、commit/diff/top/port/rename/update/pause/unpause/wait
  - 缺参数：`--restart`、`--privileged`、`--cap-add/drop`、`--add-host`、`--read-only`、`--security-opt`、`--platform`、`--device`、`--volumes-from`、`--init`、`--pid/--ipc/--uts`、`--userns`、`--log-driver/opt`
  - `inspect` 只认 `-f json`，不支持 Go 模板；`stats` 默认快照式、无 `--no-stream`
  - **无 Docker Engine API socket**：testcontainers、VS Code Docker 扩展等走 API 的工具无法对接
- **容器 VM 独立**：wslc 容器跑在专为容器场景裁剪的独立 WSL 虚拟机里，与 WSL 发行版 VM 完全隔离（进程/VHD 路径互不依赖）；会话 VM 为整个会话保活而非随单个容器生灭。
- **网络**：默认网络不做容器名 DNS 解析；自定义网络 `wslc network create` 后正常。
- **不确定就问**：目标容器/镜像不存在、任务要求超出 wslc 能力（compose、特权、重启策略等）：停下报告用户，勿擅自换方案。

## 三步决策流程

1. **认容器/镜像**：`wslc ps -a` / `wslc images` 看现状 → 按任务信息拿容器名/镜像名/端口/卷。
2. **选通道**：

| 任务 | 首选通道 | 救急通道 |
|---|---|---|
| 起容器跑应用 | `wslc run -d --name <名> -p <宿主>:<容器> <镜像>` | `wslc run --rm`（一次性） |
| 进容器执行命令 | `wslc exec -it <容器> <命令>` | `wslc exec <容器> bash -c "<命令>"`（需 shell 时） |
| 查日志 | `wslc logs --tail <N> <容器>` | `wslc logs -f <容器>`（实时） |
| 查详情 | `wslc inspect <容器>`（输出 json） | `wslc inspect <容器> \| jq`（脚本内解析） |
| 查端口映射 | `wslc inspect <容器>` 查 HostPort 字段 | 无 `wslc port` 命令 |
| 文件进出容器 | `wslc exec` + base64 管道 | 挂卷 `-v` 共享目录 |
| 起多容器/编排 | **不支持 compose**：报告用户，建议换方案（Docker Desktop / k3s / VM） | 无 |
| 特权容器 | **不支持 --privileged**：报告用户，建议换方案（Docker Desktop / VM） | 无 |

3. **过高频坑清单**（下表）。

## 高频坑速查

| 坑 | 正确做法 |
|---|---|
| `wslc compose up` 报不支持 | 属能力边界，勿重试；报告用户换方案 |
| `--privileged` / `--restart` 静默无效 | 属能力边界；报告用户换方案 |
| `wslc inspect -f '{{.Id}}'` 报不支持 Go 模板 | 一律 `-f json`，脚本内 jq 解析 |
| `wslc stats` 无 `--no-stream` | 默认快照式；脚本消费加 `--format json` |
| `wslc cp` 失败 | 不可用；用 `wslc exec` + base64 管道或挂卷 |
| 容器内访问宿主机 `127.0.0.1` 不通 | 容器回环非宿主回环；用宿主机真实 IP（`ipconfig` 实查） |
| 容器名 DNS 解析失败（默认网络） | 默认网络不做容器名解析；`wslc network create` 后正常 |
| `wsl --shutdown` 后 wslc 容器全没 | wslc 会话 VM 独立于发行版 VM，但 `--shutdown` 关全部；只关发行版用 `wsl -t <发行版>` |
| 拉镜像超时 | 网络问题，重试或换镜像源 |
| `--gpus all` 未生效 | NVIDIA Windows 驱动未就绪；容器 CUDA 需先装带 WSL 支持的 NVIDIA 驱动 |

## Workflow

1. `wslc ps -a` / `wslc images` 看容器与镜像现状 → 按任务信息认目标，拿容器名/镜像名/端口/卷。
2. 查 wslc 能力边界，确认任务在 wslc 能力内；超出（compose/特权/重启策略）→ 停下报告用户。
3. 执行任务；容器内命令输出一律落盘后拉回，不依赖回显（`wslc exec` 大输出会截断）。
4. 任务结束：临时容器/镜像/卷的删除交用户手动处理。
