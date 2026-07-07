// AI Sync Engine — 只同步用户自建的数据
// 不同步平台内置的 skills-marketplace/ 等资源
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { discoverPlatforms, resolvePath } = require("./platforms");

class SyncEngine {
  constructor(sourcePlatformId = "codebuddy") {
    this.sourceId = sourcePlatformId;
    this.platforms = discoverPlatforms();
    this.logs = [];
    this.syncHistory = [];
  }

  getSource() { return this.platforms.find(p => p.id === this.sourceId); }
  getTargets() { return this.platforms.filter(p => p.id !== this.sourceId && p.installed); }
  getAllPlatforms() { return this.platforms; }

  syncDir(srcDir, tgtDir, label) {
    if (!fs.existsSync(srcDir)) return { success: false, reason: "源目录不存在", label };
    if (!fs.existsSync(tgtDir)) fs.mkdirSync(tgtDir, { recursive: true });
    try {
      execSync(`robocopy "${srcDir}" "${tgtDir}" /MIR /NJH /NJS /NP /NDL /R:1 /W:1`, { timeout: 60000, stdio: "pipe" });
      return { success: true, label };
    } catch (e) {
      return (e.status && e.status < 8) ? { success: true, label } : { success: false, reason: e.message, label };
    }
  }

  syncFile(srcFile, tgtFile, label) {
    if (!fs.existsSync(srcFile)) return { success: false, reason: "源文件不存在", label };
    const dir = path.dirname(tgtFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    try { fs.copyFileSync(srcFile, tgtFile); return { success: true, label }; }
    catch (e) { return { success: false, reason: e.message, label }; }
  }

  async runSync(direction = "push", selectedPlatforms = null, syncOptions = {}) {
    this.logs = [];
    const source = this.getSource();
    if (!source || !source.installed) return { success: false, error: "主数据源未安装", logs: [] };

    const targets = selectedPlatforms || this.getTargets();
    const results = [];
    const log = (level, msg) => { this.logs.push({ time: new Date().toISOString(), level, msg }); };

    log("INFO", `开始同步：${source.name} → ${targets.length} 个平台`);
    log("INFO", `同步选项：技能=${syncOptions.skills!==false}, 记忆=${syncOptions.memory!==false}, 自动化=${syncOptions.automations!==false}, 模型=${syncOptions.models!==false}`);

    for (const target of targets) {
      log("INFO", `正在同步到 ${target.name}...`);

      // 1. 用户技能 (skills/)
      if (syncOptions.skills !== false && source.skillsDir && target.skillsDir) {
        const r = this.syncDir(
          path.join(resolvePath(source.configDir), source.skillsDir),
          path.join(resolvePath(target.configDir), target.skillsDir),
          `${target.name}/技能`
        );
        results.push({ platform: target.name, item: "技能", ...r });
        log(r.success ? "OK" : "ERROR", `${target.name}/技能: ${r.success ? "✅ 已同步" : r.reason}`);
      }

      // 2. 记忆 (memory/ 和 memery/ 都同步)
      if (syncOptions.memory !== false && source.memoryDirs && target.memoryDirs) {
        for (const memDir of source.memoryDirs) {
          const srcMemDir = path.join(resolvePath(source.configDir), memDir);
          if (!fs.existsSync(srcMemDir)) continue;
          // 找到目标平台对应的记忆目录
          const tgtMemDir = target.memoryDirs.find(d => d === memDir) || target.memoryDirs[0];
          if (!tgtMemDir) continue;
          const r = this.syncDir(srcMemDir, path.join(resolvePath(target.configDir), tgtMemDir), `${target.name}/记忆`);
          results.push({ platform: target.name, item: "记忆", ...r });
          log(r.success ? "OK" : "ERROR", `${target.name}/记忆: ${r.success ? "✅ 已同步" : r.reason}`);
        }
      }

      // 3. 自动化任务 (automations/)
      if (syncOptions.automations !== false && source.automationsDir && target.automationsDir) {
        const r = this.syncDir(
          path.join(resolvePath(source.configDir), source.automationsDir),
          path.join(resolvePath(target.configDir), target.automationsDir),
          `${target.name}/自动化`
        );
        results.push({ platform: target.name, item: "自动化", ...r });
        log(r.success ? "OK" : "ERROR", `${target.name}/自动化: ${r.success ? "✅ 已同步" : r.reason}`);
      }

      // 4. 模型配置 (models.json)
      if (syncOptions.models !== false && source.modelsFile && target.modelsFile) {
        const r = this.syncFile(
          path.join(resolvePath(source.configDir), source.modelsFile),
          path.join(resolvePath(target.configDir), target.modelsFile),
          `${target.name}/模型配置`
        );
        results.push({ platform: target.name, item: "模型配置", ...r });
        log(r.success ? "OK" : "ERROR", `${target.name}/模型配置: ${r.success ? "✅ 已同步" : r.reason}`);
      }

      // 5. MCP 配置
      if (syncOptions.mcp !== false && source.mcpFile && target.mcpFile) {
        const r = this.syncFile(
          path.join(resolvePath(source.configDir), source.mcpFile),
          path.join(resolvePath(target.configDir), target.mcpFile),
          `${target.name}/MCP配置`
        );
        results.push({ platform: target.name, item: "MCP配置", ...r });
        log(r.success ? "OK" : "ERROR", `${target.name}/MCP配置: ${r.success ? "✅ 已同步" : r.reason}`);
      }
    }

    const ok = results.filter(r => r.success).length;
    const fail = results.filter(r => !r.success).length;
    log("INFO", `同步完成：${ok} 项成功，${fail} 项失败`);

    this.syncHistory.push({ time: new Date().toISOString(), results, successCount: ok, failCount: fail });
    return { success: true, results, logs: this.logs, successCount: ok, failCount: fail };
  }

  getSyncHistory() { return this.syncHistory; }
}

module.exports = { SyncEngine };
