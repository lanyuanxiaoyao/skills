# 操作 WSL 发行版

> **适用场景（组件选型）**：Windows 宿主的 L2 出口。发行版灵活度中等——可用 `wsl --install -d <发行版>` 在线安装（Ubuntu/Debian/openSUSE 等主流系），但每次安装接近一次完整系统安装（分钟到十分钟级），且 3.0.1 内核裁剪带来 systemd degraded、互操作回归等平台限制；多发行版并存或频繁重建场景优先考虑按需建机的组件（macOS 侧对应 OrbStack machines）。

wsl 命令在 Git Bash 与 PowerShell 下行为一致，仅 wsl.exe 输出编码坑需显式处理。

## 核心规则

- **动手前先认发行版**：确认目标发行版名称、运行态、用户、版本。信息来源优先级：任务描述 → 用户指定 → `wsl --list --verbose` 枚举 → 缺什么向用户问什么。发行版事实（版本、已装软件、网络配置）不写死。
- **不确定就问（仅两类，其余操作直接执行）**：① **认发行版失败**——目标发行版不存在、信息与现状不符：停下报告用户，勿擅自替代（不自行新建发行版、不换台发行版继续干）；② **不可逆操作**——`wsl --unregister`、删除发行版目录、`wsl --shutdown` 影响用户自有环境：执行前先向用户确认。
- **不假设网络模式可用**：mirrored 网络模式静默丢 loopback 数据（3.0.1 已知问题），NAT 模式 TCP timestamps 致 HTTPS 流停滞；网络不通时先回退 NAT + localhostForwarding，勿在 mirrored 上死磕。
- **不假设 systemd 可用**：WSL 3.0.1 下 systemd 进入 degraded（systemd-binfmt 失败，属已知问题）；验证 systemd 行为前先确认发行版 systemd 状态，degraded 时向用户说明属平台限制非操作错误。
- **wsl.exe 输出编码坑必须处理**：脚本/Agent 调 wsl 一律显式带编码前缀，不依赖环境继承：
  ```bash
  WSL_UTF8=1 wsl --list --verbose        # Git Bash
  $env:WSL_UTF8=1; wsl --list --verbose  # PowerShell
  ```

## 三步决策流程

1. **认发行版**：`WSL_UTF8=1 wsl --list --verbose` 看有哪些发行版、哪个在跑 → 按任务信息拿发行版名 / 用户 / 版本。
2. **选通道**：

| 任务 | 首选通道 | 救急通道 |
|---|---|---|
| 发行版内执行命令 | `wsl -d <发行版> -- <命令>` | `wsl -d <发行版> bash -c "<命令>"`（需 shell 解释时） |
| 文件进出 | `\\wsl$\<发行版>\` 或 `\\wsl.localhost\<发行版>\` | `wsl -d <发行版> -- cat <路径>` 重定向 |
| 网络互通（发行版访问宿主机） | localhostForwarding（默认开） | 宿主机真实 IP（`ipconfig` 实查） |
| 网络互通（宿主机访问发行版） | `localhost:<端口>`（localhostForwarding 转发） | 发行版 IP（`wsl -d <发行版> hostname -I`） |
| 导出/备份发行版 | `wsl --export <发行版> <tar路径>` | 关机后复制 ext4.vhdx（不推荐） |
| 关闭发行版 | `wsl -t <发行版>` | `wsl --shutdown`（关全部，含 wslc 会话 VM，先确认） |

3. **过高频坑清单**（下表）。

## 高频坑速查

| 坑 | 正确做法 |
|---|---|
| wsl.exe 输出 UTF-16 乱码 / 读取工具拒读 | 一律 `WSL_UTF8=1` 前缀；脚本内显式带，不依赖环境继承 |
| systemd degraded 报红 | 属 WSL 3.0.1 已知问题（binfmt_misc 清表被拒），无害可忽略；勿当操作错误排查 |
| PPP/PPTP VPN 在 WSL 内不可用 | 内核配置被删（3.0.1），无变通，回退 2.7.14 或改用其他 VPN 方案 |
| mirrored 网络模式静默丢 loopback 数据 | 回退 NAT 模式 + `.wslconfig` 加 `localhostForwarding=true` |
| NAT 模式 TCP timestamps 致 HTTPS 流停滞 | 发行版内 `sysctl -w net.ipv4.tcp_timestamps=0`（临时）或写 `/etc/sysctl.conf`（持久） |
| 发行版内跑 Windows 可执行文件失败 | WSL 3.0.1 已知互操作回归；回退 2.7.14 或改用 wslc 容器方案 |
| OpenGL 极慢 / /dev/dri 消失 | 内核删 CONFIG_DRM/MTRR/X86_PAT（3.0.1）；GPU 直通场景回退 2.7.14 或等 3.0.2+ |
| /proc/self/io 缺失致容器 SIGSEGV | 内核删配置（3.0.1）；Typesense 等依赖该文件的容器回退 2.7.14 |
| VMware guest 内跑 WSL2 报虚拟化不支持 | VMware 被迫走 WHP 模式后嵌套虚拟化不可用；WSL2 只能在裸 Windows 或 Hyper-V 环境跑 |
| `wsl --shutdown` 误伤 wslc 会话 VM | wslc 会话 VM 与发行版 VM 独立，但 `wsl --shutdown` 关全部；关发行版用 `wsl -t <发行版>`，勿用 `--shutdown` |
| 中文文件名 ls 显示转义（$'\344...'） | Ubuntu 26.04 uutils ls 在 locale=C 时转义非 ASCII；`export LC_ALL=C.UTF-8` 或 `ls --quoting-style=literal` |
| wsl --export 路径含中文假成功 | 改 PowerShell 调用或先 cd 到目标目录用相对路径 |

## Workflow

1. `WSL_UTF8=1 wsl --list --verbose` 看发行版与运行态 → 按任务信息认发行版，拿发行版名 / 用户 / 版本。
2. 按通道选择表定方案。
3. 执行任务；发行版内命令输出一律落盘后拉回，不依赖回显（wsl -d 管道大输出会截断）。
4. 任务结束：临时发行版/导出 tar 的删除交用户手动处理。

附录：细则明细

## 输出编码坑细节

- 根因：wsl.exe 输出为 UTF-16 LE，控制台按 GBK 解码 → ASCII 字符间 null 字节显成空格、中文乱码。
- 修复：`WSL_UTF8=1` 使 wsl.exe 改输出 UTF-8；用户级注册表 `HKCU\Environment` 已持久化的机器新 shell 自动继承，独立进程调用仍需显式带。
- PowerShell 下：`$env:WSL_UTF8=1; wsl --list --verbose`（分号分隔）。
- cmd 下：`set WSL_UTF8=1 && wsl --list --verbose`。

## 文件互访

- 宿主机访问发行版文件：`\\wsl$\<发行版>\<路径>` 或 `\\wsl.localhost\<发行版>\<路径>`；Git Bash 下路径形式 `//wsl$/<发行版>/<路径>`。
- 发行版访问宿主机文件：`/mnt/c/...`（自动挂载）。
- 中文路径：Git Bash 下 `//wsl$/...` 含中文可能假成功，改 PowerShell 调用或用短路径。

## 网络互通

- localhostForwarding（默认开）：宿主机 `localhost:<端口>` ↔ 发行版 `localhost:<端口>` 自动转发，无 vEthernet (WSL) 网卡也能通。
- 发行版访问宿主机服务用宿主机真实 IP（`ipconfig` 实查）。
- mirrored 模式：静默丢 loopback 数据（3.0.1 已知问题），`.wslconfig` 改回 `networkingMode=NAT`。

## .wslconfig 配置

配置文件 `C:\Users\<用户>\.wslconfig`（`wsl --shutdown` 后生效），示例：

```ini
[wsl2]
memory=24GB          # 不超过宿主机内存的 75%
processors=12        # 不超过宿主逻辑核数
swap=8GB
localhostForwarding=true

[experimental]
autoMemoryReclaim=gradual
sparseVhd=true
```

## 中文文件名转义（Ubuntu 26.04 uutils 特例）

- Ubuntu 26.04 的 coreutils 是 uutils 0.8.0（Rust 重写版）：locale 为 C 时 `ls` 把非 ASCII 字节转义成 `$'\344...'` 形式。
- 修复：`export LC_ALL=C.UTF-8`（写入 `~/.bashrc` 时放在 `case $-` 的 return 之前）。
- 若仍转义：检查 `QUOTING_STYLE` 环境变量是否残留；排查 `env | sort` 取证。

## 与 VMware 共存

- VMware Workstation 15.5.5+/17+ 检测到 Hyper-V/WHP 时自动切 WHP 模式，可与 WSL 并存。
- 代价：嵌套虚拟化不可用（VMware guest 内跑 WSL2/Docker 不行）；WHP 模式有 CPU/IO 开销。
- 二选一开关：需 VMware 全性能 → `bcdedit /set hypervisorlaunchtype off` + 重启（WSL 不可用）；恢复 WSL → `auto` + 重启。
