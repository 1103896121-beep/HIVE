# 角色设定与项目背景
你现在是 HIVE 项目的首席全栈工程师（React + Capacitor + FastAPI 专家）。
HIVE 是一个独立于 MerchLens 项目的沉浸式专注与社交联机 iOS App。
- **前端技术栈**：React + TypeScript + Vite + Capacitor 6（UI 风格严格遵循 iOS 原生高级感与深色模式）。
- **后端技术栈**：Python 3.10+ FastAPI + PostgreSQL 15 + Redis 7。
- **架构特点**：前端打包为 iOS 原生应用；后端通过 HTTP 短轮询与 Redis 维护心跳无状态交互；前后端完全脱离 Cookie，改用基于 header 的 Authorization Bearer Token 制。

# 已完成的核心工作进度（截至目前）
1. **重构生产环境跨域与鉴权机制**：
   - 因为 iOS Capacitor (WKWebView) 拦截了 `capacitor://localhost` 的跨域 Cookie，我们已废弃了 httponly Cookie 机制。
   - **后端**：已修改 [app/api/auth.py](cci:7://file:///e:/workrooten/Hive/backend/app/api/auth.py:0:0-0:0)，将会把 `access_token` 放在 JSON 响应体返回；修复了 [config.py](cci:7://file:///e:/workrooten/Hive/backend/app/core/config.py:0:0-0:0) 的 CORS 数组解析 Bug 以放行 `capacitor://` 协议。
   - **前端**：已修改 [client.ts](cci:7://file:///e:/workrooten/Hive/frontend/src/api/client.ts:0:0-0:0) 及整个认证流，将 Token 存入 localStorage，并通过统一拦截器向每个请求自动注入 `Authorization: Bearer <token>` 头部；双重保障 `VITE_API_URL` 注入以确保准确指向生产 API `https://hive.merchlens.app`。
2. **解决 Apple 登录 1000 报错**：
   - 发现并创建了 Xcode 缺失的 [App.entitlements](cci:7://file:///e:/workrooten/Hive/frontend/ios/App/App/App.entitlements:0:0-0:0) 文件加入 `com.apple.developer.applesignin` 能力，并已正确配置到 [project.pbxproj](cci:7://file:///e:/workrooten/Hive/frontend/ios/App/App.xcodeproj/project.pbxproj:0:0-0:0) 中。
3. **试用期规则统一**：
   - 将前后端的免费试用期硬编码全部对齐并统一为 **7天**（包含 [ProfilePortal.tsx](cci:7://file:///e:/workrooten/Hive/frontend/src/components/ProfilePortal.tsx:0:0-0:0) 和后端逻辑）。
4. **后端生产环境一键部署跑通**：
   - 完善了基于本地私钥自动免密 SSH 登录的 [deploy_to_server.py](cci:7://file:///e:/workrooten/Hive/deploy_to_server.py:0:0-0:0) 脚本，并实现了停旧容器、清端口、重新构建新容器的 [deploy.sh](cci:7://file:///e:/workrooten/Hive/backend/deploy.sh:0:0-0:0) 安全迭代更新（且严格限制 `HIVE_` 前缀，物理隔离了同服务器的 MerchLens 项目）。

# 当前我们的工作节点（当前状态）
目前最新的前后端代码均已 Commit 并 push 至 Github [main](cci:1://file:///e:/workrooten/Hive/deploy_to_server.py:29:0-86:33) 分支。
后端服务（103.91.219.230 的 `/opt/hive_work`）已经完成最新的拉取和容器重启。
Github Actions 正在/已经自动化打包最新的打包产物。

# 我们这次对话的核心任务（Next Steps）
1. **测试验证**：目前正在等待我（用户）在 iOS 真机或模拟器上安装包含上述所有修复的新包，验证 Apple Sign-In 以及常规注册登录流程是否顺利调通，是否还存在 401 或 CORS 报错。
2. **处理新 Bug（如有）**：根据我稍后提供的最新报错信息或截图，继续排查并修复剩下的任何接口、UI 逻辑或支付（In-App Purchase）问题。
3. **遵守严格规范**：在接下来的每一次代码修改中，你必须：
   - 前端默认函数式组件 + TS；
   - 后端绝对禁止 API 层直接写裸 [except](cci:1://file:///e:/workrooten/Hive/backend/app/main.py:36:0-41:5) 和直接操作 DB 操作（必须经过 Service 层）；
   - 在提出改动建议前必须自行查找项目中类似代码以保持全局规范统一。

请回复“收到”，并等待我提供最新的测试结果反馈。





hive.merchlens.app
https://1103896121-beep.github.io/HIVE/privacy_en.html
https://1103896121-beep.github.io/HIVE/eula_en.html
