# Ubuntu 客户机经验

> 单源是 SKILL.md，本文与其不一致时以 SKILL.md 为准。来源：Ubuntu Server/Desktop 母机与多台克隆机的实证记录。

## 首要通道

SSH 免密（宿主机密钥已入 authorized_keys，地址见记忆库实体卡）。网络坏了才用 `vmrun runScriptInGuest` 救急（配方见 references/vmrun.md）。

## 克隆机网络不通（历史大坑）

**症状**：克隆机首开机 ens33 DOWN、拿不到 DHCP、ssh 不通。

**根因**：subiquity 安装器写进母机的 `/etc/netplan/00-installer-config.yaml` 用 `match:macaddress` 绑死母机自身 MAC + `set-name: ens33`。链接克隆会重新生成 MAC，match 永不匹配 → ens33 不被配置 → 无网。

**若克隆自未模板化的母机**，修复动作：

1. netplan 删掉 `match`/`set-name` 行，改为按接口名匹配，`netplan apply`；
2. `systemctl enable --now ssh`；
3. 清空 `/etc/machine-id`（重启自生成），主机名改名。

## 母机模板化清单（达到"克隆即用"的标准）

用户现有 Ubuntu 母机已按此清单处理（处理记录、各自基准快照名查记忆卡）。制作新母机时照此办理：

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
2. 免密 SSH 是否可入（模板化母机已预置宿主机公钥）；
3. machine-id / host key 是否独立（`cat /etc/machine-id` 与母机不同）；
4. 主机名与母机不同（母机模板 hostname 固定，克隆后手动改）。需要改名时：`echo <pw> | sudo -S hostnamectl set-hostname <新名>`（密码查记忆卡，卡内无则向用户索取）。

## apt 与包管理

- apt 源走清华 TUNA（国内网络环境；原 sg.archive/archive 极慢，apt update 可卡死）。换源改 `/etc/apt/sources.list.d/ubuntu.sources`（deb822 格式），原文件留 `.bak`。
- `unattended-upgrades` 会占 dpkg 锁：装包前先 `systemctl stop unattended-upgrades`，否则 apt 报锁被占。
- snap CLI 输出语言跟随系统 locale（中文系统输出"已禁用"之类），`LC_ALL=C` 无效；匹配输出用 `awk 'NR>1 && $NF ~ /disabled|禁用/'` 这类双语模式。

## systemd 与服务判断

- openssh-server 新版本改用 **ssh.socket 激活**：`systemctl is-active ssh` 显示 inactive 属**正常**，22 端口由 ssh.socket 监听、连接时按需拉起 sshd，勿误判为故障。验证用 `ss -tlnp | grep :22` 或直接 ssh 连一下。
- `/tmp` 是 tmpfs：客户机重启后 `/tmp` 下脚本全丢，vmrun 流程每次先上传再执行。

## 远程命令细节

- `sshpass` + Git Bash ssh 传密码会报 `Failed password`（密码正确也失败）：自动化一律用密钥或 vmrun 通道，不走 sshpass。
- `pkill -f` 在 ssh 远程命令里会误杀自身 shell（命令行含同样字符串）：改用 `pkill -x`。
- `echo <pw> | sudo -S` 与传脚本（heredoc/`bash -s`）不能共用 stdin：先上传脚本文件，再 `echo <pw> | sudo -S bash /tmp/x.sh`。
