1. 项目概况 (Project Profile)
应用名称：Hive (沉浸式自习/社交 iOS App)
技术栈：
前端：React + TypeScript + Capacitor (iOS 原生插件：CdvPurchase v13, Geolocation)
后端：Python (FastAPI) + PostgreSQL + Redis
部署：Docker-compose (103.91.xx 生产服务器)
GitHub 仓库：https://github.com/1103896121-beep/HIVE.git (分支: 
main
)
2. 当前进度与已解决的核心问题 (Current Progress)
截止 2026-03-27，已完成 Round 6 生产环境紧急修复：

订阅幂等化：后端通过 
ProcessedTransaction
 记录 Apple transaction_id，实现了顺延累加算法，解决了“天数虚高”和“7+30=37”计算逻辑。
账号注销：实装了级联清理逻辑（清理 Sessions, Bonds, Blocks 等 8 个表），解决了注销时的外键 500 报错。
支付 UX：解决了 "Waiting for App Store" 圈圈卡死。增加了 60s 强制释放及恢复购买的防抖弹窗。
地理位置：实现了静默后台同步，彻底移除所有 UI 弹窗干扰，具备 10s 熔断。
永久会员：当前天数判定逻辑为 > 10000 天。UI 统一显示“终身会员”，已屏蔽数字显示。
3. 未竟工作与关注点 (Pending & Focus)
CI/CD 监控：每次推送 GitHub 
main
 需监控 Build & Export iOS IPA 的构建结果及 TestFlight 分发。
性能监控：由于后端地理位置采用逆地理编码（Nominatim），需关注并发量大时的 API 响应速度。
安全性：APPLE_SHARED_SECRET 等敏感秘钥已配置在容器环境变量中。
4. 业务偏好与原则 (Principles)
静默优先：除非用户主动操作失败，否则严禁使用弹窗 (Alert) 干扰流程。
权衡天数：付费订阅严格衔接在试用期之后。
安全第一：涉及用户删除、隐私地址解析等操作必须在 backend 稳妥处理。
接力指令：

"你好，我是 Hive 项目的负责人。目前项目处于 Round 6 修复后的线上运行阶段。请根据 
walkthrough.md
 和 
task.md
 的记录，继续协助我进行后续的功能迭代与稳定性监控。当前重点关注 TestFlight 最新版本的用户反馈。"





hive.merchlens.app
https://1103896121-beep.github.io/HIVE/privacy_en.html
https://1103896121-beep.github.io/HIVE/eula_en.html
专用共享密钥：
63e3a31c98b147b89344d8caba4b321f

根据E:\workrooten\Hive\docs中的HIVE_线上服务架构.md和生产环境.md  的要求去做，不要碰任何merchlens项目的东西

把最新的后端代码，根据上面的文档要求，提交到后端服务器进行覆盖更新，记住不要动任何merchlens项目的东西