# WSL 发行版使用经验

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
- 发行版访问宿主机服务：容器/发行版内不能走 `127.0.0.1`（那是自身回环），用宿主机真实 IP（`ipconfig` 实查）。
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
