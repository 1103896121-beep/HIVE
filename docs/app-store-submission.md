# Hive App Store 提交流程指南

由于 iOS 应用的最终打包和上架必须在 macOS 环境中通过 Xcode 完成，请您按照以下步骤进行操作：

## 1. 准备工作
- **macOS 设备**：安装了最新版本的 Xcode。
- **Apple Developer 账号**：已支付年费的开发者账号。
- **源代码**：将本项目代码（`frontend` 目录）同步到您的 Mac 上。

## 2. 环境初始化 (在 Mac 上执行)
打开终端，进入 `frontend` 目录：
```bash
# 安装依赖
npm install

# 安装 Capacitor iOS 平台
npx cap add ios
```

## 3. 同步前端构建产物
在您的 Windows 开发机上，我已经为您生成了 `dist` 目录。请确保 Mac 上的 `frontend/dist` 目录也包含最新的构建文件，然后运行：
```bash
npx cap sync ios
```

## 4. Xcode 打包与发布
1.  **打开项目**：运行 `npx cap open ios`，这将自动启动 Xcode 并打开项目。
2.  **配置签名**：
    *   在 Xcode 中选择项目根目录（Hive）。
    *   在 "Signing & Capabilities" 标签页中，选择您的团队 (Team)。
    *   确认 Bundle Identifier 为 `com.antigravity.hive`。
3.  **App Store Connect 设置**：
    *   登录 [App Store Connect](https://appstoreconnect.apple.com/)。
    *   创建一个新 App，填写名称、套装 ID (Bundle ID) 等信息。
4.  **上传构建版本**：
    *   在 Xcode 顶部菜单选择 "Any iOS Device (arm64)" 作为目标。
    *   选择 `Product` -> `Archive`。
    *   编译完成后，在弹出的窗口中选择 "Distribute App" -> "App Store Connect" -> "Upload"。

## 5. 提交审核
在 App Store Connect 中：
- 填写 App 详细信息（名称、描述、关键词）。
- 上传预览图和截图（可以使用我为您截取的演示截图作为参考）。
- 在“版权归属”和“隐私政策”中填写我们在 `frontend/public` 中准备好的 URL（或直接上传文字）。
- 提交以供审核。

---
> [!TIP]
> 如果您在打包过程中遇到任何 CocoaPods 或依赖错误，请尝试在 `frontend/ios/App` 目录下运行 `pod install`。
