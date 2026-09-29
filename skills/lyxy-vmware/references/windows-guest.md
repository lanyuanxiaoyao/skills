# Windows 客户机经验

> 单源是 SKILL.md，本文与其不一致时以 SKILL.md 为准。来源：Windows 10/11 x64 虚拟机实证。

## 前置

- 凭据一般是 Administrator 账户（密码查记忆库实体卡或用户会话内提供）；`-gu/-gp` 放子命令之前。
- Git Bash 下客户机路径一律**反斜杠**（`C:\...`）+ `MSYS_NO_PATHCONV=1`，正斜杠报"文件名无效"（PowerShell 调 vmrun 无此问题）。
- 首要通道是 SSH（OpenSSH Server + 密钥免密，地址查实体卡）；vmrun 是网络坏时与 GUI 场景的通道。

## vmrun 参数与包装

- 以 `-` 开头的程序参数会被 vmrun 吞掉（如 `powershell -NoProfile -File ...`），绕法是把参数写进 `.bat` 再 `cmd.exe /c` 执行（详见 references/vmrun.md）。
- GUI 程序启动：`runProgramInGuest -interactive -noWait <vmx> C:\path\app.exe`，不带 `-noWait` 会等进程退出而挂起。
- 高负载 VM（CPU 100%、内存 96%）下：`listProcessesInGuest`/`tasklist` 会超时挂起；复杂 cmd 链（`&` + `2>&1` + 管道）会永久挂起。可靠模式：`-noWait` 发简单命令（单一重定向）+ 轮询 `fileExistsInGuest` 标志文件。
- 文件通道稳定但慢（本机实测约 0.5MB/s），大文件走 scp。

## GUI 自动化

- 点击：guest 内放 `click.ps1` 坐标点击脚本（内容如下，首次使用先写入 guest），经 `vmrun -interactive` 调 PowerShell 执行：

  ```powershell
  param([int]$x,[int]$y)
  Add-Type -TypeDefinition 'using System.Runtime.InteropServices;
    public class U {
      [DllImport("user32.dll")] public static extern bool SetCursorPos(int x,int y);
      [DllImport("user32.dll")] public static extern void mouse_event(uint f,uint dx,uint dy,uint d,UIntPtr e);
    }'
  [U]::SetCursorPos($x,$y); Start-Sleep -Milliseconds 50
  [U]::mouse_event(2,0,0,0,[UIntPtr]::Zero); [U]::mouse_event(4,0,0,0,[UIntPtr]::Zero)  # 左键按下+抬起
  ```

- 截图：`vmrun captureScreen`（需 `-gu/-gp`），输出为宿主机路径，配方见 references/screenshots.md。
- 后台进程弹窗不置顶：无前台权限的弹窗会被既有窗口挡住——先清桌面（杀浏览器）再触发，或截图前 MinimizeAll。
- 运行中程序勿扰动：部分 VM 跑着重度工作负载，操作前查实体卡确认，避免重启/杀进程影响其中正在运行的东西。

## 已知运行时陷阱

- **解压式固定版 WebView2 运行时**未注册 EdgeUpdate 注册表：依赖 WebView2 的应用窗口起不来时先查这一条（如 scoop 装的 webview2 即此形态）。应用侧需显式指定 `WEBVIEW2_BROWSER_EXECUTABLE_FOLDER` 指向运行时目录。
- PowerShell 脚本若含非 ASCII，注意编码（UTF-8 BOM）。
