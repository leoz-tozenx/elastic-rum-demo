# Elastic RUM Monorepo 最佳实践指南

在 Monorepo (如 Turborepo, Nx, Lerna) 架构中管理多个前端应用的监控，核心在于**“标准化基础配置”**与**“隔离应用上下文”**。

以下是避免相互影响的三个关键策略：

## 1. 核心原则：Service Name 与 Version 的严格匹配

Elastic APM 依赖两个核心字段来关联运行时错误和 Source Map：

- **runtime**: Browser 里的 SDK 初始化参数 `serviceName` + `serviceVersion`。
- **build time**: 上传 Source Map 时的参数 `service_name` + `service_version`。

**规则：**

1.  **Service Name 必须全局唯一**：例如 `my-org-auth`, `my-org-dashboard`。
2.  **Version 必须同步**：构建时的版本必须与运行时注入的版本完全一致（通常使用 CI/CD 的 commit hash 或 `package.json` version）。

## 2. 运行时隔离：封装共享 SDK

不要在每个 App 里重复写 `initApm`。建议在 `packages/monitoring` 中创建一个统一的初始化函数。

```javascript
// packages/monitoring/index.js
import { init as initApm } from "@elastic/apm-rum";

export function initAppMonitoring({ appName, version }) {
  // 1. 强制命名规范
  const serviceName = `my-product-${appName}`;

  // 2. 统一基础配置 (Server URL, Environment)
  const apm = initApm({
    serviceName: serviceName,
    serviceVersion: version,
    serverUrl: import.meta.env.VITE_APM_SERVER_URL || "http://localhost:8200",
    environment: import.meta.env.MODE || "production",
    // 3. 智能判断分布式追踪范围
    distributedTracingOrigins: [
      // 自动包含当前域名的 API
      location.origin,
      // 以及公共网关
      "https://api.my-product.com",
    ],
  });

  return apm;
}
```

**在子应用中使用：**

```javascript
// apps/admin-portal/src/main.js
import { initAppMonitoring } from "@my/monitoring"; // 假设 workspace 别名
import pkg from "../package.json";

initAppMonitoring({
  appName: "admin-portal",
  version: pkg.version,
});
```

## 3. 构建隔离：Source Map 的路径映射 (最容易出错的点)

在 Monorepo 中，子应用通常部署在**不同的路径**（Sub-path）或**不同的子域名**下。Source Map 的上传脚本必须反映这个真实的部署结构。

### 场景 A：子域名部署

- App 1: `https://admin.example.com`
- App 2: `https://shop.example.com`

**上传策略**：`bundle_filepath` 直接使用根路径 `https://admin.example.com`。

### 场景 B：子路径部署 (常见)

- App 1: `https://example.com/admin/`
- App 2: `https://example.com/shop/`

**上传策略**：
上传 `admin` 应用的 Map 时，`bundle_filepath` 必须带上 `/admin` 前缀。
例如文件实际在硬盘是 `dist/assets/main.js`，但浏览器访问是 `https://example.com/admin/assets/main.js`。
那么上传时 `bundle_filepath` 必须是 `https://example.com/admin/assets/main.js`。

如果没加 `/admin`，Elastic 会认为文件在根目录，导致无法匹配报错堆栈中的 URL。

## 4. 动手实操：改造上传脚本

我将帮你更新 `upload-sourcemaps.cjs` 脚本，使其支持命令行参数，这样你可以在 Monorepo 的根目录通过参数调用它。

**使用示例：**

```bash
# 为 app1 上传
node scripts/upload-sourcemaps.cjs --service=app-one --version=1.0.0 --base=https://example.com/app1 --dist=./apps/app1/dist

# 为 app2 上传
node scripts/upload-sourcemaps.cjs --service=app-two --version=2.3.0 --base=https://example.com/app2 --dist=./apps/app2/dist
```
