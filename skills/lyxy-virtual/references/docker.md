# Docker 通用层（跨平台容器任务）

L1 容器级任务的通用细则：容器操作按标准 docker 命令语义执行，与底层由哪个 Docker 运行时（Engine）提供服务无关。命令权威归 `docker --help`。

## 第一步：运行时核对

动手前确认实际在服务的 Engine 身份，据此查适配注册表：

```bash
docker version          # 命令可用性与 client/server 版本
docker info             # Server Version / Operating System 显示 Engine 身份
docker context show     # 当前 context
```

## 适配注册表

| Engine 判定特征 | 适配细则 |
|---|---|
| Operating System: OrbStack | orbstack/docker.md（context 名 `orbstack`） |

- 注册表只列已落地的运行时；未注册的 Engine 按 docker 通用规则操作，发现本运行时特有差异再沉淀为适配文件。
- **shim 判据**：`docker` 命令实际是转发 shim（`docker info` 报错指向其他 CLI、或输出带非标准 Engine 标识）时，不按 Docker 处理，按实际后端路由（Windows 下常见落点：wslc.md）。

## 通用预期（运行时无关）

- compose（`docker compose`）与 buildx 预期可用；报「不支持」先查适配细则确认是否该运行时的能力边界，勿当普通故障排查。
- 通用边界规则（宿主访问不走 127.0.0.1、销毁边界等）见 SKILL.md 核心规则。
- **覆盖规则**：适配细则与本通用层冲突时，以适配细则为准。
