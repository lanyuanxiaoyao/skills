# Windows 客户机经验

> 单源是 SKILL.md，本文与其不一致时以 SKILL.md 为准。来源：Windows 10/11 x64 虚拟机实证。

## 前置

- 凭据一般是 Administrator 账户（密码由用户提供）；`-gu/-gp` 放子命令之前。
- Git Bash 下客户机路径一律**反斜杠**（`C:\...`）+ `MSYS_NO_PATHCONV=1`，正斜杠报"文件名无效"（PowerShell 调 vmrun 无此问题）。
- 首要通道是 SSH（OpenSSH Server + 密钥免密，地址按任务信息确定）；vmrun 是网络坏时与 GUI 场景的通道。

## vmrun 参数与包装

- 以 `-` 开头的程序参数会被 vmrun 吞掉（如 `powershell -NoProfile -File ...`），绕法是把参数写进 `.bat` 再 `cmd.exe /c` 执行（详见 references/vmrun.md）。
- vmrun guest 直跑**复合命令**（`cmd.exe /c "a & b"`、含重定向）会失败，单命令可用——复杂逻辑在宿主机写好 `.bat` 传进去再执行。
- GUI 程序启动：`runProgramInGuest -interactive -noWait <vmx> C:\path\app.exe`，不带 `-noWait` 会等进程退出而挂起。
- 单实例应用（Electron 等）有残留进程时，新实例弹不出窗口：先杀干净旧进程再启动。
- 高负载 VM（CPU 100%、内存 96%）下：`listProcessesInGuest`/`tasklist` 会超时挂起；复杂 cmd 链（`&` + `2>&1` + 管道）会永久挂起。可靠模式：`-noWait` 发简单命令（单一重定向）+ 轮询 `fileExistsInGuest` 标志文件。
- 文件通道稳定但慢（本机实测约 0.5MB/s），大文件走 scp。

## GUI 自动化

### 启动通道决定窗口可见性

Windows GUI 进程的窗口可见性由其启动通道决定，跨通道窗口互不可见：

- `vmrun runProgramInGuest -interactive`：进程在独立私有桌面，托盘与内部回调正常，但其他进程 `FindWindowEx`/`EnumChildWindows`/UIA 全找不到它。
- `schtasks /IT`（交互式计划任务）：自成另一通道，与 vmrun -interactive 互相看不见。
- vmrun 不带 `-interactive`（session 0）：交互桌面上完全看不到窗口。

操作规则：daemon 与验证辅助工具必须同一启动通道；跨通道时窗口级验证只能真实输入 + 人工目视，勿再撞窗口枚举。交互 GUI 应用须在真实登录会话启动（schtasks /IT 或用户手动）。

### 点击与截图

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
- 运行中程序勿扰动：部分 VM 跑着重度工作负载，操作前向用户确认，避免重启/杀进程影响其中正在运行的东西。

## 已知运行时陷阱

- **解压式固定版 WebView2 运行时**未注册 EdgeUpdate 注册表：依赖 WebView2 的应用窗口起不来时先查这一条（如 scoop 装的 webview2 即此形态）。应用侧需显式指定 `WEBVIEW2_BROWSER_EXECUTABLE_FOLDER` 指向运行时目录。
- PowerShell 脚本若含非 ASCII，注意编码（UTF-8 BOM）。

## PowerShell 5.1 / cmd 的编码与重定向坑

- **无 BOM UTF-8 被 Get-Content 当 GBK 读**：中文字节可吞掉后续 JSON 引号（报 `invalid character 't' after object key:value pair`，与文件内容无关）。跨进程喂 JSON/UTF-8 载荷一律 `[IO.File]::ReadAllBytes()` → pipe 字节直通，不走文本管道。
- **UNC/管道路径的双反斜杠被工具调用层转义吃掉**：`\\.\pipe\x` 送达时变 `\.\pipe\x`。PS 运行时用 `('\','\','.\pipe\x') -join ''` 拼接；bat 里同样中招。
- **cmd `echo` 数字紧贴重定向符**：`echo post 517> file` 的 `7>` 被解析为流重定向致内容损坏。下发动作参数用文件复制（`copy /y`），不用 echo。
- **cmd 重定向独占锁**：`exe > events.log` 运行期间其他进程 `Add-Content` 报「正由另一进程使用」。辅助脚本写独立输出文件，长驻日志只读（`type` 可读）。
- **PowerShell 事件回调静默失效**：`Process.add_OutputDataReceived` 挂 scriptblock 跑在线程池上不执行。输出落盘用同步 `while ($null -ne ($line = $proc.StandardOutput.ReadLine()))` 循环；stdin 由同一进程持有即保活。
- **schtasks 改任务**：`/change` 不带 `/rp` 会交互索要密码（ssh 无 stdin 即失败）。改任务用 delete + create（create 带 `/ru /rp /it`）。
- **Defender 瞬时锁新 exe**：链接期报 exe 被占用（go test 实证），重试即过，非代码问题。
- **bun（Windows 原生）看不见 Git Bash 的 `/tmp`**（MSYS 路径）：本地校验文件放实际 Windows 路径。
