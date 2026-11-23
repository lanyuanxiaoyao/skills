# OrbStack 总则（macOS 宿主）

宿主口径：**macOS + zsh**。OrbStack 双形态，按任务**目标物**判定形态，二者互斥不存在降级关系：

| 形态 | 判定特征 | 级别映射 | 细则 |
|---|---|---|---|
| Docker 运行时 | 目标是跑容器（docker 命令、compose、构建镜像） | L1 容器级 | docker.md 注册表路由 → orbstack/docker.md |
| Linux machines | 目标是完整 Linux 环境（machine、systemd、内核行为） | L2 Linux 系统级 | orbstack/machines.md |

L3（GUI / 异构 OS / 快照回滚）在 macOS 宿主无出口：OrbStack machine 无 GUI、无 VM 快照回滚（export/import 可作整机备份替代），此类任务如实告知用户当前环境不支持。

## CLI 分工

- `docker`：容器操作直发（含 compose/buildx），**不需要任何 Linux machine**；
- `orb`：`orb` 无参 = 进默认 machine 交互 shell；`orb <命令>` = 在默认 machine 执行命令（等价 `orbctl run`）；`orb <orbctl子命令>` = 管理 OrbStack 与 machines；
- `orbctl`：machines 与 OrbStack 服务管理，命令权威归 `orbctl --help`。

## 环境探测

```bash
orb status                # OrbStack 服务运行态
orbctl list               # machines 清单与运行态
docker context show       # 当前 docker context；orbstack 形态须指向 "orbstack"
docker info 2>/dev/null | grep -i "server version"   # Engine 可用性
```

探测结论按「平台 | 组件 | 状态 | 备注」记录，例如：

```
macOS | OrbStack 2.2.5 | Running | Docker Engine 29.8.2 可用；machines 空
```

## 不可逆与服务级边界

- `orbctl stop` **不带参数 = 停整个 OrbStack 服务**（含 Docker Engine 与全部 machines）：只停单机必须显式带 machine 名；停整个服务先向用户确认。
- `orbctl delete <machine>`：立即停机并**永久删除 machine 全部文件，无警告**：不可逆，执行前向用户确认。
- `orbctl reset`：删除**全部** Linux 与 Docker 数据：严禁自动执行，仅用户明确要求时讨论。
- 用户自有 machines / 容器 / 卷一律不动；本次任务创建的，收官报告清单由用户确认销毁。

## 宿主互通

- 容器/机器内访问 macOS 宿主机服务不走 `127.0.0.1`（那是自身回环），用宿主机真实 IP（`ipconfig getifaddr en0` 实查）。
- macOS 宿主访问容器发布端口：`localhost:<端口>`（Engine 自动转发）；宿主访问 machine 用 `<机名>.orb.local`。
- **形态差异**：`host.orb.local` / `host.internal` 仅 Docker 形态可达，machines 不可达——machine 内访问宿主一律用真实 IP。
- 不确定的特性以官方文档为准，先验证再依赖。
