# OrbStack Docker 运行时适配（L1，macOS 宿主）

> **适用场景（组件选型）**：macOS 宿主的 L1 出口（docker.md 注册表当前唯一已落地运行时）；发行版概念不适用（容器镜像即事实上的「发行版」）。

从 docker.md 通用层的适配注册表路由而来：Engine = OrbStack（判定特征 `docker info` Operating System 为 OrbStack、context 名 `orbstack`）。细则口径 macOS + zsh。

## 核心事实

- OrbStack 内置完整 Docker Engine，**支持 API socket**（`~/.orbstack/run/docker.sock`）：testcontainers、IDE Docker 集成等走 API 的工具可正常对接。
- compose、buildx 完整可用。
- OrbStack 会自动切换活动 docker context，防自动切换用 `orb config set docker.set_context false`。
- 从 Docker Desktop 迁移存量数据：`orbctl docker migrate`（迁容器/卷/镜像）。
- 服务级不可逆边界（`orbctl stop` 不带参连 Engine 一起停等）见 orbstack.md。

## 命令通道

容器操作全部用标准 `docker` 命令直发（OrbStack 无自有容器命令面，命令权威归 `docker --help`）；`orbctl docker` 下只有 migrate/volume 两个扩展子命令。OrbStack 侧特有点：

- Engine 以 docker context `orbstack` 接入，OrbStack 会自动切换活动 context，防自动切换用 `orb config set docker.set_context false`；
- 从 Docker Desktop 迁移存量数据用 `orbctl docker migrate`（迁容器/卷/镜像）；
- `orbctl debug <容器>` 调试最小/distroless 容器（Pro 授权功能，未授权报错属预期）。

## 端口与访问

- 容器发布端口 macOS 侧 `localhost:<端口>` 直达。
- 容器内访问 macOS 宿主机服务：用宿主机真实 IP（`ipconfig getifaddr en0` 实查），不走 `127.0.0.1`。

## 待沉淀

- 容器内访问宿主的 `.orb.local` 域名形态、卷性能特征、k8s 集群（`orbctl start k8s`）：首次用到时验证后回填本节。
