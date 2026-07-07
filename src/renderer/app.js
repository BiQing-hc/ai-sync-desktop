// AI Sync Desktop - 中文界面 v2
let platforms = [], source = null, page = "dashboard";
const navItems = [
  { id: "dashboard", label: "首页概览", ico: "◈" },
  { id: "platforms", label: "平台管理", ico: "▣" },
  { id: "sync", label: "一键同步", ico: "↻" },
  { id: "history", label: "同步历史", ico: "◷" }
];

async function init() {
  try {
    [platforms, source] = await Promise.all([
      window.aiSync.getPlatforms(), window.aiSync.getSource()
    ]);
  } catch (e) { platforms = []; source = null; }
  const navEl = document.getElementById("nav");
  const installed = platforms.filter(p => p.installed).length;
  navEl.innerHTML = navItems.map((n, i) => {
    const badge = n.id === "platforms" ? '<span class="nav-badge">' + installed + '/23</span>' : "";
    return '<div class="nav-item' + (i === 0 ? " active" : "") + '" data-page="' + n.id + '"><span class="ico">' + n.ico + '</span>' + n.label + badge + '</div>';
  }).join("");
  navEl.querySelectorAll(".nav-item").forEach(el => {
    el.addEventListener("click", () => {
      navEl.querySelectorAll(".nav-item").forEach(e => e.classList.remove("active"));
      el.classList.add("active"); renderPage(el.dataset.page);
    });
  });
  window.aiSync.onTriggerSync(() => renderPage("sync"));
  window.aiSync.onRefreshPlatforms(() => { init().then(() => renderPage(page)); });
  renderPage("dashboard");
}

function renderPage(p) {
  page = p; const m = document.getElementById("main-content");
  if (p === "dashboard") renderDashboard(m);
  else if (p === "platforms") renderPlatforms(m);
  else if (p === "sync") renderSync(m);
  else if (p === "history") renderHistory(m);
}

function statCard(val, label, bg, color) {
  return '<div class="stat-card"><div class="stat-icon" style="background:' + bg + ';color:' + color + ';">' + val + '</div><div><div class="stat-val">' + val + '</div><div class="stat-lbl">' + label + '</div></div></div>';
}

function platCardHTML(p) {
  var meta = "";
  if (p.installed) {
    meta = '<div class="plat-meta"><span>📦 ' + p.skillsCount + ' 技能</span>';
    if (p.memoryCount > 0) meta += '<span>🧠 ' + p.memoryCount + ' 记忆</span>';
    if (p.automationsCount > 0) meta += '<span>⚡ ' + p.automationsCount + ' 自动化</span>';
    meta += '<span class="compat-badge" style="background:' + p.compatInfo.color + '20;color:' + p.compatInfo.color + ';">' + p.compatInfo.label + '</span></div>';
  } else {
    meta = '<div style="font-size:10px;color:var(--text3);margin-top:4px;">未安装</div>';
  }
  return '<div class="plat-card ' + (p.installed ? "installed" : "not-installed") + '" data-id="' + p.id + '"><div class="plat-ico" style="background:' + p.color + ';">' + p.icon + '</div><div class="plat-info"><div class="plat-name">' + p.name + '</div><div class="plat-vendor">' + p.vendor + ' · ' + (p.region === "cn" ? "国内" : "国外") + '</div>' + meta + '</div></div>';
}

function renderDashboard(m) {
  const installed = platforms.filter(p => p.installed);
  const totalSkills = installed.reduce((s, p) => s + p.skillsCount, 0);
  const totalMemory = installed.reduce((s, p) => s + p.memoryCount, 0);
  const totalAuto = installed.reduce((s, p) => s + p.automationsCount, 0);
  m.innerHTML = '<h1 class="page-title">首页概览</h1><p class="page-desc">检测到您电脑上安装了 ' + installed.length + ' 个 AI 平台</p>' +
    '<div class="stats-row">' +
    statCard(installed.length, "已安装平台", "rgba(59,130,246,0.2)", "var(--primary)") +
    statCard(totalSkills, "用户技能", "rgba(34,197,94,0.2)", "var(--success)") +
    statCard(totalMemory, "记忆条目", "rgba(168,85,247,0.2)", "#a855f7") +
    statCard(totalAuto, "自动化任务", "rgba(245,158,11,0.2)", "var(--warning)") +
    '</div>' +
    '<div class="card"><div class="card-hd"><span class="card-tt">主数据源</span><span class="src-badge"><span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:6px;background:' + (source ? source.color : "#3b82f6") + ';color:white;font-size:10px;font-weight:700;">' + (source ? source.icon : "CB") + '</span>' + (source ? source.name : "CodeBuddy") + '</span></div><p style="font-size:13px;color:var(--text2);">用户技能、记忆、自动化任务将从主数据源同步到其他平台。<strong>不会同步平台内置的市场技能</strong>。</p></div>' +
    '<div class="card"><div class="card-hd"><span class="card-tt">已检测到的平台 (' + installed.length + ')</span><button class="btn btn-pri btn-sm" onclick="renderPage(\'sync\')">前往同步</button></div><div class="plat-grid" id="dash-grid"></div></div>' +
    '<div class="guide-box"><strong>说明：</strong>这里统计的是<strong>您自己创建</strong>的技能和记忆，不包含平台内置的市场技能。同步也只会同步您自己的数据。</div>';
  const grid = document.getElementById("dash-grid");
  if (installed.length === 0) { grid.innerHTML = '<div class="empty"><div class="e-ico">◈</div><div>未检测到 AI 平台</div></div>'; return; }
  grid.innerHTML = installed.map(p => platCardHTML(p)).join("");
  grid.querySelectorAll(".plat-card").forEach(c => c.addEventListener("click", () => showDetail(c.dataset.id)));
}

function renderPlatforms(m) {
  const installedCount = platforms.filter(p => p.installed).length;
  m.innerHTML = '<h1 class="page-title">平台管理</h1><p class="page-desc">支持 23 个国内外 AI 平台</p>' +
    '<div class="tabs" id="plat-tabs"><button class="tab active" data-filter="installed">已安装 (' + installedCount + ')</button><button class="tab" data-filter="all">全部 (23)</button><button class="tab" data-filter="cn">国内</button><button class="tab" data-filter="intl">国外</button></div>' +
    '<div class="plat-grid" id="plat-grid"></div>';
  document.querySelectorAll("#plat-tabs .tab").forEach(t => {
    t.addEventListener("click", () => {
      document.querySelectorAll("#plat-tabs .tab").forEach(x => x.classList.remove("active"));
      t.classList.add("active"); filterPlats(t.dataset.filter);
    });
  });
  filterPlats("installed");
}

function filterPlats(filter) {
  let list = platforms;
  if (filter === "installed") list = platforms.filter(p => p.installed);
  else if (filter === "cn") list = platforms.filter(p => p.region === "cn");
  else if (filter === "intl") list = platforms.filter(p => p.region === "intl");
  const grid = document.getElementById("plat-grid");
  grid.innerHTML = list.map(p => platCardHTML(p)).join("");
  grid.querySelectorAll(".plat-card").forEach(c => c.addEventListener("click", () => showDetail(c.dataset.id)));
}

function showDetail(id) {
  const p = platforms.find(x => x.id === id);
  if (!p) return;
  const m = document.getElementById("main-content");
  var rows = '<tr><td>开发商</td><td>' + p.vendor + '</td></tr><tr><td>地区</td><td>' + (p.region === "cn" ? "国内" : "国外") + '</td></tr><tr><td>配置目录</td><td><code style="font-size:11px;">' + p.configDir + '</code></td></tr><tr><td>安装状态</td><td>' + (p.installed ? "✅ 已安装" : "❌ 未安装") + '</td></tr>';
  if (p.installed) {
    rows += '<tr><td>用户技能</td><td>' + p.skillsCount + ' 个</td></tr>';
    if (p.memoryCount > 0) rows += '<tr><td>记忆条目</td><td>' + p.memoryCount + ' 条</td></tr>';
    if (p.automationsCount > 0) rows += '<tr><td>自动化任务</td><td>' + p.automationsCount + ' 个</td></tr>';
  }
  rows += '<tr><td>同步兼容性</td><td><span class="compat-badge" style="background:' + p.compatInfo.color + '20;color:' + p.compatInfo.color + ';">' + p.compatInfo.label + '</span> ' + p.compatInfo.desc + '</td></tr>';
  m.innerHTML = '<button class="back-link" onclick="renderPage(\'platforms\')">← 返回平台列表</button><h1 class="page-title"><span class="plat-ico" style="background:' + p.color + ';display:inline-flex;vertical-align:middle;margin-right:10px;">' + p.icon + '</span>' + p.name + '</h1><p class="page-desc">' + p.desc + '</p><div class="card"><div class="card-tt" style="margin-bottom:12px;">平台信息</div><table class="detail-table">' + rows + '</table></div>';
}

function renderSync(m) {
  const targets = platforms.filter(p => p.installed && p.id !== (source ? source.id : "codebuddy"));
  var targetsHTML = targets.length === 0 ? '<div style="color:var(--text3);padding:12px;">没有其他已安装平台。</div>' : targets.map(function(t) {
    return '<label class="chk-label"><input type="checkbox" value="' + t.id + '" checked><span class="plat-ico" style="background:' + t.color + ';width:28px;height:28px;font-size:10px;">' + t.icon + '</span><span style="flex:1;font-weight:500;">' + t.name + '</span><span style="font-size:11px;color:var(--text3);">' + t.skillsCount + ' 技能 · ' + t.memoryCount + ' 记忆</span><span class="compat-badge" style="background:' + t.compatInfo.color + '20;color:' + t.compatInfo.color + ';">' + t.compatInfo.label + '</span></label>';
  }).join("");
  m.innerHTML = '<h1 class="page-title">一键同步</h1><p class="page-desc">选择目标平台和要同步的数据类型</p>' +
    '<div class="card"><div class="card-hd"><span class="card-tt">① 选择同步内容</span></div><div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:4px;">' +
    '<label class="chk-label" style="border:none;padding:4px 0;"><input type="checkbox" id="opt-skills" checked> <span>技能 (Skills)</span></label>' +
    '<label class="chk-label" style="border:none;padding:4px 0;"><input type="checkbox" id="opt-memory" checked> <span>记忆 (Memory)</span></label>' +
    '<label class="chk-label" style="border:none;padding:4px 0;"><input type="checkbox" id="opt-automations" checked> <span>自动化 (Automations)</span></label>' +
    '<label class="chk-label" style="border:none;padding:4px 0;"><input type="checkbox" id="opt-models" checked> <span>模型配置 (Models)</span></label>' +
    '<label class="chk-label" style="border:none;padding:4px 0;"><input type="checkbox" id="opt-mcp" checked> <span>MCP 配置</span></label>' +
    '</div></div>' +
    '<div class="card"><div class="card-hd"><span class="card-tt">② 选择目标平台</span><span class="src-badge"><span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:6px;background:' + (source ? source.color : "#3b82f6") + ';color:white;font-size:10px;font-weight:700;">' + (source ? source.icon : "CB") + '</span>源：' + (source ? source.name : "CodeBuddy") + '</span></div><div id="sync-targets" style="margin-bottom:14px;">' + targetsHTML + '</div><button class="btn btn-pri" id="sync-btn" onclick="execSync()" ' + (targets.length === 0 ? "disabled" : "") + '>开始同步</button></div>' +
    '<div class="card"><div class="card-tt" style="margin-bottom:10px;">同步日志</div><div class="log-box" id="sync-log"><span style="color:var(--text3);">就绪。选择平台和同步内容后点击「开始同步」。</span></div></div>';
}

async function execSync() {
  const btn = document.getElementById("sync-btn");
  btn.disabled = true; btn.textContent = "同步中...";
  const logEl = document.getElementById("sync-log");
  logEl.innerHTML = '<span class="log-WARN">正在启动同步...</span>';
  const ids = Array.from(document.querySelectorAll("#sync-targets input:checked")).map(c => c.value);
  const options = {
    skills: document.getElementById("opt-skills").checked,
    memory: document.getElementById("opt-memory").checked,
    automations: document.getElementById("opt-automations").checked,
    models: document.getElementById("opt-models").checked,
    mcp: document.getElementById("opt-mcp").checked
  };
  try {
    const r = await window.aiSync.runSync({ platforms: ids, options: options });
    logEl.innerHTML = (r.logs || []).map(l => {
      const cls = l.msg && l.msg.indexOf("已同步") >= 0 ? "OK" : l.level;
      return '<div class="log-ln log-' + cls + '">[' + l.level + '] ' + l.msg + '</div>';
    }).join("");
    if (r.success) {
      logEl.innerHTML += '<div style="color:var(--success);margin-top:6px;">✅ 完成：' + r.successCount + ' 项已同步</div>';
      if (r.failCount > 0) logEl.innerHTML += '<div style="color:var(--danger);">❌ ' + r.failCount + ' 项失败</div>';
    }
  } catch (e) {
    logEl.innerHTML += '<div class="log-ERROR">错误：' + e.message + '</div>';
  }
  btn.disabled = false; btn.textContent = "开始同步";
}

async function renderHistory(m) {
  const history = await window.aiSync.getSyncHistory();
  if (history.length === 0) {
    m.innerHTML = '<h1 class="page-title">同步历史</h1><p class="page-desc">本次会话的同步操作记录</p><div class="card"><div class="empty"><div class="e-ico">◷</div><div>暂无同步记录</div></div></div>';
    return;
  }
  m.innerHTML = '<h1 class="page-title">同步历史</h1><p class="page-desc">本次会话的同步操作记录</p>' +
    history.reverse().map((h, i) => {
      var rows = (h.results || []).map(r => '<tr><td>' + (r.success ? "✅" : "❌") + '</td><td>' + (r.label || r.platform) + '</td><td style="color:var(--text3);">' + (r.reason || "") + '</td></tr>').join("");
      return '<div class="card"><div class="card-hd"><span class="card-tt">第 ' + (history.length - i) + ' 次同步</span><span style="font-size:11px;color:var(--text3);">' + new Date(h.time).toLocaleString("zh-CN") + '</span></div><div style="font-size:13px;margin-bottom:8px;"><span style="color:var(--success);">✅ ' + h.successCount + ' 成功</span>' + (h.failCount > 0 ? ' · <span style="color:var(--danger);">❌ ' + h.failCount + ' 失败</span>' : "") + '</div><table class="data-table">' + rows + '</table></div>';
    }).join("");
}

init();
