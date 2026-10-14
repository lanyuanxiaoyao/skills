# vmrun 命令配方与实证怪癖

> 单源是 SKILL.md，本文与其不一致时以 SKILL.md 为准。Windows 宿主机环境实证；标注"本机实测"的数值是单机经验，作量级参考。

## 基本约定

- 先定位 vmrun（方法见 SKILL.md 核心规则），本文 `$VMRUN` 指代；`vmware.exe`（GUI 主程序）在同级目录。
- 涉及 guest 路径的命令在 Git Bash 必须前缀 `MSYS_NO_PATHCONV=1`（PowerShell/CMD 不需要）；Windows 客户机路径一律反斜杠（`C:\...`），正斜杠报"文件名无效"。
- 命令名**大小写敏感**：`CopyFileFromHostToGuest` / `CopyFileFromGuestToHost` / `runScriptInGuest` / `runProgramInGuest` / `getGuestIPAddress` / `fileExistsInGuest` / `listDirectoryInGuest`。
- 参数位置：凭据 `-gu <用户> -gp <密码>` 放在**子命令之前**；`-noWait` 放在 vmx 之后、程序路径之前。
- 进程列表类命令（`listProcessesInGuest` 等）不受路径转换影响——不要因此误判 VMware Tools 损坏。

## 常用命令

| 用途 | 命令 |
|---|---|
| 列出在跑的 VM | `"$VMRUN" list` |
| 开机（后台）/ 关机 | `"$VMRUN" start <vmx> nogui` / `"$VMRUN" stop <vmx> soft`（`stop hard`/`reset` 不可逆，先确认） |
| 取 guest IP | `"$VMRUN" getGuestIPAddress <vmx>` |
| 拍快照 | 关机后 `"$VMRUN" snapshot <vmx> <快照名>` |
| 回滚快照 | `"$VMRUN" revertToSnapshot <vmx> <快照名>`（不可逆，先向用户确认） |
| guest 跑脚本 | `MSYS_NO_PATHCONV=1 "$VMRUN" -gu u -gp p runScriptInGuest <vmx> /bin/bash "/tmp/x.sh"` |
| guest 跑 GUI 程序 | `MSYS_NO_PATHCONV=1 "$VMRUN" -gu u -gp p runProgramInGuest -interactive -noWait <vmx> <程序路径>` |
| 上传 / 下载文件 | `CopyFileFromHostToGuest` / `CopyFileFromGuestToHost` |
| 探测文件存在 | `fileExistsInGuest` |

## 实证怪癖

### 克隆与 GUI 库登记

克隆测试机的标准流程（母机与基准快照名按任务信息/用户提供的确定）：

```bash
MSYS_NO_PATHCONV=1 "$VMRUN" clone "<母机vmx>" "<新目录>\新名.vmx" linked -snapshot=<基准快照名>
MSYS_NO_PATHCONV=1 "$VMRUN" -T ws start "<新vmx>" nogui
```

- 克隆方式按需选择：`linked` 省磁盘空间、秒级完成，但克隆机依赖母盘文件存在（母盘勿删/勿移）；需要独立分发的机器用 `full`。
- 克隆机命名：按用途起 5 字左右短名（如「绘图测试」），同日多台加序号；用户有指定以用户为准。
- 克隆后调整内存/CPU 时手改 vmx，编码与写法坑见下文「手改 vmx 的编码与写法」。

- **⚠️ Git Bash 下 vmrun 传中文目标路径会"假成功"**：exit 0、母机 .vmsd 也登记了，但目标 vmx 根本没创建。凡路径含中文，一律改用 PowerShell 调用：
  `powershell -NoProfile -Command "& '<vmrun全路径>' clone '<源vmx>' '<目标vmx>' linked -snapshot=<快照名>"`
- **vmrun 克隆或直启的 VM 不会出现在 Workstation GUI 库里**：库存文件 `%APPDATA%\VMware\inventory.vmls` 只由 GUI 写；vmrun 的 `register`/`unregister` 仅支持 ESX/vSphere 主机类型，对 Workstation 报 "not supported"，指望不上。
- **入库（唯一方式）**：用 PowerShell 执行 `Start-Process '<vmware.exe全路径>' -ArgumentList '"<新vmx>"'` 打开一次——GUI 开一个标签页并把机器登记进库，之后库里始终可见；标签页可关，库条目保留。
- **删除与移除不归 Agent**：克隆机用完后，删除磁盘目录、GUI 库右键移除都由**用户手动**完成（GUI 库条目也没有命令行移除途径：vmrun 无 unregister、vmrest REST 的 DELETE 对 GUI 库无效、GUI 运行中改 inventory.vmls 会被覆盖）。Agent 不执行删除，最多提醒用户操作步骤。
- **严禁 taskkill vmware.exe**：GUI 是用户共享的，可能有其他 VM 正在运行，强杀连累全部。vmrest.exe 与 GUI/VM 运行无关，可放心杀。
- vmrest REST API（若宿主机启用：127.0.0.1:8697，凭据向用户索取）对库存登记/移除无效，仅在做 REST 电源/快照操作时才需要启动它。
- 母机 .vmsd 里残留已删克隆的 clone 登记属无害元数据，无需清理。

### stdout 不回显，输出落盘拉回

`runScriptInGuest` / `runProgramInGuest` 不回显 stdout。可靠模式：脚本内先重定向落盘，跑完拉回。

```bash
# 1) 上传脚本（/tmp 是 tmpfs，重启即丢，每次 vmrun 流程都要重新上传）
MSYS_NO_PATHCONV=1 "$VMRUN" -gu u -gp p CopyFileFromHostToGuest <vmx> ./x.sh /tmp/x.sh
# 2) 执行（脚本内部 exec >>/tmp/x.log 2>&1）
MSYS_NO_PATHCONV=1 "$VMRUN" -gu u -gp p runScriptInGuest <vmx> /bin/bash "/tmp/x.sh"
# 3) 拉回日志
MSYS_NO_PATHCONV=1 "$VMRUN" -gu u -gp p CopyFileFromGuestToHost <vmx> /tmp/x.log ./x.log
```

### Tools 就绪探针

开机后 VMware Tools 完全就绪需数分钟（本机实测 1–6 分钟），`checkToolsState` 可能长期停在 `installed`，不能作为就绪依据。就绪判据：`fileExistsInGuest`（如探测 `/etc/passwd`）轮询成功即 Tools 可用。

- 开机 6 分钟仍取不到 IP、但系统已到登录界面（`captureScreen` 可见），属 Tools 初始化偏慢，继续等待，勿误判故障、勿反复重启。
- Tools 未就绪又需 IP 时，查宿主机 NAT DHCP 租约文件 `C:\ProgramData\VMware\vmnetdhcp.leases`（按 MAC/时间取最新租约）。

### getGuestIPAddress 输出要过滤

其报错时输出文本非空，直接当 IP 用会翻车。必须用正则提取 IPv4：

```bash
ip=$(MSYS_NO_PATHCONV=1 "$VMRUN" getGuestIPAddress <vmx> 2>/dev/null | grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}')
```

### 快照尽量关机拍

运行中的 VM 上执行 `vmrun snapshot` 曾实测报 `VIX_E_INVALID_ARG`，Workstation 对运行中 VM 的 vmrun 快照支持不稳定（GUI 手动拍一般可行）。稳妥流程：`stop soft` → 确认关机 → `snapshot`。

### 手改 vmx 的编码与写法

- vmx 是 UTF-8 无 BOM 文本。以 ASCII/ANSI 回写会把中文值（displayName 等）写成 `?`，连带 nvram/vmxf/vmdk 索引等引用一起损坏，开机被取消。
- 手改规则：只改目标行值，值必须合法；文件名引用（nvram/vmxf/vmdk）按目录内实际文件名写。
- 改坏了的修复：以 UTF-8 无 BOM 重写整个 vmx，按实际文件名核对全部引用，可完全恢复。
- 改 vmx（如临时加 VNC 两行）在关机时做。

### 以 `-` 开头的程序参数会被 vmrun 吞掉

`runProgramInGuest` 传 `powershell -NoProfile -File ...` 时，`-NoProfile` 等被 vmrun 当自身选项吃掉，导致脚本不执行或半执行（带 `-noWait` 时甚至完全不执行且 exit 0）。绕过：把带 `-` 的参数写进 `.bat`（Windows）或 `.sh`（Linux/macOS）文件，用 `cmd.exe /c` 或 `/bin/bash` 包装执行。关键验证用 `Start-Process` 的 bat 包装保证 argv 干净（vmrun 直启 exe 曾观察到空参/无参两种行为）。

### 高负载 Windows 的可靠模式

客户机高负载（CPU 100%）时，`listProcessesInGuest`、`tasklist` 会超时挂起；复杂 cmd 链（`&` 连接 + `2>&1` + 管道）会永久挂起。可靠模式：

1. `runProgramInGuest -noWait` 发简单命令（单一重定向，避免 `2>&1`）；
2. 轮询 `fileExistsInGuest` 探测标志文件确认完成。

### 多 VM 逐台起停纪律

多台 VM 并行验证时宿主机内存压力大（3 台同开明显卡），逐台「开机 → 验证 → `stop soft` → 下一台」，不要全部同时挂起。

### 宿主机网络打通：VM 访问宿主机本地服务

宿主机上只监听 `127.0.0.1` 的服务，VMnet8（NAT）网段内的 VM 无法直达。打通：宿主机加 portproxy + 防火墙放行（宿主机改动，先经用户确认）：

```powershell
netsh interface portproxy add v4tov4 listenaddress=192.168.100.1 listenport=<端口> connectaddress=127.0.0.1 connectport=<端口>
netsh advfirewall firewall add rule name="<描述性名称>" dir=in action=allow protocol=TCP localport=<端口> remoteip=192.168.100.0/24
```

- VM 内访问 `http://192.168.100.1:<端口>` 即可达宿主机服务。
- 收官回滚（同样先确认）：`portproxy delete v4tov4 listenaddress=... listenport=...` + `firewall delete rule name="<名称>"`；以 `portproxy show all` 为空、规则查询 0 条为回滚完成判据。
- 防火墙规则必须用 `remoteip` 限定 VMnet8 网段，不放开全网。

### 其他

- 文件通道稳定但慢：本机实测约 0.5MB/s（376MB 约 12 分钟）。大文件优先 scp/SSH 通道。
- `runProgramInGuest` 启动 GUI 程序必须带 `-interactive -noWait`，否则等进程退出而挂起。
- sudo 密码与脚本 stdin 分离：`echo <pw> | sudo -S bash /tmp/x.sh`（脚本先上传到 /tmp，不走 stdin）。
- macOS 客户机上 `CopyFileFromGuestToHost` 不可用，见 references/macos-guest.md。
