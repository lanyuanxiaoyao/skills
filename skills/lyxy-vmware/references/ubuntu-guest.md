# Ubuntu 客户机经验

> 单源是 SKILL.md，本文与其不一致时以 SKILL.md 为准。来源：Ubuntu Server/Desktop 母机与多台克隆机的实证记录。

## 首要通道

SSH 免密（宿主机密钥已入 authorized_keys，地址按任务信息确定）。网络坏了才用 `vmrun runScriptInGuest` 救急（配方见 references/vmrun.md）。

## 克隆机网络不通（历史大坑）

**症状**：克隆机首开机 ens33 DOWN、拿不到 DHCP、ssh 不通。

**根因**：subiquity 安装器写进母机的 `/etc/netplan/00-installer-config.yaml` 用 `match:macaddress` 绑死母机自身 MAC + `set-name: ens33`。链接克隆会重新生成 MAC，match 永不匹配 → ens33 不被配置 → 无网。

**若克隆自未模板化的母机**，修复动作：

1. netplan 删掉 `match`/`set-name` 行，改为按接口名匹配，`netplan apply`；
2. `systemctl enable --now ssh`；
3. 清空 `/etc/machine-id`（重启自生成），主机名改名。

## 母机模板化清单（达到"克隆即用"的标准）

母机按此清单处理后即达"克隆即用"（各母机的处理状态与基准快照名向用户确认）。制作新母机时照此办理：

- netplan 改为按接口名 `ens33: {dhcp4: true, dhcp6: true}`（原文件留 `.bak`）；
- `/etc/cloud/cloud.cfg.d/99-disable-network-config.cfg` 写入 `network: {config: disabled}`，防 cloud-init 重写回绑定式配置；
- `systemctl enable --now ssh`（Desktop 版注意先装 openssh-server）；
- machine-id 清空不重建：每台克隆首开机自生成唯一 ID；
- host key 清空 + 加一个 oneshot systemd 服务（`ConditionPathExists=!/etc/ssh/ssh_host_ed25519_key` 时 `ssh-keygen -A`，`Before=ssh.service`）：克隆首开机各自生成唯一 host key，母机自身同样自愈；
- apt 换国内镜像（清华 TUNA，deb822 格式 `ubuntu.sources`），否则国内环境 apt update 可卡死；
- 宿主机公钥写入 authorized_keys：克隆开机即可免密 SSH；
- 打快照前把母机身份再次清空（machine-id 空、无 host key），快照捕获的是"身份留空"状态。

## 克隆后首开机检查项

1. `ip a` 看 ens33 是否 UP 且拿到 DHCP 地址；
2. 免密 SSH 是否可入（模板化母机已预置宿主机公钥）。克隆机 host key 是新生成的，首连用 `StrictHostKeyChecking=accept-new`；若该 IP 此前被其他 VM 用过、known_hosts 残留旧 key，accept-new 会拒连，先 `ssh-keygen -R <IP>` 清除；
3. machine-id / host key 是否独立（`cat /etc/machine-id` 与母机不同）；
4. 主机名与母机不同（母机模板 hostname 固定，克隆后手动改）。需要改名时：`echo <pw> | sudo -S hostnamectl set-hostname <新名>`（密码向用户索取）。

## 切换静态 IP

- 静态 IP 取 NAT 网段低段，避让 DHCP 池（VMnet8 默认 `.128–.254`）。
- 改网络的脚本放整个流程最后一步，并用 `nohup` 执行，防 SSH 断连打断配置。
- 切换后验证：新 IP 可达、SSH 可入；宿主机 known_hosts 见上条清理规则。

## apt 与包管理

- apt 源走清华 TUNA（国内网络环境；原 sg.archive/archive 极慢，apt update 可卡死）。换源改 `/etc/apt/sources.list.d/ubuntu.sources`（deb822 格式），原文件留 `.bak`。
- `unattended-upgrades` 会占 dpkg 锁：装包前先 `systemctl stop unattended-upgrades`，否则 apt 报锁被占。
- snap CLI 输出语言跟随系统 locale（中文系统输出"已禁用"之类），`LC_ALL=C` 无效；匹配输出用 `awk 'NR>1 && $NF ~ /disabled|禁用/'` 这类双语模式。
- VM 内 GitHub 直连大传输（clone 大仓库）可能被墙中断（如 `GnuTLS recv error`）：先重试；仍失败用 blob 过滤（`git clone --filter=blob:none`）减小传输量，或改走代理镜像兜底。
- Docker 镜像 pull 被墙（EOF/超时）：配国内 registry 镜像加速，ghcr 的镜像找国内镜像源回退重跑。

## systemd 与服务判断

- openssh-server 新版本改用 **ssh.socket 激活**：`systemctl is-active ssh` 显示 inactive 属**正常**，22 端口由 ssh.socket 监听、连接时按需拉起 sshd，勿误判为故障。验证用 `ss -tlnp | grep :22` 或直接 ssh 连一下。
- `/tmp` 是 tmpfs：客户机重启后 `/tmp` 下脚本全丢，vmrun 流程每次先上传再执行。

## 远程命令细节

- `sshpass` + Git Bash ssh 传密码会报 `Failed password`（密码正确也失败）：自动化一律用密钥或 vmrun 通道，不走 sshpass。
- `pkill -f` 在 ssh 远程命令里会误杀自身 shell（命令行含同样字符串）：改用 `pkill -x`。
- `echo <pw> | sudo -S` 与传脚本（heredoc/`bash -s`）不能共用 stdin：先上传脚本文件，再 `echo <pw> | sudo -S bash /tmp/x.sh`。

## 常驻 daemon 与进程管理（SSH 远程后台）

- 常驻 daemon 配方：`(sleep N) > in.fifo 2>/dev/null &` 持 fifo 写端保活 + `nohup daemon < in.fifo > events.log 2> debug.log &`；ssh 远端后台进程必须重定向全部 fd，否则 ssh 会话挂住不返回；`echo json > in.fifo` 即时下发命令。
- **进程名 15 字符截断**：`pkill`/`pgrep -x` 按进程名匹配，超过 15 字符的名字（如带 `-linux-amd64` 后缀的长名）匹配不到。判别：`pgrep -af` 按全命令行匹配，或按 PID kill。
- 事件验证捷径：让被测进程把事件落盘日志，验证时直接看日志，与人工操作互为印证。

## 桌面 GUI / dbus 验证

- `busctl` 调 dbusmenu：负数参数会被当选项，加 `--` 分隔。布局树：`busctl --user call <SNI 总线名> /StatusNotifierMenu com.canonical.dbusmenu GetLayout -- iias 0 -1 0`；模拟点击：`... Event -- isvu <dbusID> clicked s "" 0`（dbusID 为 buildMenu 跨层级顺序分配，0 为根；SNI 即 StatusNotifierItem 托盘协议）。
- Wayland 桌面会话拒绝一切跨会话截图（SSH 无 `DISPLAY`/`WAYLAND_DISPLAY`；`vmrun captureScreen` 也可能因 Tools 会话状态被拒）。gnome-screenshot、Shell D-Bus、grim 全失败时果断放弃截图验证，改走应用事件日志或用户目视。
