// AI Sync Desktop — 平台数据库 + 自动发现
// 只统计用户自建技能（skills/），不统计平台内置市场技能（skills-marketplace/）
// 同步时也只同步用户级数据，不动平台内置资源

const fs = require("fs");
const path = require("path");

const PLATFORMS = [
  // ====== 国内 ======
  {
    id: "codebuddy", name: "CodeBuddy", vendor: "腾讯", region: "cn",
    configDir: "{USERPROFILE}\\.codebuddy",
    skillsDir: "skills",
    skillsFormat: "markdown-folder",
    automationsDir: "automations",
    memoryDirs: ["memory", "memery"],
    inspirationDir: "inspiration",
    plansDir: "plans",
    modelsFile: "models.json", mcpFile: "mcp.json", settingsFile: "settings.json",
    identityFiles: ["IDENTITY.md", "USER.md", "SOUL.md"],
    icon: "CB", color: "#3b82f6",
    desc: "腾讯出品的 AI 编程助手"
  },
  {
    id: "workbuddy", name: "WorkBuddy", vendor: "腾讯", region: "cn",
    configDir: "{USERPROFILE}\\.workbuddy",
    skillsDir: "skills",
    skillsFormat: "markdown-folder",
    automationsDir: "automations",
    memoryDirs: ["memory", "memery"],
    inspirationDir: "inspiration",
    plansDir: "plans",
    modelsFile: "models.json", mcpFile: "mcp.json", settingsFile: "settings.json",
    icon: "WB", color: "#10b981",
    desc: "腾讯出品的 AI 工作助手"
  },
  {
    id: "codebuddycn", name: "CodeBuddy CN", vendor: "腾讯", region: "cn",
    configDir: "{USERPROFILE}\\.codebuddycn",
    skillsDir: "skills",
    skillsFormat: "markdown-folder",
    automationsDir: "automations",
    memoryDirs: ["memory", "memery"],
    inspirationDir: "inspiration",
    plansDir: "plans",
    modelsFile: "models.json", mcpFile: "mcp.json", settingsFile: "settings.json",
    icon: "CN", color: "#3b82f6",
    desc: "CodeBuddy 国内版"
  },
  {
    id: "codex", name: "Codex CLI", vendor: "OpenAI", region: "intl",
    configDir: "{USERPROFILE}\\.codex",
    skillsDir: "skills",
    skillsFormat: "markdown-flat",
    automationsDir: null,
    memoryDirs: [],
    inspirationDir: null, plansDir: null,
    modelsFile: null, mcpFile: null, settingsFile: "config.toml",
    icon: "CX", color: "#000000",
    desc: "OpenAI 出品的终端 AI 编程工具"
  },
  {
    id: "trae_cn", name: "Trae CN", vendor: "字节跳动", region: "cn",
    configDir: "{USERPROFILE}\\.trae-cn",
    skillsDir: "builtin_skills",
    skillsFormat: "markdown-folder",
    automationsDir: null,
    memoryDirs: [],
    inspirationDir: null, plansDir: null,
    modelsFile: null, mcpFile: null, settingsFile: "skill-config.json",
    icon: "TR", color: "#8b5cf6",
    desc: "字节跳动出品的 AI IDE"
  },
  {
    id: "qoderwork_cn", name: "Qoder Work CN", vendor: "Qoder", region: "cn",
    configDir: "{USERPROFILE}\\.qoderworkcn",
    skillsDir: "skills",
    skillsFormat: "markdown-folder",
    automationsDir: "automations",
    memoryDirs: ["memory", "memery"],
    inspirationDir: "inspiration",
    plansDir: "plans",
    modelsFile: "models.json", mcpFile: "mcp.json", settingsFile: "settings.json",
    icon: "QW", color: "#f59e0b",
    desc: "Qoder 工作版"
  },
  {
    id: "qoder_cli", name: "Qoder CLI", vendor: "Qoder", region: "cn",
    configDir: "{USERPROFILE}\\.qoder-cli",
    skillsDir: "skills",
    skillsFormat: "markdown-folder",
    automationsDir: "automations",
    memoryDirs: [],
    inspirationDir: null, plansDir: null,
    modelsFile: "models.json", mcpFile: null, settingsFile: null,
    icon: "QC", color: "#eab308",
    desc: "Qoder 命令行版"
  },
  {
    id: "qoder_cn", name: "Qoder CN", vendor: "Qoder", region: "cn",
    configDir: "{USERPROFILE}\\.qoder-cn",
    skillsDir: "skills",
    skillsFormat: "markdown-folder",
    automationsDir: "automations",
    memoryDirs: [],
    inspirationDir: null, plansDir: null,
    modelsFile: "models.json", mcpFile: null, settingsFile: null,
    icon: "QD", color: "#eab308",
    desc: "Qoder 桌面版"
  },
  {
    id: "qoder_work", name: "Qoder Work", vendor: "Qoder", region: "cn",
    configDir: "{USERPROFILE}\\.qoderwork",
    skillsDir: "skills",
    skillsFormat: "markdown-folder",
    automationsDir: "automations",
    memoryDirs: ["memory", "memery"],
    inspirationDir: "inspiration", plansDir: "plans",
    modelsFile: "models.json", mcpFile: null, settingsFile: null,
    icon: "QF", color: "#f59e0b",
    desc: "Qoder Work 标准版"
  },
  {
    id: "comate", name: "百度 Comate", vendor: "百度", region: "cn",
    configDir: "{USERPROFILE}\\.comate",
    skillsDir: null, skillsFormat: null,
    automationsDir: null, memoryDirs: [],
    inspirationDir: null, plansDir: null,
    modelsFile: null, mcpFile: null, settingsFile: null,
    icon: "BC", color: "#ef4444", desc: "百度出品的 AI 编程助手"
  },
  {
    id: "lingma", name: "通义灵码", vendor: "阿里云", region: "cn",
    configDir: "{USERPROFILE}\\.lingma",
    skillsDir: null, skillsFormat: null,
    automationsDir: null, memoryDirs: [],
    inspirationDir: null, plansDir: null,
    modelsFile: null, mcpFile: null, settingsFile: null,
    icon: "TL", color: "#f97316", desc: "阿里云出品的 AI 编程助手"
  },
  {
    id: "iflycode", name: "iFlyCode", vendor: "科大讯飞", region: "cn",
    configDir: "{USERPROFILE}\\.iflycode",
    skillsDir: null, skillsFormat: null,
    automationsDir: null, memoryDirs: [],
    inspirationDir: null, plansDir: null,
    modelsFile: null, mcpFile: null, settingsFile: null,
    icon: "IF", color: "#06b6d4", desc: "科大讯飞出品的 AI 编程助手"
  },
  // ====== 国外 ======
  {
    id: "cursor", name: "Cursor", vendor: "Anysphere", region: "intl",
    configDir: "{USERPROFILE}\\.cursor",
    skillsDir: null, skillsFormat: null,
    automationsDir: null, memoryDirs: [],
    inspirationDir: null, plansDir: null,
    modelsFile: null, mcpFile: "{USERPROFILE}\\.cursor\\mcp.json", settingsFile: null,
    icon: "CS", color: "#6366f1", desc: "国外最流行的 AI IDE"
  },
  {
    id: "copilot", name: "GitHub Copilot", vendor: "GitHub/Microsoft", region: "intl",
    configDir: "{USERPROFILE}\\.copilot",
    skillsDir: null, skillsFormat: null,
    automationsDir: null, memoryDirs: [],
    inspirationDir: null, plansDir: null,
    modelsFile: null, mcpFile: null, settingsFile: null,
    icon: "GH", color: "#6b7280", desc: "GitHub Copilot"
  },
  {
    id: "windsurf", name: "Windsurf", vendor: "Codeium", region: "intl",
    configDir: "{USERPROFILE}\\.windsurf",
    skillsDir: null, skillsFormat: null,
    automationsDir: null, memoryDirs: [],
    inspirationDir: null, plansDir: null,
    modelsFile: null, mcpFile: null, settingsFile: null,
    icon: "WF", color: "#0891b2", desc: "Codeium 出品的 AI IDE"
  },
  {
    id: "cline", name: "Cline", vendor: "Cline", region: "intl",
    configDir: "{USERPROFILE}\\.cline",
    skillsDir: null, skillsFormat: null,
    automationsDir: null, memoryDirs: [],
    inspirationDir: null, plansDir: null,
    modelsFile: null, mcpFile: "{USERPROFILE}\\.cline\\mcp_settings.json", settingsFile: null,
    icon: "CL", color: "#d946ef", desc: "VS Code 扩展 AI 助手"
  },
  {
    id: "aide", name: "Aide", vendor: "Aide", region: "intl",
    configDir: "{USERPROFILE}\\.aide",
    skillsDir: null, skillsFormat: null,
    automationsDir: null, memoryDirs: [],
    inspirationDir: null, plansDir: null,
    modelsFile: null, mcpFile: null, settingsFile: null,
    icon: "AI", color: "#14b8a6", desc: "开源的 AI 编程助手"
  },
  {
    id: "continue", name: "Continue", vendor: "Continue", region: "intl",
    configDir: "{USERPROFILE}\\.continue",
    skillsDir: null, skillsFormat: null,
    automationsDir: null, memoryDirs: [],
    inspirationDir: null, plansDir: null,
    modelsFile: null, mcpFile: null, settingsFile: "{USERPROFILE}\\.continue\\config.json",
    icon: "CT", color: "#84cc16", desc: "开源的 AI 代码助手"
  },
  {
    id: "codeium", name: "Codeium", vendor: "Codeium", region: "intl",
    configDir: "{USERPROFILE}\\.codeium",
    skillsDir: null, skillsFormat: null,
    automationsDir: null, memoryDirs: [],
    inspirationDir: null, plansDir: null,
    modelsFile: null, mcpFile: null, settingsFile: null,
    icon: "CI", color: "#a855f7", desc: "Codeium AI 代码补全引擎"
  },
  {
    id: "augment", name: "Augment Code", vendor: "Augment", region: "intl",
    configDir: "{USERPROFILE}\\.augment",
    skillsDir: null, skillsFormat: null,
    automationsDir: null, memoryDirs: [],
    inspirationDir: null, plansDir: null,
    modelsFile: null, mcpFile: null, settingsFile: null,
    icon: "AG", color: "#ec4899", desc: "Augment AI 编程助手"
  },
  {
    id: "cody", name: "Sourcegraph Cody", vendor: "Sourcegraph", region: "intl",
    configDir: "{USERPROFILE}\\.cody",
    skillsDir: null, skillsFormat: null,
    automationsDir: null, memoryDirs: [],
    inspirationDir: null, plansDir: null,
    modelsFile: null, mcpFile: null, settingsFile: null,
    icon: "CD", color: "#f97316", desc: "Sourcegraph AI 代码助手"
  },
  {
    id: "amazonq", name: "Amazon Q", vendor: "AWS", region: "intl",
    configDir: "{USERPROFILE}\\.aws\\amazonq",
    skillsDir: null, skillsFormat: null,
    automationsDir: null, memoryDirs: [],
    inspirationDir: null, plansDir: null,
    modelsFile: null, mcpFile: null, settingsFile: null,
    icon: "AQ", color: "#f97316", desc: "AWS AI 开发助手"
  },
  {
    id: "gemini_cli", name: "Gemini CLI", vendor: "Google", region: "intl",
    configDir: "{USERPROFILE}\\.gemini",
    skillsDir: null, skillsFormat: null,
    automationsDir: null, memoryDirs: [],
    inspirationDir: null, plansDir: null,
    modelsFile: null, mcpFile: null, settingsFile: null,
    icon: "GM", color: "#4285f4", desc: "Google Gemini CLI 编程工具"
  }
];

const COMPATIBILITY = {
  full: { label: "完全兼容", color: "#16a34a", desc: "技能/记忆/自动化/模型 全量同步" },
  partial: { label: "部分兼容", color: "#d97706", desc: "技能可同步，其他部分支持" },
  limited: { label: "有限兼容", color: "#dc2626", desc: "仅配置文件可同步" },
  none: { label: "不支持", color: "#71717a", desc: "不支持技能同步" }
};

function getPlatformCompatibility(p) {
  if (p.skillsDir && p.automationsDir && p.memoryDirs && p.memoryDirs.length > 0) return "full";
  if (p.skillsDir) return "partial";
  if (p.modelsFile || p.mcpFile || p.settingsFile) return "limited";
  return "none";
}

function resolvePath(template) {
  if (!template) return null;
  return template.replace(/\{USERPROFILE\}/g, process.env.USERPROFILE || "~");
}

// 统计用户自建技能数量（只看 skills/ 目录，不看 skills-marketplace/）
function countUserSkills(resolvedDir, skillsDir) {
  if (!resolvedDir || !skillsDir) return 0;
  const fullDir = path.join(resolvedDir, skillsDir);
  if (!fs.existsSync(fullDir)) return 0;
  try {
    return fs.readdirSync(fullDir, { withFileTypes: true })
      .filter(e => !e.name.startsWith(".") && e.isDirectory()).length;
  } catch { return 0; }
}

// 统计市场安装技能数量
// 扫描 <configDir>/plugins/marketplaces/*/plugins/ 和 external_plugins/ 下的子目录
function countMarketplaceSkills(resolvedDir) {
  if (!resolvedDir) return 0;
  let count = 0;
  const marketplacesDir = path.join(resolvedDir, "plugins", "marketplaces");
  if (!fs.existsSync(marketplacesDir)) return 0;
  try {
    const marketplaces = fs.readdirSync(marketplacesDir, { withFileTypes: true })
      .filter(e => e.isDirectory() && !e.name.startsWith("."));
    for (const mp of marketplaces) {
      // 扫描 <marketplace>/plugins/ 目录
      const pluginsDir = path.join(marketplacesDir, mp.name, "plugins");
      if (fs.existsSync(pluginsDir)) {
        try {
          count += fs.readdirSync(pluginsDir, { withFileTypes: true })
            .filter(e => e.isDirectory() && !e.name.startsWith(".")).length;
        } catch {}
      }
      // 扫描 <marketplace>/external_plugins/ 目录
      const extDir = path.join(marketplacesDir, mp.name, "external_plugins");
      if (fs.existsSync(extDir)) {
        try {
          count += fs.readdirSync(extDir, { withFileTypes: true })
            .filter(e => e.isDirectory() && !e.name.startsWith(".")).length;
        } catch {}
      }
    }
  } catch { return 0; }
  return count;
}

// 统计记忆文件数量
function countMemoryFiles(resolvedDir, memoryDirs) {
  if (!resolvedDir || !memoryDirs) return 0;
  let count = 0;
  for (const dir of memoryDirs) {
    const fullDir = path.join(resolvedDir, dir);
    if (fs.existsSync(fullDir)) {
      try {
        count += fs.readdirSync(fullDir).filter(f => !f.startsWith(".") && f.endsWith(".md")).length;
      } catch {}
    }
  }
  return count;
}

// 统计自动化任务数量
function countAutomations(resolvedDir, automationsDir) {
  if (!resolvedDir || !automationsDir) return 0;
  const fullDir = path.join(resolvedDir, automationsDir);
  if (!fs.existsSync(fullDir)) return 0;
  try {
    return fs.readdirSync(fullDir, { withFileTypes: true })
      .filter(e => !e.name.startsWith(".") && e.isDirectory()).length;
  } catch { return 0; }
}

function discoverPlatforms() {
  const results = [];
  for (const plat of PLATFORMS) {
    const resolved = resolvePath(plat.configDir);
    const exists = fs.existsSync(resolved);
    const userSkillsCount = exists ? countUserSkills(resolved, plat.skillsDir) : 0;
    const marketplaceSkillsCount = exists ? countMarketplaceSkills(resolved) : 0;
    const skillsCount = userSkillsCount + marketplaceSkillsCount;
    const memoryCount = exists ? countMemoryFiles(resolved, plat.memoryDirs) : 0;
    const automationsCount = exists ? countAutomations(resolved, plat.automationsDir) : 0;
    const compat = getPlatformCompatibility(plat);

    results.push({
      ...plat,
      resolvedDir: resolved,
      installed: exists,
      skillsCount,
      userSkillsCount,
      marketplaceSkillsCount,
      memoryCount,
      automationsCount,
      compatibility: compat,
      compatInfo: COMPATIBILITY[compat]
    });
  }
  return results;
}

module.exports = { PLATFORMS, COMPATIBILITY, getPlatformCompatibility, resolvePath, discoverPlatforms };
