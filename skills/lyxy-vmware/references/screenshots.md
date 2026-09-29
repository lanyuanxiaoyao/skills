# 虚拟机截图专题

> 单源是 SKILL.md，本文与其不一致时以 SKILL.md 为准。

## 通道决策

| 场景 | 通道 |
|---|---|
| 看系统屏幕（默认） | `vmrun captureScreen` |
| 需要在屏幕上点击/打字 | VNC + vncdotool |
| Web 界面验证 | 改用宿主机浏览器/Playwright 截页面，不截系统屏 |
| Server 无 GUI | 截到的是黑底 tty1 文本登录提示，属正常；且 tty1 画面不刷新（guest 内改过主机名等变化不会反映）。要在屏幕上展示内容走 VNC 打字通道 |

## 默认通道：vmrun captureScreen

宿主机侧直接抓虚拟显卡显示缓冲，不依赖 guest 内截图工具或权限。Ubuntu / macOS / Windows 客户机通吃，VM 后台运行（nogui）也可截。

```bash
MSYS_NO_PATHCONV=1 "$VMRUN" \
  -gu <用户> -gp <密码> captureScreen "<vmx路径>" "C:\path\out.png"
```

要点：
- **输出路径是宿主机侧路径**，不是 guest 路径；PNG 生成后 Agent 可直接 Read 读图。
- 必须带 `-gu/-gp` 客户机凭据，否则报"匿名客户机操作"错误（个别 Windows VM 不带也能截，但一律带上最稳）。

### 封装函数（粘贴进 Git Bash 会话即用，自动定位 vmrun）

```bash
vmshot() {  # 用法: vmshot <vmx路径> <宿主机输出.png> <guest用户> <guest密码>
  local vr="/c/Program Files (x86)/VMware/VMware Workstation/vmrun.exe"
  command -v vmrun >/dev/null 2>&1 && vr="$(command -v vmrun)"
  [ -f "$vr" ] || vr="/c/Program Files/VMware/VMware Workstation/vmrun.exe"
  MSYS_NO_PATHCONV=1 "$vr" -gu "$3" -gp "$4" captureScreen "$1" "$2"
}
```

## guest 内截图为什么不行的根因

- Ubuntu：SSH 会话无 `DISPLAY`/`WAYLAND_DISPLAY`，Wayland 禁止跨会话读屏。除非明确设置好 `XDG_RUNTIME_DIR`、`WAYLAND_DISPLAY` 并用对应桌面会话的截图工具，否则必失败。
- macOS：`screencapture` 受 TCC 屏幕录制权限限制，sshd 未获授权必失败；黑苹果上给 sshd 授权困难，不推荐走这条路。

结论：截图一律走 `captureScreen`，不要尝试 guest 内截图。

## captureScreen 的局限与替代

- 截的是 VM 虚拟屏幕：macOS 需先关自动锁屏（屏保锁定后截到的是锁屏界面）。
- 后台进程弹窗不置顶（Windows）：冲突弹窗从后台进程弹出时无前台权限，会被既有窗口挡住——先清桌面（杀浏览器）再触发，或截图前 MinimizeAll。
- Web 界面验证优先用宿主机浏览器/Playwright 直接截页面，分辨率和可交互性都更好。

## 救急通道：VNC + vncdotool

`captureScreen` 只能看不能点。需要在屏幕上交互（点按钮、输命令）时用 VNC：

1. guest 侧开 VNC。macOS 用系统"屏幕共享"；Linux 救急可在 vmx 里加两行（关开机生效）：

   ```
   RemoteDisplay.vnc.enabled = "TRUE"
   RemoteDisplay.vnc.port = "5900"
   ```

2. 宿主机用 vncdotool 操作（依赖走 uv 注入，不装全局）：

   ```bash
   uv run --with vncdotool vncdo -s <guest-ip>::5900 -p <密码> capture out.png
   uv run --with vncdotool vncdo -s <guest-ip>::5900 -p <密码> type "命令" key enter
   ```

3. 临时改过 vmx 的，用完删掉两行并重启 VM。

### vncdotool 控 macOS 的细节

- cmd 键写作 `super`（如 `super-space`）。
- 拼音输入法会吃键盘输入：先 `ctrl-space` 切到 ABC 再打字。
