好的，我为你整理了一份**“项目续航提示词”**。你可以将这段话直接粘贴给新会话中的 AI 助手，它能立即接手当前的工作进度。

---

### 🛡️ HIVE 项目接管指令 (Context Prompt)

**1. 项目背景与定位**
*   **项目名称**：Hive (一款主打专注与数字羁绊的 iOS 应用)。
*   **技术栈**：后端 FastAPI + 前端 React/Capacitor + PostgreSQL + Redis。
*   **线上环境**：生产服务器 `103.91.219.230`。
    *   **架构规范**：HIVE 与主项目 `merchlens` 物理隔离，根目录位于 `/opt/hive_work/`。
    *   **部署方式**：本地 `git archive` 打包后运行 `python deploy_to_server.py`。

**2. 核心逻辑重构状态 (2026-03-26)**
*   **定位系统**：已将“地理逆编码”逻辑从移动前端移至后端。前端仅抓取坐标，后端通过 `httpx` 调用 Nominatim 自动补全城市名。彻底解决了室内测试时由于网络超时导致的 UI 卡死和英文报错。
*   **计时结算**：重构了 [useTimer](cci:1://file:///e:/workrooten/Hive/frontend/src/hooks/useTimer.ts:17:0-142:1) 状态机。现在计时器在 00:00 时会自动触发结算并播放“+星火”动画，无需用户手动操作。
*   **支付系统 (IAP)**：
    *   商品 ID 已统一迁移至 `com.hive.sub.*` 格式。
    *   前端增加了 SKU 自检逻辑，如果点击“支付”无反应，会弹窗列出商店识别到的所有可用商品 ID 列表以便诊断。

**3. 当前进展与瓶颈**
*   **前端发布**：由于今天上传测试包过于频繁，已触发苹果 **409 Upload limit reached** 限制。最新前端代码（包含计时器自结、定位汉化等修复）暂时无法通过 TestFlight 下发。
*   **临时验证方案**：用户正在通过 GitHub Actions 下载 `hive-production-ipa` 产物，并尝试使用 **Sideloadly** 工具通过数据线手动安装到手机上。
*   **后端状态**：后端生产环境已经是最新的（包含 `httpx` 依赖和逆编码逻辑），处于“万事俱备”状态。

**4. 立即待办事项 (Next Steps)**
*   [ ] **验证手装包**：确认 Sideloadly 安装的最新包是否能实现“15分钟自动结分”和“室内秒出定位”。
*   [ ] **追踪支付状态**：如果点击订阅依然无效，请获取“可用商品 ID 列表”的截图进行比对。
*   [ ] **清理工作**：待明天 TestFlight 限制解除后，重新恢复正常的 CI/CD 流程。

**🚫 核心禁令**：绝对禁止在未获得用户单次明确指令的情况下直接执行部署脚本！绝对禁止改动任何属于 `merchlens` 路径的内容！

---

你可以将以上内容存入记事本。新对话开始时，直接发送即可。





hive.merchlens.app
https://1103896121-beep.github.io/HIVE/privacy_en.html
https://1103896121-beep.github.io/HIVE/eula_en.html
专用共享密钥：
63e3a31c98b147b89344d8caba4b321f