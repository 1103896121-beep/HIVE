# HIVE 生产环境部署与架构规范

本文档整理了 HIVE 项目在生产环境（`103.91.219.230`）中的最新架构设计、部署规范以及外网网关的完整配置链路。

## 一、架构设计理念：绝对物理隔离
HIVE 是一个与主系统（MerchLens）完全平行、互不干涉的独立工程。
- **部署路径**：生产服务器的 `/opt/hive_work/` 目录。
- **网络环境**：所有的容器、存储卷、虚拟网络必须前缀 `HIVE_`，与原项目的资源网络彻底断开连接。
- **状态管理**：后端已从 WebSocket 状态机彻底重构为 **HTTP 短轮询 + Redis** 的纯无状态架构，支撑未来的水平横向扩展需求。

---

## 二、Docker 容器与端口映射规范

在 `/opt/hive_work/` 目录下，HIVE 拥有自己的 `docker-compose.yml` 环境。
执行 `docker-compose -p hive up -d` 后，容器结构如下：

| 服务名称 | 宿主机映射端口 | 容器内部端口 | 用途与说明 |
| :--- | :--- | :--- | :--- |
| **HIVE_backend** | **`7777`** | `8000` | Python FastAPI 后端服务，对外提供唯一的流量入口。 |
| **HIVE_db** | (不暴露) | `5432` | PostgreSQL 15 数据库，仅供内部网络访问，防范外部端口扫描。 |
| **HIVE_redis** | (不暴露) | `6379` | Redis 7 缓存，用于存储心跳 (Presence) 和在线状态，仅限内网通信。 |

> **安全注意**：仅 `HIVE_backend` 开放了 `7777` 给防火墙内部的网关（NPM），任何非 HTTP 请求均无法直接触达数据库和缓存层。

---

## 三、外网访问与 Nginx Proxy Manager (NPM) 链路

HIVE 的对外网关由宿主机上的 Nginx Proxy Manager (NPM) 进行反向代理和 SSL 证书卸载处理，未直接与 AWS CloudFront 绑定。

**完整的流量路径为：**
`访客浏览器` -> `[HTTPS] hive.merchlens.app` -> `物理机 NPM 网关` -> `[HTTP] 103.91.219.230:7777` -> `[HTTP] HIVE_backend:8000`

### NPM 后台完整配置项（Proxy Hosts）
1. **Details 选项卡**
   - Domain Names: `hive.merchlens.app`
   - Scheme: `http`
   - Forward Hostname/IP: `103.91.219.230` *(必须填宿主机IP，不能填容器名，以保证两个虚拟局域网的彻底隔离)*
   - Forward Port: `7777`
   - ✅ Block Common Exploits
   - ✅ Websockets Support (目前已被轮询替代，但开启无妨)

2. **SSL 选项卡**
   - 证书来源：**Let's Encrypt** (由于配置了 A 记录绕过了 AWS，因此直接由 NPM 下发 SSL)
   - ✅ Force SSL (强制 HTTPS 重定向)
   - ✅ HTTP/2 Support

> **前端接口配置**：在 `useHiveSocket.ts` 等联调代码中，所有 API 的 Base URL 只需填写 `https://hive.merchlens.app` 即可。 

---

## 四、自动化上线与持续部署 (CI/CD) 流程

HIVE 配备了一套基于本机向服务器自动化投递代码的 Python 脚本：`deploy_to_server.py`。
日常版本发布的标准操作流程如下：

### 第 1 步：本地提交并打包
确认本地所有的改动（特别是 `requirements.txt` 和业务代码）都已经 Git 提交，然后运行命令生成纯净代码包：
```bash
git archive -o hive_source.tar.gz HEAD
```

### 第 2 步：一键运行推包脚本
直接本地运行根目录下的自动部署脚本：
```bash
python deploy_to_server.py
```
**脚本工作流解析：**
1. 自动 SSH 登录生产机 `103.91.219.230`。
2. 将 `hive_source.tar.gz` 运送至 `/root` 并解压到目标应用目录 `/opt/hive_work/`。
3. 检查并补全缺少的环境变量 `.env` 文件。
4. 调用服务器机内的 `backend/deploy.sh` 脚本，触发 Docker 镜像的重新构建（Rebuild）和容器滚动重启。

### 第 3 步：验证与检查健康状态
- 后台可访问：`https://hive.merchlens.app/docs`。
- 如果部署失败或者遇到 `502 Bad Gateway`，立即在服务器运行：
  ```bash
  docker logs --tail 200 HIVE_backend
  ```
  *(注：如果发生崩溃，90% 的概率是漏装了依赖库，请确保将其写入 `requirements.txt` 后重新打包。)*
