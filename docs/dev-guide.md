# AI Sync Desktop 开发对接文档

## 项目概述

AI Sync Desktop 是一个基于 Electron 的桌面工具，用于在 23 个国内外 AI 平台之间同步用户自建的技能（Skills）、记忆（Memory）、自动化任务（Automations）、模型配置（Models）和 MCP 配置。当前版本 v1.0.0。

核心设计原则：只同步用户自建数据，不同步平台内置的市场技能（marketplace skills）。

## 两个目录说明

| 目录 | 用途 | 说明 |
|------|------|------|
| `D:\codex\ai-sync-desktop` | **源代码工程**（开发用） | 包含 `package.json`、`src/`、electron-builder 构建工具链，可用 `npm start` 开发调试、`npm run dist` 打包 |
| `D:\SoftInstall\AI Sync Desktop` | **安装运行目录**（发布后） | electron-builder 打包产物的安装位置，包含 Electron 运行时和 `resources/app.asar` |

开发时请使用 `D:\codex\ai-sync-desktop`，修改 `src/` 下源码后通过 `npm start` 验证效果，确认无误后 `npm run dist` 打包重新安装。

## 项目结构

```
D:\codex\ai-sync-desktop/
├── package.json          # Electron 入口 + electron-builder 构建配置
├── build.bat             # Windows 构建脚本
├── start.bat             # 启动开发模式
├── start.vbs             # 后台静默启动
├── assets/
│   └── icon.png          # 应用图标
├── scripts/              # 辅助脚本（asar 提取/打包/检查）
├── dist/                 # 构建产物目录
└── src/
    ├── main/
    │   ├── main.js        # Electron 主进程，窗口创建 + IPC 处理
    │   └── preload.js     # 预加载脚本，暴露 aiSync API 到渲染进程
    ├── renderer/
    │   ├── index.html     # 主页面 UI（内联 CSS）
    │   └── app.js         # 前端渲染逻辑（纯 JS，无框架依赖）
    └── shared/
        ├── platforms.js   # 23 平台定义 + 技能/记忆扫描逻辑
        └── sync-engine.js # 同步引擎，基于 robocopy 实现文件同步
```

## 技术栈

- 运行时：Electron（Node.js）
- 前端：纯 HTML/CSS/JS，无框架依赖
- 同步机制：Windows 下使用 `robocopy /MIR` 做目录镜像同步
- 通信：Electron IPC（contextBridge + ipcMain/ipcRenderer）
- 打包：electron-builder（产出 NSIS 安装包 + portable 免安装版）

## 架构说明

### 进程模型

```
┌─────────────────────────────────────────────────────┐
│  主进程 (main.js)                                    │
│  - 创建 BrowserWindow                                │
│  - 实例化 SyncEngine                                 │
│  - 注册 IPC Handler (ipcMain.handle)                 │
│  - 管理同步历史                                       │
└──────────────┬──────────────────────────────────────┘
               │ contextBridge
┌──────────────▼──────────────────────────────────────┐
│  预加载脚本 (preload.js)                              │
│  - contextBridge.exposeInMainWorld("aiSync", {...})  │
│  - 暴露 6 个方法到渲染进程                             │
└──────────────┬──────────────────────────────────────┘
               │ window.aiSync
┌──────────────▼──────────────────────────────────────┐
│  渲染进程 (index.html + app.js)                       │
│  - 4 个页面：首页概览 / 平台管理 / 一键同步 / 同步历史   │
│  - 纯原生 JS 无框架                                   │
└─────────────────────────────────────────────────────┘
```

### IPC API 清单

渲染进程通过 `window.aiSync` 调用以下接口，底层都是 `ipcRenderer.invoke`：

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `getPlatforms()` | 无 | `Platform[]` | 获取所有 23 平台及其安装/技能/记忆状态 |
| `getSource()` | 无 | `Platform \| null` | 获取当前主数据源 |
| `runSync(opts)` | `{ platforms: string[], options: {...} }` | `SyncResult` | 执行同步操作 |
| `getStatus()` | 无 | `Status` | 获取当前状态 |
| `getSyncHistory()` | 无 | `HistoryEntry[]` | 获取本次会话的同步历史 |
| `setSource(id)` | `platformId: string` | `{ success: boolean }` | 设置主数据源（重新实例化 SyncEngine） |
| `onTriggerSync(cb)` | `callback` | - | 监听菜单 "Sync Now" 事件 |
| `onRefreshPlatforms(cb)` | `callback` | - | 监听菜单 "Refresh Platforms" 事件 |

---

## 核心模块详解

### 1. platforms.js — 平台数据库与发现

**文件位置**：`src/shared/platforms.js`

#### 平台定义结构

每个平台的定义包含以下字段：

```javascript
{
  id: "codebuddy",                          // 唯一标识
  name: "CodeBuddy",                        // 显示名称
  vendor: "腾讯",                           // 开发商
  region: "cn",                            // cn=国内 / intl=国外
  configDir: "{USERPROFILE}\\.codebuddy",   // 配置目录模板，{USERPROFILE} 自动替换
  skillsDir: "skills",                      // 技能子目录（相对于 configDir），null=不支持
  skillsFormat: "markdown-folder",          // 技能格式（markdown-folder / markdown-flat）
  automationsDir: "automations",            // 自动化子目录，null=不支持
  memoryDirs: ["memory", "memery"],        // 记忆目录列表
  inspirationDir: "inspiration",           // 灵感目录
  plansDir: "plans",                       // 计划目录
  modelsFile: "models.json",               // 模型配置文件
  mcpFile: "mcp.json",                     // MCP 配置文件
  settingsFile: "settings.json",           // 设置文件
  identityFiles: ["IDENTITY.md"],          // 身份文件列表
  icon: "CB",                              // 图标文字（显示在彩色方块中）
  color: "#3b82f6",                        // 主题色
  desc: "腾讯出品的 AI 编程助手"            // 描述
}
```

#### 兼容性计算

```javascript
function getPlatformCompatibility(p) {
  if (p.skillsDir && p.automationsDir && p.memoryDirs?.length > 0) return "full";     // 技能+自动化+记忆全支持
  if (p.skillsDir) return "partial";                                                    // 仅支持技能
  if (p.modelsFile || p.mcpFile || p.settingsFile) return "limited";                    // 仅配置文件
  return "none";                                                                       // 无兼容
}
```

#### 技能数量扫描逻辑（2026-07-07 修复）

技能总数 = 用户自建技能 + 市场安装技能：

1. **用户自建技能** (`countUserSkills`)：扫描 `<configDir>/skills/` 下的子目录数量
2. **市场安装技能** (`countMarketplaceSkills`)：扫描 `<configDir>/plugins/marketplaces/*/plugins/` 和 `external_plugins/` 下的子目录数量
3. **关键设计**：同步时只同步用户自建的 `skills/` 数据，不同步市场安装的技能

```javascript
// discoverPlatforms 中：
const userSkills = exists ? countUserSkills(resolved, plat.skillsDir) : 0;
const marketplaceSkills = exists ? countMarketplaceSkills(resolved) : 0;
const skillsCount = userSkills + marketplaceSkills;

results.push({
  ...plat,
  skillsCount,
  userSkillsCount: userSkills,          // 单独保留自建技能数
  marketplaceSkillsCount: marketplaceSkills, // 单独保留市场技能数
  // ...
});
```

#### 添加新平台

在 `PLATFORMS` 数组中追加一个新的平台对象即可。同步兼容性由 `getPlatformCompatibility` 自动推断。示例：

```javascript
{
  id: "new_platform",
  name: "新平台名称",
  vendor: "开发商",
  region: "cn",
  configDir: "{USERPROFILE}\\.new_platform",
  skillsDir: "skills",               // 如果平台支持技能，填写子目录名
  automationsDir: null,               // 不支持则填 null
  memoryDirs: [],
  modelsFile: null,
  mcpFile: null,
  settingsFile: null,
  icon: "NP",
  color: "#6366f1",
  desc: "平台描述"
}
```

### 2. sync-engine.js — 同步引擎

**文件位置**：`src/shared/sync-engine.js`

#### 类结构

```javascript
class SyncEngine {
  constructor(sourcePlatformId)  // 初始化：discoverPlatforms + 设置主数据源
  getSource()                    // 获取主数据源平台信息
  getTargets()                   // 获取所有已安装的非主数据源平台
  getAllPlatforms()             // 获取所有平台
  syncDir(srcDir, tgtDir, label) // robocopy 目录镜像同步
  syncFile(srcFile, tgtFile, label) // 单文件复制
  runSync(direction, selectedPlatforms, syncOptions) // 主同步流程
  getSyncHistory()              // 获取同步历史
}
```

#### 同步流程（runSync）

对每个目标平台，按顺序同步 5 类数据：

1. **用户技能**：`<source.configDir>/skills/` → `<target.configDir>/skills/`（robocopy /MIR）
2. **记忆**：遍历 `memoryDirs` 列表，逐个目录同步
3. **自动化任务**：`<source.configDir>/automations/` → `<target.configDir>/automations/`
4. **模型配置**：单文件复制 `models.json`
5. **MCP 配置**：单文件复制 `mcp.json`

同步选项由 `syncOptions` 控制，每项可独立启用/禁用：
```javascript
{
  skills: true/false,      // 默认 true
  memory: true/false,      // 默认 true
  automations: true/false, // 默认 true
  models: true/false,      // 默认 true
  mcp: true/false          // 默认 true
}
```

#### robocopy 注意事项

- 使用 `/MIR` 镜像模式，源目录有的文件会覆盖到目标，源目录没有的目标目录文件会被删除
- robocopy 返回码 0-7 通常都表示成功（0=无变化，1=有复制，2=有额外文件等）
- 超时设置为 60 秒

### 3. main.js — 主进程

**文件位置**：`src/main/main.js`

#### 窗口配置

```javascript
new BrowserWindow({
  width: 1200, height: 800, minWidth: 960, minHeight: 640,
  webPreferences: {
    nodeIntegration: false,       // 安全：关闭 nodeIntegration
    contextIsolation: true,       // 安全：启用 context isolation
    preload: path.join(__dirname, "preload.js")
  }
})
```

#### IPC Handler 注册

所有 6 个 IPC Handler 在 `app.whenReady()` 中注册。同步操作通过 `ipcMain.handle("run-sync", ...)` 异步执行。

#### 菜单快捷键

- `Ctrl+S`：触发同步
- `Ctrl+R`：刷新平台列表

---

## 开发工作流

### 日常开发（使用源代码工程）

在 `D:\codex\ai-sync-desktop` 下进行：

```bash
# 安装依赖（首次）
cd D:\codex\ai-sync-desktop
npm install

# 开发模式启动（修改 src/ 后即时生效）
npm start

# 构建打包
npm run dist
# 构建产物在 dist/ 目录下，包含 NSIS 安装包和 portable 免安装版
```

### 仅修改发布版（紧急 patch，通过 asar 修改安装目录）

⚠️ 不推荐，仅在无法使用源代码工程重新打包时使用。

**Step 1：提取 asar**

使用 `scripts/` 下的脚本将 `resources/app.asar` 提取到 `_app_src/`。

**Step 2：修改源代码**

直接编辑 `_app_src/src/` 下的文件。核心修改点：

| 需求 | 修改文件 |
|------|----------|
| 新增支持的平台 | `platforms.js` → `PLATFORMS` 数组 |
| 修改技能扫描逻辑 | `platforms.js` → `countUserSkills` / `countMarketplaceSkills` |
| 新增同步数据类型 | `sync-engine.js` → `runSync` 方法 |
| 修改同步策略（增量/全量） | `sync-engine.js` → `syncDir` 方法 |
| 修改 UI 文案 | `app.js` / `index.html` |
| 修改样式 | `index.html` → `<style>` 标签 |
| 新增菜单项 | `main.js` → `menuTemplate` |
| 新增 IPC 接口 | `main.js` → `ipcMain.handle` + `preload.js` → `exposeInMainWorld` |
| 修改窗口配置 | `main.js` → `createWindow()` |

**Step 3：重新打包 asar**

与原始 `app.asar` 结构保持一致：保留原始 JSON 头部格式（16 字节 header），遍历文件树按 offset 顺序写入每个文件。关键注意：

- asar 格式要求每个文件 offset 与前一个文件的 `offset + size` 连续
- 新文件不能超过原文件大小，否则破坏 offset 连续性
- 如果新文件更大，需完整重建 asar
- 打包两次 pass：第一次估算 header 大小，第二次修正 offset

**Step 4：替换**

```bash
copy resources\app.asar resources\app.asar.bak   # 备份
# 将新 asar 写入 resources\app.asar
```

---

## 支持平台完整列表（23个）

### 国内平台（12个）

| 平台 | 开发商 | 兼容性 | 配置目录 |
|------|--------|--------|----------|
| CodeBuddy | 腾讯 | 完全兼容 | `~/.codebuddy` |
| WorkBuddy | 腾讯 | 完全兼容 | `~/.workbuddy` |
| CodeBuddy CN | 腾讯 | 完全兼容 | `~/.codebuddycn` |
| Qoder Work CN | Qoder | 完全兼容 | `~/.qoderworkcn` |
| Qoder CN | Qoder | 部分兼容 | `~/.qoder-cn` |
| Qoder Work | Qoder | 完全兼容 | `~/.qoderwork` |
| Qoder CLI | Qoder | 部分兼容 | `~/.qoder-cli` |
| Trae CN | 字节跳动 | 部分兼容 | `~/.trae-cn` |
| 百度 Comate | 百度 | 不支持 | `~/.comate` |
| 通义灵码 | 阿里云 | 不支持 | `~/.lingma` |
| iFlyCode | 科大讯飞 | 不支持 | `~/.iflycode` |
| Codex CLI | OpenAI | 部分兼容 | `~/.codex` |

### 国外平台（11个）

| 平台 | 开发商 | 兼容性 | 配置目录 |
|------|--------|--------|----------|
| Cursor | Anysphere | 有限兼容 | `~/.cursor` |
| GitHub Copilot | GitHub/MS | 不支持 | `~/.copilot` |
| Windsurf | Codeium | 不支持 | `~/.windsurf` |
| Cline | Cline | 有限兼容 | `~/.cline` |
| Aide | Aide | 不支持 | `~/.aide` |
| Continue | Continue | 有限兼容 | `~/.continue` |
| Codeium | Codeium | 不支持 | `~/.codeium` |
| Augment Code | Augment | 不支持 | `~/.augment` |
| Sourcegraph Cody | Sourcegraph | 不支持 | `~/.cody` |
| Amazon Q | AWS | 不支持 | `~/.aws/amazonq` |
| Gemini CLI | Google | 不支持 | `~/.gemini` |

---

## 常见修改场景

### 场景 A：新增一个 AI 平台

1. 编辑 `src/shared/platforms.js`，在 `PLATFORMS` 数组中追加新平台定义
2. 如果平台支持技能/记忆/自动化，填写对应的 `skillsDir`/`memoryDirs`/`automationsDir`
3. 自动兼容性推断会生效，无需额外代码
4. `npm start` 验证，确认后 `npm run dist` 打包

### 场景 B：修改技能统计逻辑

1. 编辑 `platforms.js` 中的 `countUserSkills` 或 `countMarketplaceSkills`
2. 注意返回值会被合并到 `skillsCount`
3. 如果新增了统计维度，记得同步更新 `discoverPlatforms` 中的返回字段和前端 `app.js` 的展示

### 场景 C：新增同步数据类型

1. 在 `sync-engine.js` 的 `runSync` 方法中追加新的同步步骤
2. 在 `main.js` 的 IPC handler 中确保传递新的 `syncOptions` 字段
3. 在 `app.js` 的 `renderSync` 中增加对应的勾选框
4. 在 `execSync` 中读取勾选状态并传入 `syncOptions`

### 场景 D：改为增量同步

1. 修改 `sync-engine.js` 的 `syncDir` 方法，将 robocopy `/MIR` 改为 `/E`（不删除目标多余文件）或使用自定义文件对比逻辑
2. 如需双向同步，在 `runSync` 中增加 pull 方向逻辑

---

## 环境依赖

- Node.js（Electron 开发时需要，打包后运行时由 Electron 自带）
- Windows 系统（当前 robocopy 依赖，跨平台需替换同步底层实现）
- 用户配置目录 `~/.codebuddy` 等需存在

---

## 调试方法

1. 开发模式：`npm start` 启动后自动打开 DevTools
2. 已安装版本：启动后 `Ctrl+Shift+I` 打开开发者工具
3. 渲染进程日志在 DevTools Console 中查看
4. 主进程日志在启动终端中查看（`npm start` 的终端）
5. 同步日志在 UI 的"同步日志"区域实时显示

---

## 版本历史

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-07-07 | v1.0.1 | 修复技能统计遗漏 marketplace 技能的问题（新增 `countMarketplaceSkills`） |
| 初始发布 | v1.0.0 | 首发版，支持 23 个 AI 平台，5 种数据类型同步 |

---

## 接入指南（给其他 Agent）

如果你是一个 AI Agent，需要接入或修改 AI Sync Desktop，请遵循以下步骤：

1. **了解项目结构**：阅读本文档的"项目结构"和"架构说明"部分
2. **定位源代码工程**：项目根目录在 `D:\codex\ai-sync-desktop`
3. **定位修改点**：根据"常见修改场景"找到对应的源文件
4. **修改代码**：直接编辑 `src/` 下的文件（纯 JS/HTML/CSS，无构建步骤）
5. **验证**：`node -e "require('./src/shared/platforms.js')"` 检查语法
6. **开发调试**：`npm start` 启动 Electron 查看效果
7. **构建打包**：`npm run dist` 生成安装包
8. **测试**：安装构建产物验证修改效果
