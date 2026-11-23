# OrbStack Linux machines 形态（L2 Linux 系统级，macOS 宿主）

从 orbstack.md 总则路由而来：任务目标是完整 Linux 环境。细则口径 macOS + zsh。

## 适用场景与发行版灵活性

- **核心优势：按需直建发行版**。17 个发行版族秒级直建（清单归 `orbctl create --help`），测完删机即清零——这是相对正式 VM（装一个系统长期用）的本质差异：**发行版是消耗品而非固定资产**。
- 需要多发行版并存 / 一次性验证某发行版行为 / 不想长期维护 VM 时，OrbStack machines 是 macOS 宿主的首选 L2。
- **默认发行版口径**：用户指定系统 → 按指定建；未指定 → Alpine（最小最快）或 Debian 12（systemd 验证场景），建前告知用户。
- machine 默认无 sshd 预装（只有 client），SSH 场景需 guest 内 `apt install openssh-server` 并启动；日常用 `orb` 通道无需 SSH。

## 核心事实

- **systemd（Debian 12, v252）**：可用，`systemctl is-system-running` 报 **degraded**（kmod-static-nodes 203/EXEC，OrbStack LXC 化环境限制）；服务启停、transient unit（systemd-run）均正常。degraded 照常干活，个别 unit 失败先看是否容器环境限制，勿当操作错误排查。
- **Ubuntu 24.04**：GNU coreutils 9.4（非 uutils）、默认 `en_US.UTF-8`，中文文件名 ls 无转义——WSL 侧的 uutils 坑在 OrbStack 不存在。
- 时钟：machine UTC 与宿主完全对齐，时区默认 UTC，无漂移。
- DNS：`/etc/resolv.conf` 是指向 macOS resolver 的只读符号链接（nameserver 0.250.250.200），随宿主配置走，machine 内不可改（要改先删链接建新文件）。
- 网络：NAT 网段 DHCP（192.168.139.0/24），外网可达，apt 直装顺畅。
- 性能：磁盘写 ~480MB/s（dd 64MB）；创建分钟级（Debian 12 约 1 分钟 / Alpine 3 分 03 秒，含镜像下载），启停秒级（stop 42s 挂起 / start 0.1s 恢复）。
- 资源占用（16GB 宿主双机并跑）：系统内存 free 71% 无压力；OrbStack 主进程 MEM ~2.4GB 且 machine 全停后不回落（虚拟内存计法 + 缓存），以 `memory_pressure` 判宿主压力为准。
- sudo：默认用户（同 macOS 用户名）免密 sudo，直达 root。

## 高频坑速查

| 坑 | 正确做法 |
|---|---|
| `orb -m <名> sh -c 'ls ~'` 列出的是 macOS home 内容 | shell 起始 cwd 沿用宿主当前目录的 virtiofs 视图；machine 操作先 `cd ~`（真正 home 是 `/home/<用户>`）或一律用绝对路径 |
| `orbctl push/pull` 传绝对路径被当相对路径拼错（`probe:/tmp/x` 变成名为 `probe:` 的字面目录） | push/pull 源/目标**相对 Linux 用户 home**，宿主侧用绝对路径；等价替代：`/mnt/mac` 直读写或 `~/OrbStack/<机>/home/` 直接 cp |
| machine 内访问宿主 `127.0.0.1` 不通 | 用宿主机真实 IP（`ipconfig getifaddr en0` 实查）；`host.orb.local` / `host.internal` 仅 Docker 形态特性，machines 不可达，勿混用 |
| `systemctl is-system-running` 报 degraded | OrbStack LXC 化环境的已知形态（kmod-static-nodes 203/EXEC）；服务启停/创建 transient unit 不受影响，照常干活，勿当故障排查 |
| `ssh.service not found`（Debian 12 全新机） | machine 默认只装 openssh-client；SSH 场景 guest 内装 openssh-server 再启动 |
| `/etc/resolv.conf` 改不动 | 只读符号链接指向 macOS resolver；DNS 配置随宿主，machine 内不改 |
| 宿主 `~/OrbStack/` 下的目录是共享挂载根 | 它是 `<机>/home` 共享视图与挂载点，不是 machine 磁盘本体；勿在此目录内清理 machine 数据 |

## 命令通道要点（命令权威归 `orbctl --help`）

- `orb` 三态用法见总则 CLI 分工；指定机/用户：`orb -m <名> -u <用户> <命令>`。
- SSH 接入（远程编辑器/其他设备）：`ssh orb`，指定机 `ssh MACHINE@orb`，指定用户 `ssh USER@MACHINE@orb`（`orbctl ssh` 查询）。
- 备份派生：export/import 全量、clone 派生；不可逆边界（stop 全服务 / delete 无警告 / reset 严禁）见总则。

## Workflow

1. `orbctl list` 看现状 → 认机（名称/发行版/用户）。
2. 无可用机需新建：**先看「适用场景」节定发行版口径**（用户指定 > 默认建议告知后建），创建分钟级，长任务置于后台。
3. 执行任务：machine 内脚本落盘执行、输出回拉核验；文件进出优先 `/mnt/mac` 直读写，push/pull 遵守相对路径规则。
4. 收官：本次创建的 machine 报告清单，删除交用户确认；machine 内测试产物与宿主侧临时文件双侧清零。
