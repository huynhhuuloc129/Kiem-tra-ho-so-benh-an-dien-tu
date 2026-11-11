(() => {
  // Avoid double-initializing the extension UI. Check the guard before removing
  // any existing elements so an accidental reinjection cannot remove the panel.
  if (window.__hisTimeHelperPanelLoadedV326) return;
  // Correct guard: prevent duplicate listeners/panels if the script is injected again.
  window.__hisTimeHelperPanelLoadedV326 = true;
  const prior = document.getElementById("scanx-time-helper");
  if (prior) prior.remove();
  const priorStyle = document.getElementById("scanx-time-helper-style-v31");
  if (priorStyle) priorStyle.remove();
  // IDs use the "scanx-" prefix so this extension can run next to the main
  // "Kiểm tra hồ sơ bệnh án điện tử" extension (which uses his-*/hth-* IDs)
  // without either one restyling or removing the other's buttons and panels.
  const priorAuditStyle = document.getElementById("scanx-audit-style-v38");
  if (priorAuditStyle) priorAuditStyle.remove();

  let currentRows = [];
  let currentGroup = "";
  let currentCase = "";
  let currentVisibleEncounter = "";
  let currentVisibleSelection = "";
  // Set by QUÉT to the BA it just selected, so encounter detection cannot drift.
  let scanForcedEncounter = "";
  // Keep ventilation intervals separately from the currently-rendered service rows.
  // HIS returns data in several RestService responses; clicking a later service can
  // replace/trim currentRows, but must not erase earlier PT0034 intervals in the same case.
  const ventilationIntervalCache = new Map();
  let ventilationIntervalCase = "";
  let minimized = true;

  const style = document.createElement("style");
  style.id = "scanx-time-helper-style-v31";
  style.textContent = `
    #scanx-time-helper{position:fixed;right:12px;top:70px;width:355px;max-height:65vh;z-index:2147483647;background:#fff;color:#202124;border:1px solid #c9ced6;border-radius:10px;box-shadow:0 5px 24px rgba(0,0,0,.22);font:13px/1.4 Arial,sans-serif;overflow:hidden}
    #scanx-time-helper.hth-minimized{width:42px;min-width:42px;max-height:none;height:42px;border-radius:10px}
    #scanx-time-helper.hth-minimized .hth-head{height:42px;padding:0;justify-content:center;border-radius:10px}
    #scanx-time-helper.hth-minimized .hth-head>span{display:none}
    #scanx-time-helper.hth-minimized .hth-head button{width:42px;height:42px;padding:0;border:0;border-radius:10px;background:#eaf2ff;font-size:20px;line-height:40px}

    #scanx-time-helper *{box-sizing:border-box}
    #scanx-time-helper .hth-head{display:flex;align-items:center;justify-content:space-between;background:#eaf2ff;padding:9px 10px;font-weight:700}
    #scanx-time-helper button{border:1px solid #b8c2d1;background:#fff;border-radius:5px;padding:4px 7px;cursor:pointer;font-size:12px}
    #scanx-time-helper .hth-body{padding:9px;overflow:auto;max-height:calc(65vh - 42px)}
    #scanx-time-helper .hth-note{color:#5f6368;font-size:11px;margin:0 0 8px}
    #scanx-time-helper .hth-card{border:1px solid #e0e3e7;border-radius:7px;padding:9px;margin:7px 0}
    #scanx-time-helper .hth-card.hth-selected{border:3px solid #16a34a !important;background:#e9f9ed !important;box-shadow:0 0 0 3px rgba(22,163,74,.20)}
    #scanx-time-helper .hth-card.hth-short-duration{border:2px solid #c00000 !important;background:#fff5f5 !important}
    #scanx-time-helper .hth-card.hth-missing-time{border:2px solid #c00000 !important;background:#fff5f5 !important}
    #scanx-time-helper .hth-card{cursor:pointer;transition:box-shadow .12s ease,border-color .12s ease}
    #scanx-time-helper .hth-card:hover{border-color:#4285f4;box-shadow:0 0 0 2px rgba(66,133,244,.16)}
    #scanx-time-helper .hth-name{font-weight:700;margin-bottom:6px;overflow-wrap:anywhere;font-size:14px}
    tr.scanx-jump-target > td, tr.scanx-jump-target > th, [role="row"].scanx-jump-target > [role="gridcell"], [role="row"].scanx-jump-target > [role="columnheader"]{background:#fff1a8 !important;outline:1px solid #f29900 !important;outline-offset:-1px}
    tr.scanx-jump-target, [role="row"].scanx-jump-target{outline:3px solid #f29900 !important;outline-offset:-2px !important;box-shadow:0 0 0 3px rgba(242,153,0,.25) !important}
    #scanx-jump-toast{position:fixed;right:14px;bottom:14px;max-width:380px;padding:10px 14px;border-radius:7px;background:#1f2937;color:#fff;font:700 13px/1.45 Arial,sans-serif;z-index:2147483647;box-shadow:0 4px 16px rgba(0,0,0,.24);display:none;overflow-wrap:anywhere}
    #scanx-jump-toast.hth-toast-bad{background:#b91c1c}
    #scanx-time-helper .hth-grid{display:grid;grid-template-columns:1fr;gap:4px}
    #scanx-time-helper .hth-actual{color:#087f23;font-weight:800;font-size:16px;background:#eaf7ed;border-radius:5px;padding:5px}
    #scanx-time-helper .hth-qty{color:#7b1fa2;font-weight:700}
    #scanx-time-helper .hth-good{color:#137333;font-weight:700}
    #scanx-time-helper .hth-warn{color:#b06000;font-weight:700}
    #scanx-time-helper .hth-bad{color:#c00000;font-weight:800;background:#fff0f0;border-radius:4px;padding:3px}
    #scanx-time-helper .hth-empty{padding:14px 5px;text-align:center;color:#5f6368}
    #scanx-time-helper .hth-bed-ticket-section{background:#f8fbff;border-color:#9bbce7}
    #scanx-time-helper .hth-bed-ticket-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:10px;line-height:1.3}
    #scanx-time-helper .hth-bed-ticket-table th{background:#eaf2ff;color:#174ea6;text-align:left;padding:4px 3px;border:1px solid #c8d8ec}
    #scanx-time-helper .hth-bed-ticket-table td{padding:4px 3px;border:1px solid #d8dee8;overflow-wrap:anywhere;vertical-align:top}
    #scanx-time-helper .hth-bed-ticket-table tr{cursor:pointer}
    #scanx-time-helper .hth-bed-ticket-table tr:hover td{background:#fff2b3}
    #scanx-time-helper .hth-bed-ticket-table td.hth-bad{color:#b91c1c;font-weight:700;background:#fff0f0}
  `;
  (document.head || document.documentElement).appendChild(style);

  const panel = document.createElement("section");
  panel.id = "scanx-time-helper";
  panel.innerHTML = `<div class="hth-head"><span>Theo dõi thời gian dịch vụ</span><button type="button" data-act="min" title="Mở bảng theo dõi">⏱</button></div>
    <div class="hth-body"><p class="hth-note">Thời gian thực tế màu xanh. Chỉ PT0034/thông khí nhân tạo được quy đổi giờ và đối chiếu số lượng HIS. Hút đờm nằm ngoài khoảng thở máy sẽ được cảnh báo đỏ để rà soát.</p>
    <div class="hth-current"><div class="hth-empty">Chưa nhận được dữ liệu. Hãy bấm vào phiếu/dịch vụ.</div></div></div>`;
  // Scan extension: the ⏱ timing panel is not shown. Its data code stays
  // because QUÉT uses it (PTTT rules, encounter tracking).
  panel.classList.add("hth-minimized");
  const body = panel.querySelector(".hth-body"), area = panel.querySelector(".hth-current");
  body.style.display = "none";

  const jumpToast = document.createElement("div");
  jumpToast.id = "scanx-jump-toast";
  jumpToast.setAttribute("role", "status");
  jumpToast.setAttribute("aria-live", "polite");
  (document.body || document.documentElement).appendChild(jumpToast);
  let jumpToastTimer = 0;
  function showJumpToast(message, bad = false) {
    jumpToast.textContent = message;
    jumpToast.classList.toggle("hth-toast-bad", !!bad);
    jumpToast.style.display = "block";
    if (jumpToastTimer) clearTimeout(jumpToastTimer);
    jumpToastTimer = setTimeout(() => { jumpToast.style.display = "none"; }, 4200);
  }

  // Audit modules (DVKT / Thuốc / CT checks used by QUÉT).
  const auditStyle = document.createElement("style");
  auditStyle.id = "scanx-audit-style-v38";
  auditStyle.textContent = `
    .hth-audit-muted{color:#68737d;font-size:10px}
  `;
  (document.head || document.documentElement).appendChild(auditStyle);

  // "Chỉ hiện lỗi": hide every row/card that carries no warning, in all helper
  // panels. One shared setting, remembered in localStorage (default on).
  let hthOnlyErrors = true;
  try { hthOnlyErrors = window.localStorage.getItem("hthOnlyErrors") !== "0"; } catch (_) {}
  function hthSetOnlyErrors(value) {
    hthOnlyErrors = !!value;
    try { window.localStorage.setItem("hthOnlyErrors", hthOnlyErrors ? "1" : "0"); } catch (_) {}
    lastRenderedSignature = "";
    render(true);
    if (typeof scanRenderResults === "function") { scanFilter.checked = hthOnlyErrors; scanRenderResults(); }
  }
  function hthHiddenNote(hiddenCount, className = "hth-audit-muted") {
    const note = auditElement("div", className);
    note.style.margin = "6px 0";
    note.append(document.createTextNode(`Đã ẩn ${hiddenCount} dòng không có lỗi. `));
    const btn = auditElement("button", "", "Hiện tất cả dòng");
    btn.type = "button"; btn.dataset.hthToggleErrors = "1";
    note.appendChild(btn);
    return note;
  }

  const auditState = {
    contextKey: "", context: {},
    dvktRows: new Map(), medicineRows: new Map(),
    contrastServices: new Map(), contrastMedicines: new Map(),
    // Kết quả xét nghiệm lines (NT.024.2) by KETQUACLSID, each with its visit key;
    // labErrors: why a phiếu's results could not be loaded during QUÉT.
    labResults: new Map(), labErrors: [],
    icdHoSoBenhAnId: "", icdData: null
  };
  // Every NT.005.HSBA diagnosis payload seen, by HOSOBENHANID. The response can
  // arrive before the page shows the new case (and HIS may not resend it when
  // a case is reopened), so it is kept here instead of being dropped.
  const icdCacheByHoSoId = new Map();
  function auditText(value) { return String(value ?? "").trim(); }
  function auditQty(value) {
    const s = auditText(value).replace(/,/g, ".").replace(/[^0-9.\-]/g, "");
    const n = Number.parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  }
  function auditDateTime(value, boundaryKind = "") {
    const s = auditText(value);
    if (!s) return null;
    let m = s.match(/^(\d{4})(\d{2})(\d{2})(?:(\d{2})(\d{2})(\d{2})?)?$/);
    if (m) {
      const year = Number(m[1]), month = Number(m[2]), day = Number(m[3]);
      const hour = Number(m[4] || "0"), minute = Number(m[5] || "0"), second = Number(m[6] || "0");
      const d = new Date(year, month - 1, day, hour, minute, second, 0);
      if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day ||
          d.getHours() !== hour || d.getMinutes() !== minute || d.getSeconds() !== second) return null;
      return d;
    }
    m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (m) {
      const hasTime = m[4] !== undefined;
      const hour = hasTime ? Number(m[4]) : (boundaryKind === "discharge" ? 23 : 0);
      const minute = hasTime ? Number(m[5]) : (boundaryKind === "discharge" ? 59 : 0);
      const second = hasTime && m[6] !== undefined ? Number(m[6]) : (boundaryKind === "discharge" ? 59 : 0);
      const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), hour, minute, second, 0);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (m) {
      const hasTime = m[4] !== undefined;
      const hour = hasTime ? Number(m[4]) : (boundaryKind === "discharge" ? 23 : 0);
      const minute = hasTime ? Number(m[5]) : (boundaryKind === "discharge" ? 59 : 0);
      const second = hasTime && m[6] !== undefined ? Number(m[6]) : (boundaryKind === "discharge" ? 59 : 0);
      const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), hour, minute, second, 0);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
  }
  function auditDateOnly(value) {
    const d = auditDateTime(value);
    return d ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth()+1).padStart(2, "0")}/${d.getFullYear()}` : "";
  }
  function auditElement(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = String(text);
    return el;
  }
  function auditTable(panelBody, title, rows, headers, fields, emptyText = "Chưa thu thập được dữ liệu.", options = null) {
    // Empty/not-yet-loaded data is not a violation: do not render an empty
    // heading or a "not found" notice. Only show a table when it has rows.
    if (!Array.isArray(rows) || !rows.length) return;
    let hiddenCount = 0;
    if (hthOnlyErrors && rows.some(row => row && "hasWarning" in row)) {
      const errorRows = rows.filter(row => row && row.hasWarning);
      hiddenCount = rows.length - errorRows.length;
      rows = errorRows;
    }
    if (!rows.length) {
      panelBody.appendChild(auditElement("div", options && options.sectionClass || "hth-audit-section", `${title}: không có lỗi`));
      panelBody.appendChild(hthHiddenNote(hiddenCount));
      return;
    }
    const section = auditElement("div", options && options.sectionClass || "hth-audit-section", title);
    panelBody.appendChild(section);
    const wrap = auditElement("div", `hth-audit-table-wrap ${options && options.tableWrapClass || ""}`.trim());
    const table = document.createElement("table");
    if (options && options.tableClass) table.className = options.tableClass;
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    for (const h of headers) headRow.appendChild(auditElement("th", "", h));
    thead.appendChild(headRow); table.appendChild(thead);
    const tbody = document.createElement("tbody");
    for (const row of rows) {
      const tr = document.createElement("tr");
      if (options && options.rowClass) {
        tr.className = typeof options.rowClass === "function" ? (options.rowClass(row) || "") : options.rowClass;
      }
      for (const field of fields) {
        const td = auditElement("td", options && options.cellClasses && options.cellClasses[field] || "", row[field] || "");
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody); wrap.appendChild(table); panelBody.appendChild(wrap);
    if (hiddenCount) panelBody.appendChild(hthHiddenNote(hiddenCount));
  }
  function auditOutside(timeValue, context) {
    const admission = auditDateTime(context && context.admissionDate, "admission");
    const discharge = auditDateTime(context && context.dischargeDate, "discharge");
    const time = auditDateTime(timeValue);
    if (!time || !admission || !discharge) return null;
    if (time.getTime() < admission.getTime()) {
      return { reason: "Trước nhập viện", minutes: Math.abs(Math.floor(admission.getTime() / 60000) - Math.floor(time.getTime() / 60000)) };
    }
    if (time.getTime() > discharge.getTime()) {
      return { reason: "Sau xuất viện", minutes: Math.abs(Math.floor(time.getTime() / 60000) - Math.floor(discharge.getTime() / 60000)) };
    }
    return null;
  }
  function auditTimeViolations(rows, context, medicineMode = false) {
    const violations = [];
    for (const row of rows) {
      const points = medicineMode
        ? (row.orderDate ? [{ kind: "Y lệnh", field: "NGAY_YL / ngày phiếu", value: row.orderDate }] : [])
        : (Array.isArray(row.timePoints) ? row.timePoints : []);
      for (const point of points) {
        const out = auditOutside(point.value, context);
        if (out) violations.push({ code: row.bhytCode || row.hisCode || "", name: row.name || "", kind: point.kind, field: point.field, time: point.value, reason: out.reason, minutes: out.minutes });
      }
    }
    return violations;
  }
  // Read the one result timestamp that HIS actually displays in the lower
  // CĐHA result grid (column "TG trả KQ"). The three RestService aliases are
  // retained only for comparison; they are not blindly treated as three real
  // result events.
  function domToken(value) {
    return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toUpperCase().replace(/[^A-Z0-9]/g, "");
  }
  function isResultTimeField(field, label) {
    const f = domToken(field), l = domToken(label);
    return /^(TGTRAKQ|THOIGIANTRAKQ|THOIGIANTRAKETQUA|NGAYTRAKQ|NGAYKQ)$/.test(f) ||
      /^(TGTRAKQ|THOIGIANTRAKQ|THOIGIANTRAKETQUA|NGAYTRAKQ|NGAYKQ)$/.test(l) ||
      l.includes("THOIGIANTRAKETQUA") || l.includes("TGTRAKQ");
  }
  function visibleNode(el) {
    if (!el || !el.getClientRects || !el.getClientRects().length) return false;
    const style = window.getComputedStyle ? window.getComputedStyle(el) : null;
    return !style || (style.display !== "none" && style.visibility !== "hidden");
  }
  function cellFieldName(cell) {
    const described = String(cell && cell.getAttribute("aria-describedby") || "");
    if (!described) return "";
    const cut = described.lastIndexOf("_");
    return domToken(cut >= 0 ? described.slice(cut + 1) : described);
  }
  function rowsForResultHeader(header) {
    const headerRow = header && header.closest ? header.closest("tr") : null;
    if (!headerRow) return [];
    const headerCells = Array.from(headerRow.children || []);
    const resultIndex = headerCells.indexOf(header.closest("th,td,[role='columnheader']") || header);
    if (resultIndex < 0) return [];
    const roots = [];
    const addRoot = el => { if (el && !roots.includes(el)) roots.push(el); };
    addRoot(header.closest(".ui-jqgrid"));
    addRoot(header.closest("[id^='gbox_']"));
    addRoot(header.closest("[id^='gview_']"));
    const out = [];
    for (const root of roots) {
      const tables = Array.from(root.querySelectorAll(".ui-jqgrid-bdiv table, table[id^='grd'], table[role='grid']"));
      for (const table of tables) {
        const trs = Array.from(table.querySelectorAll("tbody tr, tr[role='row']"))
          .filter(tr => visibleNode(tr) && tr.cells && tr.cells.length &&
            !tr.classList.contains("jqgfirstrow") && !tr.classList.contains("jqgroup"));
        if (!trs.length) continue;
        for (const tr of trs) {
          const cells = Array.from(tr.cells || []);
          const byField = cells.find(td => isResultTimeField(cellFieldName(td), ""));
          const resultCell = byField || cells[resultIndex];
          if (!resultCell) continue;
          const resultTime = String(resultCell.innerText || resultCell.textContent || "").trim();
          if (!auditDateTime(resultTime)) continue;
          const data = Object.create(null), ids = new Set();
          cells.forEach((td, index) => {
            const text = String(td.innerText || td.textContent || "").trim();
            const field = cellFieldName(td);
            const hCell = headerCells[index];
            const label = String(hCell && (hCell.innerText || hCell.textContent || hCell.getAttribute("title")) || "").trim();
            if (field) data[field] = text;
            if (label) data[`LABEL_${domToken(label)}`] = text;
            if (/^(DICHVUKHAMBENHID|DICHVUTHUCHIENID|KETQUACLSID|PHAUTHUATTHUTHUATID|MAUBENHPHAMID|MAUBENHPHAM|ID)$/.test(field) && text) ids.add(text);
          });
          const rowId = String(tr.id || "").trim();
          if (rowId) ids.add(rowId);
          out.push({
            id: rowId, ids, resultTime,
            code: data.MADICHVU || data.MADMBYT || data.MADV || data.MADICHVUBHYT || "",
            name: data.TENDICHVU || data.TENCHIDINH || data.TENDV || data.TEN_DV || "",
            ticketId: data.MAUBENHPHAMID || data.MAUBENHPHAM || data.SOPHIEU || "",
            data, _source: "header-root"
          });
        }
      }
    }
    return out;
  }
  function visibleGridRows(gridId) {
    const found = [];
    const seen = new Set();
    const addRows = rows => {
      for (const row of rows || []) {
        const key = [row.id, row.resultTime, [...(row.ids || [])].sort().join(",")].join("|");
        if (!seen.has(key)) { seen.add(key); found.push(row); }
      }
    };
    const grid = document.getElementById(gridId);
    if (grid) {
      const view = document.getElementById(`gview_${gridId}`) || document.getElementById(`gbox_${gridId}`) || grid.parentElement;
      const headerCells = Array.from((view || document).querySelectorAll("th, td[role='columnheader'], [role='columnheader']"));
      const resultHeader = headerCells.find(el => visibleNode(el) && isResultTimeField("", el.innerText || el.textContent || el.getAttribute("title") || ""));
      if (resultHeader) addRows(rowsForResultHeader(resultHeader));
    }
    // Fallback: HIS builds jqGrid headers and body tables separately, and some
    // themes generate a dynamic grid ID. Search visible headers by the exact
    // displayed label instead of depending on one fixed table ID.
    const globalHeaders = Array.from(document.querySelectorAll("th, td[role='columnheader'], [role='columnheader']"))
      .filter(el => visibleNode(el) && isResultTimeField("", el.innerText || el.textContent || el.getAttribute("title") || ""));
    for (const header of globalHeaders) addRows(rowsForResultHeader(header));
    // Plain HTML table fallback where the header and data rows share one table.
    for (const table of Array.from(document.querySelectorAll("table,[role='grid']"))) {
      if (!visibleNode(table) || (table.closest("#scanx-time-helper"))) continue;
      const headerRow = Array.from(table.querySelectorAll("tr,[role='row']")).find(tr =>
        Array.from(tr.children || []).some(cell => isResultTimeField("", cell.innerText || cell.textContent || cell.getAttribute("title") || "")));
      if (!headerRow) continue;
      const headerCells = Array.from(headerRow.children || []);
      const resultIndex = headerCells.findIndex(cell => isResultTimeField("", cell.innerText || cell.textContent || cell.getAttribute("title") || ""));
      if (resultIndex < 0) continue;
      for (const tr of Array.from(table.querySelectorAll("tbody tr, tr[role='row']"))) {
        if (tr === headerRow || !visibleNode(tr) || !tr.cells || !tr.cells.length) continue;
        const cells = Array.from(tr.cells);
        const fieldCell = cells.find(td => isResultTimeField(cellFieldName(td), ""));
        const cell = fieldCell || cells[resultIndex];
        const resultTime = String(cell && (cell.innerText || cell.textContent) || "").trim();
        if (!auditDateTime(resultTime)) continue;
        const data = Object.create(null), ids = new Set();
        cells.forEach((td, index) => {
          const field = cellFieldName(td), text = String(td.innerText || td.textContent || "").trim();
          const label = String(headerCells[index] && (headerCells[index].innerText || headerCells[index].textContent) || "").trim();
          if (field) data[field] = text;
          if (label) data[`LABEL_${domToken(label)}`] = text;
          if (/^(DICHVUKHAMBENHID|DICHVUTHUCHIENID|KETQUACLSID|MAUBENHPHAMID|MAUBENHPHAM|ID)$/.test(field) && text) ids.add(text);
        });
        const rowId = String(tr.id || "").trim(); if (rowId) ids.add(rowId);
        addRows([{ id: rowId, ids, resultTime, code: data.MADICHVU || data.MADMBYT || "",
          name: data.TENDICHVU || data.TENCHIDINH || "", ticketId: data.MAUBENHPHAMID || data.MAUBENHPHAM || "", data, _source: "plain-table" }]);
      }
    }
    return found;
  }
  let lastSelectedCDHAOrderRow = null;
  function selectedCDHAOrderTime() {
    const grid = document.getElementById("grdCDHA");
    const selected = lastSelectedCDHAOrderRow && lastSelectedCDHAOrderRow.isConnected
      ? lastSelectedCDHAOrderRow
      : (grid && grid.querySelector("tr.ui-state-highlight, tr.ui-selected, tr[aria-selected='true'], tr.success, tr.selected"));
    if (!selected) return "";
    const text = String(selected.innerText || selected.textContent || "");
    const matches = text.match(/\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?/g) || [];
    for (const candidate of matches) if (auditDateTime(candidate)) return candidate.trim();
    return "";
  }
  function sameAuditMinute(a, b) {
    const da = auditDateTime(a), db = auditDateTime(b);
    return !!da && !!db && Math.floor(da.getTime() / 60000) === Math.floor(db.getTime() / 60000);
  }
  function sameAuditText(a, b) {
    const na = domToken(a), nb = domToken(b);
    return !!na && !!nb && (na === nb || na.includes(nb) || nb.includes(na));
  }
  function auditScreenRowScore(row, visible) {
    const wantedIds = new Set([...(Array.isArray(row.detailIds) ? row.detailIds : []),
      ...(Array.isArray(row.matchIds) ? row.matchIds : []), row.rowId, row.ticketId]
      .map(v => String(v || "").trim()).filter(Boolean));
    for (const id of visible.ids || []) if (wantedIds.has(String(id))) return 100;
    let score = 0;
    if (row.ticketId && visible.ticketId && String(row.ticketId) === String(visible.ticketId)) score += 35;
    const apiCodes = [row.hisCode, row.bhytCode].filter(Boolean);
    if (apiCodes.some(code => sameAuditText(code, visible.code))) score += 40;
    if (row.name && visible.name && sameAuditText(row.name, visible.name)) score += 30;
    return score;
  }
  function applyVisibleCDHAResultTimes() {
    if (!auditState.dvktRows.size) return;
    const visibleRows = visibleGridRows("grdCDHAChiTiet");
    if (!visibleRows.length) return;
    const allRows = Array.from(auditState.dvktRows.values());
    const selectedOrder = selectedCDHAOrderTime();
    const selectedCandidates = selectedOrder
      ? allRows.filter(row => sameAuditMinute(row.orderDate, selectedOrder)) : [];
    let changed = false;
    for (const visible of visibleRows) {
      let ranked = allRows.map(row => ({ row, score: auditScreenRowScore(row, visible) }))
        .filter(item => item.score >= 30).sort((a, b) => b.score - a.score);
      let target = null;
      if (ranked.length && !(ranked.length > 1 && ranked[0].score === ranked[1].score)) {
        target = ranked[0].row;
      } else if (selectedCandidates.length === 1) {
        // The lower result grid is populated from the currently selected order
        // in the upper CĐHA grid. When HIS omits hidden IDs/codes in the lower
        // row, use the selected order timestamp to link it, but only if unique.
        target = selectedCandidates[0];
      }
      if (!target) continue;
      const displayed = String(visible.resultTime || "").trim();
      if (!auditDateTime(displayed)) continue;
      const d = auditDateTime(displayed);
      const pad = n => String(n).padStart(2, "0");
      const normalizedScreen = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      if (target.screenResultAt === normalizedScreen && target.screenResultSource === "HIS grid TG trả KQ") continue;
      target.screenResultAt = normalizedScreen;
      target.resultAt = normalizedScreen;
      target.screenResultSource = "HIS grid TG trả KQ";
      const basePoints = (Array.isArray(target.timePoints) ? target.timePoints : [])
        .filter(point => !String(point.kind || "").startsWith("Kết quả"));
      basePoints.push({ kind: "Kết quả", field: "TG trả KQ (màn hình HIS)", value: normalizedScreen });
      const seenOutsideApiTimes = new Set();
      for (const apiPoint of (Array.isArray(target.apiResultTimes) ? target.apiResultTimes : [])) {
        const apiValue = String(apiPoint.value || "").trim();
        const apiDate = auditDateTime(apiValue);
        if (!apiDate || apiDate.getTime() === d.getTime()) continue;
        const outside = auditOutside(apiValue, auditState.context);
        if (!outside) continue;
        const dedupeKey = `${apiPoint.field}|${apiValue}`;
        if (seenOutsideApiTimes.has(dedupeKey)) continue;
        seenOutsideApiTimes.add(dedupeKey);
        basePoints.push({ kind: "Kết quả API khác màn hình", field: `${apiPoint.field} (API khác màn hình)`, value: apiValue });
      }
      target.timePoints = basePoints;
      changed = true;
    }
  }
  let visibleResultScanTimer = 0;
  let visibleResultGridObserver = null;
  let visibleResultObservedGrid = null;
  function attachVisibleResultGridObserver() {
    const roots = [
      document.getElementById("gbox_grdCDHAChiTiet"),
      document.getElementById("gview_grdCDHAChiTiet"),
      document.getElementById("grdCDHAChiTiet"),
      document.getElementById("tcCDHAHis"),
      document.getElementById("tabCDHA")
    ].filter(Boolean);
    const root = roots[0];
    if (!root || root === visibleResultObservedGrid) return;
    if (visibleResultGridObserver) visibleResultGridObserver.disconnect();
    visibleResultObservedGrid = root;
    visibleResultGridObserver = new MutationObserver(() => scheduleVisibleResultScan(120));
    visibleResultGridObserver.observe(root, { childList: true, subtree: true, characterData: true });
  }
  function scheduleVisibleResultScan(delay = 100) {
    if (visibleResultScanTimer) clearTimeout(visibleResultScanTimer);
    visibleResultScanTimer = setTimeout(() => {
      visibleResultScanTimer = 0;
      attachVisibleResultGridObserver();
      applyVisibleCDHAResultTimes();
    }, delay);
  }
  document.addEventListener("click", event => {
    const target = event.target && event.target.nodeType === 1 ? event.target : event.target && event.target.parentElement;
    const orderRow = target && target.closest && target.closest("#grdCDHA tr, #gview_grdCDHA tr, #gbox_grdCDHA tr");
    if (orderRow && orderRow.cells && orderRow.cells.length) lastSelectedCDHAOrderRow = orderRow;
    if (target && target.closest && target.closest("#grdCDHA tr, [id*=\"grdCDHAChiTiet\"] tr, #tabCDHA, #tcCDHAHis")) {
      scheduleVisibleResultScan(180);
      setTimeout(() => scheduleVisibleResultScan(0), 450);
      setTimeout(() => scheduleVisibleResultScan(0), 900);
      setTimeout(() => scheduleVisibleResultScan(0), 1500);
    }
  }, true);

  function auditCaseLabel(context) {
    const keys = [context && context.tiepNhanId, context && context.hoSoBenhAnId, context && context.benhNhanId].filter(Boolean);
    const admission = auditText(context && context.admissionDate) || "chưa có";
    const discharge = auditText(context && context.dischargeDate) || "chưa có";
    return `Khóa hồ sơ: ${keys.join(" / ") || "chưa đọc được"} · Vào viện: ${admission} · Ra viện: ${discharge}`;
  }
  function auditNormalizeHoSoId(value) { return String(value ?? "").trim().replace(/\s+/g, ""); }
  function auditCurrentHoSoId() {
    const input = document.getElementById("hidHOSOBENHANID");
    return input && "value" in input ? auditNormalizeHoSoId(input.value) : "";
  }
  function auditMatchingIcdData() {
    const visibleId = auditCurrentHoSoId() || auditNormalizeHoSoId(auditState.context && auditState.context.hoSoBenhAnId);
    if (visibleId && visibleId !== auditNormalizeHoSoId(auditState.icdHoSoBenhAnId) && icdCacheByHoSoId.has(visibleId)) {
      auditState.icdHoSoBenhAnId = visibleId;
      auditState.icdData = icdCacheByHoSoId.get(visibleId);
    }
    const data = auditState.icdData;
    if (!data || !auditState.icdHoSoBenhAnId) return null;
    if (visibleId && visibleId !== auditNormalizeHoSoId(auditState.icdHoSoBenhAnId)) return null;
    return data;
  }
  const dvktIcdContraindicationCodes = new Set([
    "02.0304.0134", "02.0262.0136", "02.0305.0135", "02.0259.0137"
  ]);
  const icdContraindicationCodes = new Set([
    "I21.0", "I21.1", "I21.2", "I21.3", "I21.4", "I21.9",
    "I50.0", "I50.1", "I50.9", "I13.0", "I13.2"
  ]);
  function auditDvktCodeSet(row) {
    return new Set([row && row.bhytCode, row && row.hisCode, row && row.serviceCode]
      .map(value => String(value || "").replace(/\s+/g, "").toUpperCase()).filter(Boolean));
  }
  // Thiếu chẩn đoán: each drug below needs at least one matching diagnosis
  // (main or secondary, from NT.005.HSBA). Drugs match by mã thuốc BHYT
  // (row.bhytCode: MA_THUOC from HIS, or the local code mapped in main.js).
  const gastricBaseKeywords = [
    "Trào ngược dạ dày", "Thủng dạ dày", "Loét dạ dày", "Loét hang vị", "Loét tá tràng",
    "Loét tâm vị", "Loét hành tá tràng", "Loét thực quản", "Xuất huyết tiêu hóa"
  ];
  const vestibularKeywords = ["Rối loạn tiền đình", "Chóng mặt"];
  const drugDiagnosisRules = [
    { drug: "Mã thuốc 40.666", code: "40.666", keywords: gastricBaseKeywords },
    { drug: "Mã thuốc 40.677", code: "40.677", keywords: gastricBaseKeywords },
    { drug: "Mã thuốc 40.678", code: "40.678", keywords: gastricBaseKeywords },
    { drug: "Mã thuốc 40.679", code: "40.679", keywords: gastricBaseKeywords },
    { drug: "Mã thuốc 40.68", code: "40.68", keywords: gastricBaseKeywords },
    // No local codes for these two in main.js, so also match the generic name.
    // "Cinnarizin" is also spelled "Cinarizin".
    { drug: "Cinnarizin", code: "40.80", name: /CIN+ARIZIN/, keywords: vestibularKeywords },
    { drug: "Betahistin", code: "40.899", name: /BETAHISTIN/, keywords: vestibularKeywords }
  ];
  // "40.680" = "40.68": drop spaces and trailing zeros after the dot.
  function auditDrugCodeKey(value) {
    const code = String(value ?? "").replace(/\s+/g, "");
    return /^\d+\.\d+$/.test(code) ? code.replace(/\.?0+$/, "") : code.toUpperCase();
  }
  // Accent/case-insensitive; tolerates "hoá"/"hóa", punctuation and extra spaces.
  function auditFoldDiagnosisText(value) {
    return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[\u0111\u0110]/g, "d").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }
  function auditDiagnosisNames(icdData) {
    return [icdData && icdData.mainName, icdData && icdData.rawText,
      ...(Array.isArray(icdData && icdData.diagnoses) ? icdData.diagnoses.map(item => item && item.name) : [])]
      .map(auditText).filter(Boolean);
  }
  function auditHasDiagnosis(icdData, keywords) {
    const tokens = keywords.map(auditFoldDiagnosisText);
    return auditDiagnosisNames(icdData).some(name => {
      const folded = ` ${auditFoldDiagnosisText(name)} `;
      return tokens.some(token => folded.includes(` ${token} `));
    });
  }
  // Drug rows of this case that fall under a rule, grouped per rule.
  function auditDrugDiagnosisTargets() {
    const medicines = Array.from(auditState.medicineRows.values());
    return drugDiagnosisRules.map(rule => ({
      rule, rows: medicines.filter(row => auditDrugCodeKey(row && row.bhytCode) === auditDrugCodeKey(rule.code) ||
        (rule.name && rule.name.test(domToken(row && row.name))))
    })).filter(item => item.rows.length);
  }
  // DVKT "Chụp X-quang ..." must come with the drug Xenetix 300 ordered the same
  // day. If the X-quang or any Xenetix 300 row has no order date, only check that
  // the case has Xenetix 300 at all. Shown as a [Thuốc] error.
  function auditXrayWithoutXenetix() {
    const isXray = row => { const t = domToken(row && row.name); return t.includes("CHUP") && t.includes("XQUANG"); };
    const isXenetix = row => domToken(row && row.name).includes("XENETIX300");
    const xrays = Array.from(auditState.dvktRows.values()).filter(isXray);
    if (!xrays.length) return [];
    const xenetix = Array.from(auditState.medicineRows.values()).filter(isXenetix);
    const xenetixDays = new Set(xenetix.map(row => auditDateOnly(row.orderDate)));
    const allDated = !xenetixDays.has("");
    return xrays.filter(row => {
      const day = auditDateOnly(row.orderDate);
      if (!xenetix.length) return true;
      return day && allDated ? !xenetixDays.has(day) : false;
    }).map(row => ({ row, day: auditDateOnly(row.orderDate), sameDay: xenetix.length > 0 }));
  }
  function auditIcdHasCodes(icdData) {
    return Array.isArray(icdData && icdData.diagnoses) && icdData.diagnoses.length > 0;
  }
  function auditDvktContraindication(rows, icdData) {
    const matchedServices = [];
    for (const row of rows) {
      const codes = [...auditDvktCodeSet(row)].filter(code => dvktIcdContraindicationCodes.has(code));
      for (const code of codes) matchedServices.push({ code, name: auditText(row && row.name), orderDate: auditText(row && row.orderDate) });
    }
    const diagnoses = Array.isArray(icdData && icdData.diagnoses) ? icdData.diagnoses : [];
    const matchedIcd = diagnoses.filter(item => icdContraindicationCodes.has(String(item && item.code || "").trim().toUpperCase()));
    const uniqueServices = [];
    const seenServices = new Set();
    for (const item of matchedServices) {
      const key = `${item.code}|${item.name}|${item.orderDate}`;
      if (!seenServices.has(key)) { seenServices.add(key); uniqueServices.push(item); }
    }
    const uniqueIcd = [];
    const seenIcd = new Set();
    for (const item of matchedIcd) {
      const code = String(item.code || "").trim().toUpperCase();
      if (!seenIcd.has(code)) { seenIcd.add(code); uniqueIcd.push({ code, name: auditText(item.name) }); }
    }
    return { matchedServices: uniqueServices, matchedIcd: uniqueIcd };
  }

  // The DVKT / Thuốc / CT checks render into these off-page containers; QUÉT
  // reads the flagged rows from them (scanCollectFindings).
  const dvktUI = { body: document.createElement("div") };
  const drugUI = { body: document.createElement("div") };
  const contrastUI = { body: document.createElement("div") };

  function clearAuditData() {
    auditState.contextKey = ""; auditState.context = {};
    auditState.dvktRows.clear(); auditState.medicineRows.clear();
    auditState.contrastServices.clear(); auditState.contrastMedicines.clear();
    auditState.labResults.clear(); auditState.labErrors = [];
    auditState.icdHoSoBenhAnId = ""; auditState.icdData = null;
  }
  function auditRequiredCompanionDvkt(rows) {
    const triggerCodes = ["02.0304.0134", "02.0309.0138", "02.0262.0136"];
    const companionCode = "25.0030.1751";
    const relevantCodes = new Set([...triggerCodes, companionCode]);
    const byDay = new Map();
    let missingDateCount = 0;
    let relevantRowCount = 0;
    for (const row of rows) {
      const rowCodes = new Set([row && row.bhytCode, row && row.hisCode, row && row.serviceCode]
        .map(value => String(value || "").replace(/\s+/g, "").toUpperCase()).filter(Boolean));
      const matched = [...rowCodes].filter(code => relevantCodes.has(code));
      if (!matched.length) continue;
      relevantRowCount++;
      const orderPoint = Array.isArray(row.timePoints)
        ? row.timePoints.find(point => point && point.kind === "Y lệnh" && point.value) : null;
      const day = auditDateOnly((row && row.orderDate) || (orderPoint && orderPoint.value) || "");
      if (!day) { missingDateCount++; continue; }
      if (!byDay.has(day)) byDay.set(day, new Set());
      for (const code of matched) byDay.get(day).add(code);
    }
    const badDays = [];
    for (const [day, codes] of byDay.entries()) {
      const presentTriggers = triggerCodes.filter(code => codes.has(code));
      const hasCompanion = codes.has(companionCode);
      if (presentTriggers.length && !hasCompanion) {
        badDays.push({ day, reason: "missing-companion", presentCodes: presentTriggers });
      } else if (hasCompanion && !presentTriggers.length) {
        badDays.push({ day, reason: "missing-trigger", presentCodes: [companionCode] });
      }
    }
    return { triggerCodes, companionCode, badDays, missingDateCount, relevantRowCount, daysChecked: byDay.size };
  }

  function auditRequiredCompanionDvktGroup(rows, triggerCodes, companionCodes) {
    const relevantCodes = new Set([...triggerCodes, ...companionCodes]);
    const byDay = new Map();
    let missingDateCount = 0;
    let relevantRowCount = 0;
    for (const row of rows) {
      const rowCodes = new Set([row && row.bhytCode, row && row.hisCode, row && row.serviceCode]
        .map(value => String(value || "").replace(/\s+/g, "").toUpperCase()).filter(Boolean));
      const matched = [...rowCodes].filter(code => relevantCodes.has(code));
      if (!matched.length) continue;
      relevantRowCount++;
      const orderPoint = Array.isArray(row.timePoints)
        ? row.timePoints.find(point => point && point.kind === "Y lệnh" && point.value) : null;
      const day = auditDateOnly((row && row.orderDate) || (orderPoint && orderPoint.value) || "");
      if (!day) { missingDateCount++; continue; }
      if (!byDay.has(day)) byDay.set(day, new Set());
      for (const code of matched) byDay.get(day).add(code);
    }
    const badDays = [];
    for (const [day, codes] of byDay.entries()) {
      const presentTriggers = triggerCodes.filter(code => codes.has(code));
      const presentCompanions = companionCodes.filter(code => codes.has(code));
      if (presentTriggers.length && !presentCompanions.length) {
        badDays.push({ day, reason: "missing-companion", presentCodes: presentTriggers });
      } else if (presentCompanions.length && !presentTriggers.length) {
        badDays.push({ day, reason: "missing-trigger", presentCodes: presentCompanions });
      }
    }
    return { badDays, missingDateCount, relevantRowCount, daysChecked: byDay.size };
  }

  // var (not let): renderDVKTPanel is hoisted and may run before this line.
  var dvktLastDisplayRows = [];
  // Raw order time of a DVKT row, else its first performed/result time.
  function rowOrderSource(row, points) {
    const orderPoint = points.find(p => p && p.kind === "Y lệnh" && p.value);
    const otherPoint = points.find(p => p && p.value && p.kind !== "Y lệnh");
    return [row && row.orderDate, orderPoint && orderPoint.value, otherPoint && otherPoint.value]
      .find(value => auditDateTime(value)) || "";
  }
  // "dd/mm/yyyy HH:mm:ss"; date only when the source has no time part.
  function auditDateTimeText(value) {
    const d = auditDateTime(value);
    if (!d) return "";
    const pad = n => String(n).padStart(2, "0");
    const day = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    const s = auditText(value);
    const hasTime = /\d{1,2}:\d{2}/.test(s) || /^\d{12,14}$/.test(s);
    return hasTime ? `${day} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` : day;
  }
  function renderDVKTPanel() {
    const body = dvktUI.body; body.replaceChildren();
    const rows = Array.from(auditState.dvktRows.values());

    // Chỉ gắn cảnh báo vào đúng dòng DVKT có vi phạm; không hiển thị các khung
    // trạng thái kiểu "chưa thấy mã", "đã kiểm tra đúng" hoặc "chưa đủ mốc".
    const rowWarnings = new Map();
    const addRowWarning = (row, message) => {
      if (!row || !message) return;
      if (!rowWarnings.has(row)) rowWarnings.set(row, new Set());
      rowWarnings.get(row).add(message);
    };
    const rowCodes = row => new Set([row && row.bhytCode, row && row.hisCode, row && row.serviceCode]
      .map(value => String(value || "").replace(/\s+/g, "").toUpperCase()).filter(Boolean));
    const rowDay = row => {
      const orderPoint = Array.isArray(row && row.timePoints)
        ? row.timePoints.find(point => point && point.kind === "Y lệnh" && point.value) : null;
      return auditDateOnly((row && row.orderDate) || (orderPoint && orderPoint.value) || "");
    };

    // 1) Chống chỉ định DVKT theo ICD chính/phụ lấy từ NT.005.HSBA.
    const icdData = auditMatchingIcdData();
    const diagnoses = Array.isArray(icdData && icdData.diagnoses) ? icdData.diagnoses : [];
    const matchedIcd = diagnoses.filter(item => icdContraindicationCodes.has(
      String(item && item.code || "").trim().toUpperCase()
    ));
    const uniqueMatchedIcd = [...new Map(matchedIcd.map(item => [
      String(item.code || "").trim().toUpperCase(), item
    ])).values()];
    for (const row of rows) {
      const codes = [...rowCodes(row)].filter(code => dvktIcdContraindicationCodes.has(code));
      if (!codes.length) continue;
      if (icdData && auditIcdHasCodes(icdData) && uniqueMatchedIcd.length) {
        const icdText = uniqueMatchedIcd.map(item => {
          const code = String(item.code || "").trim().toUpperCase();
          const name = auditText(item.name);
          return name ? `${code} (${name})` : code;
        }).join(", ");
        addRowWarning(row, `Chống chỉ định theo danh sách đã thiết lập với ICD: ${icdText}.`);
      }
    }

    // 2) Các cặp DVKT không đi chung trong cùng ngày y lệnh.
    const exclusiveDvktPairs = [
      ["24.0001.1714", "24.0004.1716"],
      ["01.0232.0140", "02.0305.0135"]
    ];
    for (const pair of exclusiveDvktPairs) {
      const byDay = new Map();
      for (const row of rows) {
        const day = rowDay(row);
        if (!day) continue;
        const matched = pair.filter(code => rowCodes(row).has(code));
        if (!matched.length) continue;
        if (!byDay.has(day)) byDay.set(day, new Map(pair.map(code => [code, new Set()])));
        for (const code of matched) byDay.get(day).get(code).add(row);
      }
      for (const [day, codeRows] of byDay) {
        for (const code of pair) {
          const other = pair.find(value => value !== code);
          if (!codeRows.get(code).size || !codeRows.get(other).size) continue;
          for (const row of codeRows.get(code)) {
            addRowWarning(row, `Không đi chung ngày ${day} với DVKT ${other}.`);
          }
        }
      }
    }

    // 3) Nhóm biến thể 10.0701... và 10.0463... loại trừ nhau trong cùng ngày.
    const exclusiveDvktCodeGroups = [{
      groupA: ["10.0701.0491", "10.0701.0491_GT"],
      groupB: ["10.0463.0465", "10.0463.0465_TT"]
    }];
    for (const rule of exclusiveDvktCodeGroups) {
      const byDay = new Map();
      for (const row of rows) {
        const day = rowDay(row);
        if (!day) continue;
        const codes = rowCodes(row);
        const presentA = rule.groupA.filter(code => codes.has(code));
        const presentB = rule.groupB.filter(code => codes.has(code));
        if (!presentA.length && !presentB.length) continue;
        if (!byDay.has(day)) byDay.set(day, { groupA: new Set(), groupB: new Set() });
        presentA.forEach(code => byDay.get(day).groupA.add(code));
        presentB.forEach(code => byDay.get(day).groupB.add(code));
      }
      for (const [day, groups] of byDay) {
        if (!groups.groupA.size || !groups.groupB.size) continue;
        for (const row of rows) {
          if (rowDay(row) !== day) continue;
          const codes = rowCodes(row);
          if (rule.groupA.some(code => codes.has(code))) {
            addRowWarning(row, `Không đi chung ngày ${day} với nhóm ${[...groups.groupB].join(" / ")}.`);
          }
          if (rule.groupB.some(code => codes.has(code))) {
            addRowWarning(row, `Không đi chung ngày ${day} với nhóm ${[...groups.groupA].join(" / ")}.`);
          }
        }
      }
    }

    // 4) Cặp loại trừ trên toàn đợt điều trị, không phụ thuộc ngày.
    const episodeExclusivePair = ["02.0440.0054", "02.0101.0054"];
    const episodeRowsByCode = new Map(episodeExclusivePair.map(code => [code, new Set()]));
    for (const row of rows) {
      const codes = rowCodes(row);
      for (const code of episodeExclusivePair) if (codes.has(code)) episodeRowsByCode.get(code).add(row);
    }
    if (episodeRowsByCode.get(episodeExclusivePair[0]).size && episodeRowsByCode.get(episodeExclusivePair[1]).size) {
      for (const code of episodeExclusivePair) {
        const other = episodeExclusivePair.find(value => value !== code);
        for (const row of episodeRowsByCode.get(code)) {
          addRowWarning(row, `Không được đi chung trong cùng đợt điều trị với DVKT ${other}.`);
        }
      }
    }

    // 5) Nhóm DVKT bắt buộc đi kèm hai chiều theo cùng ngày y lệnh.
    const addCompanionWarnings = (triggerCodes, companionCodes, triggerLabel, companionLabel) => {
      const allCodes = [...triggerCodes, ...companionCodes];
      const byDay = new Map();
      for (const row of rows) {
        const day = rowDay(row);
        if (!day) continue;
        const codes = allCodes.filter(code => rowCodes(row).has(code));
        if (!codes.length) continue;
        if (!byDay.has(day)) byDay.set(day, { triggerRows: new Set(), companionRows: new Set(), triggers: new Set(), companions: new Set() });
        const bucket = byDay.get(day);
        for (const code of codes) {
          if (triggerCodes.includes(code)) { bucket.triggers.add(code); bucket.triggerRows.add(row); }
          if (companionCodes.includes(code)) { bucket.companions.add(code); bucket.companionRows.add(row); }
        }
      }
      for (const [day, bucket] of byDay) {
        if (bucket.triggerRows.size && !bucket.companionRows.size) {
          for (const row of bucket.triggerRows) {
            addRowWarning(row, `Thiếu mã DVKT bắt buộc đi kèm (${companionLabel}) trong ngày ${day}.`);
          }
        } else if (bucket.companionRows.size && !bucket.triggerRows.size) {
          for (const row of bucket.companionRows) {
            addRowWarning(row, `Mã này cần đi kèm ít nhất một DVKT thuộc nhóm ${triggerLabel} trong ngày ${day}.`);
          }
        }
      }
    };
    const triggerCodes1 = ["02.0304.0134", "02.0309.0138", "02.0262.0136"];
    const companionCodes1 = ["25.0030.1751"];
    addCompanionWarnings(triggerCodes1, companionCodes1, triggerCodes1.join(" / "), companionCodes1.join(" / "));
    const triggerCodes2 = [
      "03.1858.1012", "16.0050.1015", "16.0050.1014",
      "16.0050.1013", "16.0050.1012", "16.0051.1014"
    ];
    const companionCodes2 = ["18.0081.2001", "18.0081.0028"];
    addCompanionWarnings(triggerCodes2, companionCodes2, triggerCodes2.join(" / "), companionCodes2.join(" / "));

    // 6) Thời điểm y lệnh/thực hiện/trả kết quả nằm ngoài đợt: gắn vào đúng DVKT.
    for (const row of rows) {
      const rowViolations = auditTimeViolations([row], auditState.context, false);
      for (const violation of rowViolations) {
        addRowWarning(row,
          `${violation.kind}${violation.field ? ` (${violation.field})` : ""}: ${violation.reason}, lệch ${violation.minutes} phút.`);
      }
    }

    // Bảng chỉ ghi cảnh báo khi có vi phạm thật. Dòng sạch để trống cột Cảnh báo.
    const displayRows = rows.map(row => {
      const points = Array.isArray(row.timePoints) ? row.timePoints : [];
      const ylenh = points.filter(x => x.kind === "Y lệnh").map(x => `${x.field}: ${x.value}`).join(" | ");
      const thuchien = points.filter(x => x.kind === "Thực hiện").map(x => `${x.field}: ${x.value}`).join(" | ");
      const resultPoints = points.filter(x => String(x.kind || "").startsWith("Kết quả"));
      const ketqua = resultPoints.map(x => `${x.field}: ${x.value}`).join(" | ");
      const warningList = [...(rowWarnings.get(row) || [])];
      return {
        code: row.bhytCode || row.hisCode || row.serviceCode,
        name: row.name,
        quantity: row.quantity,
        ylenh,
        thuchien,
        ketqua,
        status: warningList.join("; "),
        hasWarning: warningList.length > 0,
        // Order day/time (else the first performed/result one): used by QUÉT.
        day: auditDateOnly(rowOrderSource(row, points)),
        dateTime: auditDateTimeText(rowOrderSource(row, points))
      };
    });
    // Every row (clean or not) for the QUÉT "Dòng XN" table; the panel table
    // itself may hide clean rows when "Chỉ lỗi" is on.
    dvktLastDisplayRows = displayRows;

    const summary = auditElement("div", "hth-audit-summary hth-audit-summary-single");
    const k1 = auditElement("div", "hth-audit-kpi");
    k1.append(auditElement("span", "hth-audit-muted", "Dòng DVKT"), auditElement("b", "", rows.length));
    summary.appendChild(k1);
    body.appendChild(summary);

    auditTable(body, "DANH SÁCH DVKT VÀ CÁC MỐC THỜI GIAN", displayRows,
      ["Mã DVKT", "Tên DVKT", "SL", "Y lệnh", "Thực hiện", "Kết quả", "Cảnh báo"],
      ["code", "name", "quantity", "ylenh", "thuchien", "ketqua", "status"],
      "Chưa thu thập được dữ liệu DVKT.", {
        tableClass: "hth-audit-dvkt-table",
        rowClass: row => row.hasWarning ? "hth-audit-dvkt-row-bad" : "",
        cellClasses: { status: "hth-audit-dvkt-warning-cell" }
      });
  }
  const onceDailyRuleCodes = new Set(["40.666", "40.677", "40.678", "40.679", "40.68", "40.671", "40.662", "40.491"]);
  // BHYT 40.87 (Fexofenadine): maximum one tablet and one administration per day.
  const oneTabletOnceDailyCodes = new Set(["40.87"]);
  const allFrequencyRuleCodes = new Set([...onceDailyRuleCodes, ...oneTabletOnceDailyCodes]);
  function auditDoseFrequency(row) {
    const code = String(row && row.bhytCode || "").replace(/\s+/g, "");
    const isOnceDaily = onceDailyRuleCodes.has(code);
    const isOneTabletOnceDaily = oneTabletOnceDailyCodes.has(code);
    if (!isOnceDaily && !isOneTabletOnceDaily) return null;

    // Vilanta thuoc nhom khac: loai tru rieng theo ten thuoc, khong dua vao
    // ma BHYT 40.671 de loai tru ca nhung thuoc khac cung ma.
    if (domToken(row && row.name).includes("VILANTA")) return null;

    // Quy tac tan suat/lieu dang vien chi ap dung cho don vi vien (ke ca
    // vien nen/vien nang). Khong bat cac dang goi, ong, chai, lo hoac tiem/truyen.
    const unitToken = domToken(row && row.unit);
    const isTabletUnit = /^VIEN(?:$|NEN|NANG|BAO|SUI|NGAM)/.test(unitToken);
    if (!isTabletUnit) return null;

    // Chỉ căn cứ trường LIỀU DÙNG (LIEUDUNG), không dùng Hướng dẫn sử dụng/Cách dùng.
    const sourceText = auditText(row && row.doseText);
    const folded = sourceText.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      .replace(/[×✕]/g, "x").replace(/[‐‑‒–—]/g, "-");
    const frequencyValues = [];
    const pillValues = [];
    const numberWord = { mot: 1, hai: 2, ba: 3, bon: 4, nam: 5, sau: 6 };
    const addValue = (target, value) => {
      const n = Number(String(value).replace(",", "."));
      if (Number.isFinite(n) && n > 0) target.push(n);
    };

    // Accept compact/normal Vietnamese variants: 1lan, 1lần, 1 lần,
    // 1 lần/ngày, 1lan/ngay, 2 lần mỗi ngày, ngày 2 lần, etc.
    const reNumericTimes = /(\d+(?:[.,]\d+)?)\s*lan\b/g;
    let m;
    while ((m = reNumericTimes.exec(folded)) !== null) addValue(frequencyValues, m[1]);
    const reWordTimes = /\b(mot|hai|ba|bon|nam|sau)\s*lan\b/g;
    while ((m = reWordTimes.exec(folded)) !== null) addValue(frequencyValues, numberWord[m[1]]);

    // Count distinct daily administrations when written as day-parts, e.g.
    // "Sáng 1 viên, Chiều 1 viên" (without requiring spaces around numbers).
    const hasDoseCue = /(?:\d+(?:[.,]\d+)?\s*(?:vien|goi|ong|lo|ml|mg)|\d+\s*lan|uongs?|tiem|dung)/.test(folded);
    if (hasDoseCue) {
      const dayParts = new Set((folded.match(/\b(sang|trua|chieu|toi|dem)\b/g) || []));
      if (dayParts.size > 0) frequencyValues.push(dayParts.size);
    }

    // For BHYT 40.87, also enforce no more than one tablet per dose/day.
    // This catches "2 viên/lần", "2 viên/ngày", "2vien/lan", etc.
    let doseAmount = null;
    if (isOneTabletOnceDaily) {
      const reNumericPills = /(\d+(?:[.,]\d+)?)\s*vien\b/g;
      while ((m = reNumericPills.exec(folded)) !== null) addValue(pillValues, m[1]);
      const reWordPills = /\b(mot|hai|ba|bon|nam|sau)\s*vien\b/g;
      while ((m = reWordPills.exec(folded)) !== null) addValue(pillValues, numberWord[m[1]]);
      doseAmount = pillValues.length ? Math.max(...pillValues) : null;

      // "1 viên/ngày" is itself an explicit once-daily regimen.
      if (!frequencyValues.length && /vien\s*(?:\/\s*ngay|moi\s*ngay)\b/.test(folded)) {
        frequencyValues.push(1);
      }
    }

    const frequency = frequencyValues.length ? Math.max(...frequencyValues) : null;
    const frequencyViolation = frequency !== null && frequency > 1;
    const doseViolation = isOneTabletOnceDaily && doseAmount !== null && doseAmount > 1;
    const isViolation = frequencyViolation || doseViolation;
    const isUnknown = !isViolation && (frequency === null || (isOneTabletOnceDaily && doseAmount === null));
    return { code, frequency, doseAmount, sourceText, isViolation, isUnknown,
      violationReason: doseViolation && frequencyViolation ? "Trên 1 viên và trên 1 lần/ngày" :
        (doseViolation ? "Trên 1 viên" : (frequencyViolation ? "Trên 1 lần/ngày" : "")) };
  }

  const under18MedicineCodes = new Set(["40.231", "40.232", "40.228", "40.229"]);
  function auditAgeAtOrder(row, context) {
    const code = String(row && row.bhytCode || "").replace(/\s+/g, "");
    if (!under18MedicineCodes.has(code)) return null;
    const birthDateText = auditText(context && (context.dateOfBirth || context.dob || context.birthYear || context.yearOfBirth || context.namSinh));
    const orderDateText = auditText(row && row.orderDate);
    const birthDate = auditDateTime(birthDateText);
    const orderDate = auditDateTime(orderDateText);

    // HIS may return only a birth year (NGAYSINH/NAMSINH without day/month).
    // Per requested hospital rule, use the current calendar year minus that birth year.
    // This fallback intentionally does not estimate a birthday within the year.
    const yearOnlyText = birthDateText.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .trim().match(/^(?:nam\s*sinh\s*[:：]?\s*)?((?:18|19|20)\d{2})$/i);
    if (!birthDate && yearOnlyText) {
      const birthYear = Number(yearOnlyText[1]);
      const currentYear = new Date().getFullYear();
      if (birthYear >= 1900 && birthYear <= currentYear) {
        const age = currentYear - birthYear;
        return { code, age, isViolation: age < 18, isUnknown: false, birthDate: birthDateText,
          birthYear, ageBasis: "current-year-minus-birth-year", orderDate: orderDateText };
      }
      return { code, age: null, isViolation: false, isUnknown: true, birthDate: birthDateText, orderDate: orderDateText };
    }

    if (!birthDate || !orderDate) {
      return { code, age: null, isViolation: false, isUnknown: true, birthDate: birthDateText, orderDate: orderDateText };
    }
    // A full date of birth is evaluated against the actual medication order date.
    if (birthDate.getFullYear() < 1900 || orderDate.getTime() < birthDate.getTime()) {
      return { code, age: null, isViolation: false, isUnknown: true, birthDate: birthDateText, orderDate: orderDateText };
    }
    let age = orderDate.getFullYear() - birthDate.getFullYear();
    if (orderDate.getMonth() < birthDate.getMonth() ||
        (orderDate.getMonth() === birthDate.getMonth() && orderDate.getDate() < birthDate.getDate())) age--;
    return { code, age, isViolation: age < 18, isUnknown: false, birthDate: birthDateText, orderDate: orderDateText };
  }

  // OXY rule follows the user's Access queries exactly:
  // OXY interval = NGAY_YL + Int(SO_LUONG / 600) hours.
  // Flag (1) interval ends after discharge and (2) any overlap with ventilation
  // services 01.0128.0209 / 01.0132.0209, whose interval is NGAY_YL -> NGAY_KQ.
  function auditOxyNumber(value) {
    let s = auditText(value).replace(/\s/g, "");
    if (!s) return null;
    if (s.includes(",") && s.includes(".")) {
      if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
      else s = s.replace(/,/g, "");
    } else if (s.includes(",")) {
      s = /,\d{1,2}$/.test(s) ? s.replace(",", ".") : s.replace(/,/g, "");
    } else if (/\.\d{3}$/.test(s)) {
      s = s.replace(/\./g, "");
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  function auditMinuteBoundaries(start, end) {
    return Math.floor(end.getTime() / 60000) - Math.floor(start.getTime() / 60000);
  }
  function auditBuildOxyChecks(medicineRows, dvktRows, context) {
    const oxyRows = medicineRows.filter(row => {
      const normalizedName = domToken(row.name);
      return row.isOxy || auditText(row.hisCode).toUpperCase() === "OXY" ||
        auditText(row.bhytCode) === "40.17" || normalizedName === "OXY" ||
        normalizedName === "OXYGEN" || normalizedName.includes("LIQUIDOXYGEN") ||
        normalizedName.includes("MEDICALOXYGEN") || normalizedName.includes("OXYGENMEDICAL");
    });
    const discharge = auditDateTime(context && context.dischargeDate, "discharge");
    const oxyIntervals = oxyRows.map(row => {
      const start = auditDateTime(row.oxyStartAt || row.orderDate);
      const quantity = auditOxyNumber(row.oxyQuantity !== undefined && row.oxyQuantity !== "" ? row.oxyQuantity : row.quantity);
      // Access expression: Int(Nz(SO_LUONG,0)/600). Missing quantity becomes 0.
      const durationHours = Math.floor((quantity === null ? 0 : quantity) / 600);
      const end = start ? new Date(start.getTime() + durationHours * 3600000) : null;
      const outsideMinutes = end && discharge && end.getTime() > discharge.getTime()
        ? auditMinuteBoundaries(discharge, end) : null;
      return { row, start, end, quantity, durationHours, discharge, outsideMinutes };
    });

    const ventilationMap = new Map();
    const ventilationCodes = new Set(["01.0128.0209", "01.0132.0209"]);
    const localVentilationCodes = new Set(["PT0032", "PT0034"]);
    const normalizeVentName = value => domToken(value).replace(/[^A-Z0-9]/g, "");
    const ventilationCandidates = [...dvktRows];
    // The existing service-time collector already sees PTTT rows named
    // "Thông khí nhân tạo ...". Reuse its complete start/end interval as a
    // fallback because PTTT RestService may expose PT0032 instead of the XML3 code.
    // This does not change the legacy timing panel; it only feeds the OXY audit.
    try {
      if (typeof hthGetVentilationIntervals === "function") {
        for (const item of hthGetVentilationIntervals()) {
          ventilationCandidates.push({
            hisCode: item.serviceCode || "", bhytCode: item.serviceCode || "",
            name: item.serviceName || "", ventilatorStartAt: item.start || "",
            ventilatorEndAt: item.end || "", rowId: item.rowKey || "",
            orderDate: item.start || "", ventilationSource: "Bảng thời gian dịch vụ HIS"
          });
        }
      }
    } catch (_) {}
    for (const row of ventilationCandidates) {
      const rowCodes = [auditText(row.bhytCode), auditText(row.hisCode), auditText(row.serviceCode)]
        .map(code => code.replace(/\s/g, "").toUpperCase());
      const exactCode = rowCodes.find(value => ventilationCodes.has(value)) || "";
      const localCode = rowCodes.find(value => localVentilationCodes.has(value)) || "";
      const normalizedName = normalizeVentName(row.name || row.serviceName);
      const nameMatch = normalizedName.includes("THONGKHINHANTAO") || normalizedName.includes("MECHANICALVENTILATION");
      if (!exactCode && !localCode && !nameMatch) continue;
      const code = exactCode || localCode || (row.hisCode || row.serviceCode || "Thông khí nhân tạo");
      const start = auditDateTime(row.ventilatorStartAt || row.orderDate || row.start);
      const end = auditDateTime(row.ventilatorEndAt || row.end || "");
      const key = [normalizeVentName(row.name || row.serviceName), start ? start.getTime() : "", end ? end.getTime() : ""].join("|");
      const previous = ventilationMap.get(key);
      // Prefer the official XML3 code when the same interval is also present in
      // the local HIS PTTT/service-time cache; avoid counting the same interval twice.
      const previousIsExact = previous && ventilationCodes.has(previous.code);
      const currentIsExact = ventilationCodes.has(code);
      if (!previous || (!previousIsExact && currentIsExact) || (!previous.end && end)) {
        ventilationMap.set(key, { row, code, start, end });
      }
    }
    const ventilationIntervals = Array.from(ventilationMap.values());
    const overlaps = [];
    for (const oxy of oxyIntervals) {
      if (!oxy.start || !oxy.end) continue;
      for (const vent of ventilationIntervals) {
        if (!vent.start || !vent.end) continue;
        // Access predicate: OXY start < ventilator end AND OXY end > ventilator start.
        if (oxy.start.getTime() < vent.end.getTime() && oxy.end.getTime() > vent.start.getTime()) {
          const overlapStart = oxy.start.getTime() > vent.start.getTime() ? oxy.start : vent.start;
          const overlapEnd = oxy.end.getTime() < vent.end.getTime() ? oxy.end : vent.end;
          overlaps.push({
            oxy, vent, overlapStart, overlapEnd,
            minutes: auditMinuteBoundaries(overlapStart, overlapEnd)
          });
        }
      }
    }
    return {
      oxyRows, oxyIntervals,
      outsideRows: oxyIntervals.filter(item => item.outsideMinutes !== null),
      unknownRows: oxyIntervals.filter(item => !item.start || !item.end),
      ventilationIntervals,
      ventilationUnknownRows: ventilationIntervals.filter(item => !item.start || !item.end),
      overlaps
    };
  }
  function auditFormatDateTime(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "Chưa có thời gian";
    const pad = n => String(n).padStart(2, "0");
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  function renderDrugPanel() {
    const body = drugUI.body; body.replaceChildren();
    const rows = Array.from(auditState.medicineRows.values());
    body.appendChild(auditElement("div", "hth-audit-muted", auditCaseLabel(auditState.context)));

    // Warnings are attached to the exact medicine row. Missing data and
    // successful checks stay silent; only confirmed violations get red rows.
    const rowWarnings = new Map();
    const addDrugWarning = (row, message) => {
      if (!row || !message) return;
      if (!rowWarnings.has(row)) rowWarnings.set(row, new Set());
      rowWarnings.get(row).add(message);
    };

    // Dose-frequency rules.
    for (const row of rows) {
      const info = auditDoseFrequency(row);
      if (info && info.isViolation) {
        addDrugWarning(row, `Sai liều dùng/tần suất (${info.code}): ${info.violationReason}.`);
      }
    }

    // Under-18 drug restrictions.
    for (const row of rows) {
      const info = auditAgeAtOrder(row, auditState.context);
      if (info && info.isViolation) {
        addDrugWarning(row, `Không phù hợp độ tuổi: mã ${info.code}, người bệnh ${info.age} tuổi (dưới 18 tuổi tại ngày y lệnh).`);
      }
    }

    // Medication order time outside the admission-discharge interval.
    for (const row of rows) {
      for (const violation of auditTimeViolations([row], auditState.context, true)) {
        addDrugWarning(row,
          `${violation.kind}${violation.field ? ` (${violation.field})` : ""}: ${violation.reason}, lệch ${violation.minutes} phút.`);
      }
    }

    // OXY-after-discharge and OXY/ventilator overlap are shown on the OXY
    // medicine row itself; no separate green/yellow OXY status panels.
    const oxyAudit = auditBuildOxyChecks(rows, Array.from(auditState.dvktRows.values()), auditState.context);
    for (const item of oxyAudit.outsideRows) {
      addDrugWarning(item.row,
        `OXY kết thúc sử dụng sau giờ ra viện ${item.outsideMinutes} phút (kết thúc ${auditFormatDateTime(item.end)}; ra viện ${auditFormatDateTime(item.discharge)}).`);
    }
    for (const item of oxyAudit.overlaps) {
      addDrugWarning(item.oxy.row,
        `OXY chồng lấp thời gian thở máy ${item.vent.code} (${auditFormatDateTime(item.overlapStart)} – ${auditFormatDateTime(item.overlapEnd)}; ${item.minutes} phút).`);
    }

    const displayRows = rows.map(row => {
      const warningList = [...(rowWarnings.get(row) || [])];
      return {
        name: row.name,
        quantity: `${row.quantity || ""} ${row.unit || ""}`.trim(),
        route: row.route,
        orderDate: row.orderDate,
        doseText: row.doseText || "",
        warning: warningList.join("; "),
        hasWarning: warningList.length > 0
      };
    });
    // Columns line up with the medicine table (name, …, order time in the 4th
    // column, warning last) so QUÉT reads these rows as [Thuốc] errors.
    const xrayMissing = auditXrayWithoutXenetix().map(({ row, day, sameDay }) => ({
      name: `${row.bhytCode || row.hisCode || ""} ${row.name || ""}`.trim(),
      quantity: row.quantity || "", route: "", orderDate: row.orderDate || "", doseText: "",
      warning: sameDay ? `Chụp X-quang ngày ${day} không có thuốc Xenetix 300 cùng ngày.` : "Chụp X-quang không có thuốc Xenetix 300.",
      hasWarning: true
    }));
    auditTable(body, "DVKT CHỤP X-QUANG THIẾU XENETIX 300", xrayMissing,
      ["DVKT", "Số lượng", "", "Thời gian y lệnh", "", "Cảnh báo"],
      ["name", "quantity", "route", "orderDate", "doseText", "warning"],
      "", { rowClass: "hth-audit-drug-row-bad", cellClasses: { warning: "hth-audit-dvkt-warning-cell" } });
    auditTable(body, "DANH SÁCH THUỐC ĐÃ THU THẬP", displayRows,
      ["Tên thuốc", "Số lượng", "Đường dùng", "Thời gian y lệnh", "Liều dùng", "Cảnh báo"],
      ["name", "quantity", "route", "orderDate", "doseText", "warning"],
      "", {
        rowClass: row => row.hasWarning ? "hth-audit-drug-row-bad" : "",
        cellClasses: { warning: "hth-audit-dvkt-warning-cell" }
      });
  }
  function renderContrastPanel() {
    const body = contrastUI.body; body.replaceChildren();
    const services = Array.from(auditState.contrastServices.values());
    const medicines = Array.from(auditState.contrastMedicines.values());
    const serviceQty = services.reduce((sum, row) => sum + auditQty(row.quantity), 0);
    const medicineQty = medicines.reduce((sum, row) => sum + auditQty(row.quantity), 0);
    body.appendChild(auditElement("div", "hth-audit-muted", auditCaseLabel(auditState.context)));

    const serviceWarnings = new Map();
    const medicineWarnings = new Map();
    const addWarning = (map, row, message) => {
      if (!row || !message) return;
      if (!map.has(row)) map.set(row, new Set());
      map.get(row).add(message);
    };

    // Compare only when both sides have been collected and all their order
    // dates are known. A confirmed daily quantity difference is attached to
    // the actual service and medicine rows for that date. Otherwise stay silent.
    if (services.length && medicines.length &&
        services.every(row => !!auditDateOnly(row.orderDate)) &&
        medicines.every(row => !!auditDateOnly(row.orderDate))) {
      const serviceByDay = new Map();
      const medicineByDay = new Map();
      for (const row of services) {
        const day = auditDateOnly(row.orderDate);
        if (!serviceByDay.has(day)) serviceByDay.set(day, []);
        serviceByDay.get(day).push(row);
      }
      for (const row of medicines) {
        const day = auditDateOnly(row.orderDate);
        if (!medicineByDay.has(day)) medicineByDay.set(day, []);
        medicineByDay.get(day).push(row);
      }
      const days = [...new Set([...serviceByDay.keys(), ...medicineByDay.keys()])].sort();
      for (const day of days) {
        const serviceRows = serviceByDay.get(day) || [];
        const medicineRows = medicineByDay.get(day) || [];
        const dayServiceQty = serviceRows.reduce((sum, row) => sum + auditQty(row.quantity), 0);
        const dayMedicineQty = medicineRows.reduce((sum, row) => sum + auditQty(row.quantity), 0);
        if (Math.abs(dayServiceQty - dayMedicineQty) < 0.000001) continue;
        const message = `Sai lệch số lượng thuốc cản quang ngày ${day}: DVKT ${dayServiceQty}; thuốc ${dayMedicineQty}.`;
        for (const row of serviceRows) addWarning(serviceWarnings, row, message);
        for (const row of medicineRows) addWarning(medicineWarnings, row, message);
      }
    }

    const serviceDisplay = services.map(row => {
      const warnings = [...(serviceWarnings.get(row) || [])];
      return {
        code: row.bhytCode,
        name: row.name,
        quantity: row.quantity,
        orderDate: row.orderDate,
        performedAt: row.performedAt,
        resultAt: row.resultAt,
        warning: warnings.join("; "),
        hasWarning: warnings.length > 0
      };
    });
    const medicineDisplay = medicines.map(row => {
      const warnings = [...(medicineWarnings.get(row) || [])];
      return {
        code: `${row.bhytCode} (${row.hisCode})`,
        name: row.name,
        quantity: `${row.quantity || ""} ${row.unit || ""}`.trim(),
        orderDate: row.orderDate,
        route: row.route,
        usage: row.usage,
        warning: warnings.join("; "),
        hasWarning: warnings.length > 0
      };
    });

    if (services.length || medicines.length) {
      const summary = auditElement("div", "hth-audit-summary");
      const k1 = auditElement("div", "hth-audit-kpi");
      k1.append(auditElement("span", "hth-audit-muted", "DVKT cản quang"),
        auditElement("b", "", `${services.length} dòng · SL ${serviceQty}`));
      const k2 = auditElement("div", "hth-audit-kpi");
      k2.append(auditElement("span", "hth-audit-muted", "Thuốc 40.642 / 40.644"),
        auditElement("b", "", `${medicines.length} dòng · SL ${medicineQty}`));
      summary.append(k1, k2); body.appendChild(summary);
    }

    auditTable(body, "DVKT CẢN QUANG", serviceDisplay,
      ["Mã BHYT", "Tên DVKT", "SL", "Y lệnh", "Thực hiện", "Kết quả", "Cảnh báo"],
      ["code", "name", "quantity", "orderDate", "performedAt", "resultAt", "warning"],
      "", {
        rowClass: row => row.hasWarning ? "hth-audit-dvkt-row-bad" : "",
        cellClasses: { warning: "hth-audit-dvkt-warning-cell" }
      });
    auditTable(body, "THUỐC CẢN QUANG", medicineDisplay,
      ["Mã BHYT (HIS)", "Tên thuốc", "SL", "Y lệnh", "Đường dùng", "Hướng dẫn", "Cảnh báo"],
      ["code", "name", "quantity", "orderDate", "route", "usage", "warning"],
      "", {
        rowClass: row => row.hasWarning ? "hth-audit-drug-row-bad" : "",
        cellClasses: { warning: "hth-audit-dvkt-warning-cell" }
      });
  }

  function parseDate(value) {
    const m = String(value || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    return m ? new Date(+m[3], +m[2]-1, +m[1], +m[4], +m[5], +(m[6] || 0)) : null;
  }
  function elapsedSeconds(start, end) {
    const a = parseDate(start), b = parseDate(end);
    if (!a || !b || b < a) return null;
    return Math.round((b - a) / 1000);
  }
  function elapsed(start, end) {
    const seconds = elapsedSeconds(start, end);
    return seconds === null ? null : Math.round((seconds / 60) * 100) / 100;
  }
  function formatDuration(seconds) {
    if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return "Không tính được";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h} giờ ${m} phút ${s} giây`;
  }
  function num(value) {
    const s = String(value ?? "").trim().replace(",", ".");
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  function serviceText(row) {
    return (String(row.serviceCode || "") + " " + String(row.serviceName || "")).toLowerCase();
  }
  function isSuction(row) {
    // Giữ quy tắc từ v3.2.3: mã PT0022 là dịch vụ hút đờm.
    // Dùng ranh giới ký tự đúng để không lỗi escape khoảng trắng.
    const code = String(row && row.serviceCode || "").trim().toUpperCase();
    if (/(?:^|[^A-Z0-9])PT0022(?:$|[^A-Z0-9])/.test(code)) return true;
    // Dự phòng khi HIS không trả mã dịch vụ; chỉ nhận tên rõ ràng là hút đờm.
    if (code) return false;
    const name = String(row && row.serviceName || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return name.includes("hut dom") && (name.includes("ong noi khi quan") || name.includes("canuyn mo khi quan"));
  }
  function isVentilation(row) {
    // Chỉ nhận PT0034 / thông khí nhân tạo là dịch vụ thở máy.
    // PT0022 có chữ "có thở máy" trong tên vẫn phải là hút đờm.
    if (isSuction(row)) return false;
    const text = serviceText(row);
    const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return /(?:^|[^a-z0-9])pt0034(?:$|[^a-z0-9])/.test(normalized) ||
      normalized.includes("thong khi nhan tao") || normalized.includes("ventilat");
  }

  function hthVentKey(row, scope = "") {
    const norm = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    return [scope, norm(row.serviceCode), norm(row.serviceName), String(row.start || ""), String(row.end || "")].join("|");
  }
  function hthClearVentilationCache() {
    ventilationIntervalCache.clear();
    ventilationIntervalCase = "";
  }
  function hthRememberVentilationIntervals(rows) {
    const visibleCase = String(readVisibleEncounter() || currentVisibleEncounter || "").trim().toUpperCase();
    if (visibleCase && ventilationIntervalCase && visibleCase !== ventilationIntervalCase) {
      hthClearVentilationCache();
    }
    if (visibleCase) ventilationIntervalCase = visibleCase;
    let changed = false;
    for (const row of Array.isArray(rows) ? rows : []) {
      if (!row || !isVentilation(row)) continue;
      const start = normalizeDateTime(row.start || "");
      const end = normalizeDateTime(row.end || "");
      if (!start || !end || elapsedSeconds(start, end) === null) continue;

      const rowCase = String(row.caseKey || "").trim().toUpperCase();
      // Ignore clearly stale responses from a different BA. Some HIS responses only
      // carry a patient ID or an internal numeric key, so those are scoped to the
      // currently visible encounter instead of being used to clear the cache.
      if (visibleCase && /^BA\d{6,}$/i.test(rowCase) && rowCase !== visibleCase) continue;
      const scope = visibleCase || rowCase || ventilationIntervalCase || "CURRENT";
      const normalizedRow = { ...row, start, end, ventilationScope: scope };
      const key = hthVentKey(normalizedRow, scope);
      if (!ventilationIntervalCache.has(key)) {
        ventilationIntervalCache.set(key, normalizedRow);
        changed = true;
      }
    }
    // Bounds memory in exceptionally long encounters while retaining far more than
    // a normal screen could display. The cache only stores complete PT0034 intervals.
    while (ventilationIntervalCache.size > 800) {
      const oldest = ventilationIntervalCache.keys().next().value;
      ventilationIntervalCache.delete(oldest);
    }
    return changed;
  }
  function hthGetVentilationIntervals() {
    const merged = new Map();
    const candidates = [...currentRows, ...ventilationIntervalCache.values()];
    for (const row of candidates) {
      if (!row || !isVentilation(row) || !String(row.start || "").trim() || !String(row.end || "").trim()) continue;
      const key = hthVentKey(row);
      if (!merged.has(key)) merged.set(key, row);
    }
    return Array.from(merged.values()).sort((a, b) => {
      const parse = value => {
        const m = String(value || "").match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
        return m ? new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6]).getTime() : 0;
      };
      return parse(a.start) - parse(b.start);
    });
  }
  function isElectromyography(row) {
    // Quy tắc riêng cho CĐHA: dịch vụ "Ghi điện cơ" (ví dụ mã HA207)
    // cần tối thiểu 30 phút; chuẩn hóa dấu để nhận cả tên không dấu.
    const normalizedName = String(row.serviceName || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const code = String(row.serviceCode || "").trim().toUpperCase();
    return /ghi\s*dien\s*co/.test(normalizedName) || code === "HA207";
  }
  function containedIn(sStart, sEnd, vStart, vEnd) {
    const s1 = parseDate(sStart), s2 = parseDate(sEnd), v1 = parseDate(vStart), v2 = parseDate(vEnd);
    if (!s1 || !s2 || !v1 || !v2 || s2 < s1 || v2 < v1) return false;
    return s1 >= v1 && s2 <= v2;
  }
  function getStatus(actual, expected) {
    if (actual === null || expected === null || !Number.isFinite(expected) || expected <= 0)
      return {text: "Kiểm tra giờ/dữ liệu", cls: "hth-warn"};
    if (actual + 0.01 < expected) return {text: "Thấp hơn thời gian dự kiến", cls: "hth-bad"};
    return {text: "Đạt hoặc vượt thời gian dự kiến", cls: "hth-good"};
  }
  function addLine(grid, label, value, cls) {
    const item = document.createElement("div");
    item.textContent = label + ": " + value;
    if (cls) item.className = cls;
    grid.appendChild(item);
  }
  // Read bed start/end from the visible VNPT-HIS grid when the RestService
  // payload omits these fields. This runs only after a user click or relevant
  // service response; it does not poll or observe the whole page continuously.
  function hthHeaderNorm(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toUpperCase().replace(/[^A-Z0-9]/g, "");
  }
  function hthCells(row) {
    return Array.from(row.querySelectorAll(":scope > td, :scope > th, :scope > [role='gridcell'], :scope > [role='columnheader']"));
  }
  function hthTimingGridRoot(element) {
    if (!element || !element.closest) return element;
    // VNPT-HIS commonly uses jqGrid, whose header and body are separate tables.
    // Resolve both tables to the same grid root before looking up column indexes.
    return element.closest(".ui-jqgrid") || element.closest("[role='grid']") || element.closest("table") || element;
  }
  function hthFindTimingHeader(element) {
    const root = hthTimingGridRoot(element);
    if (!root) return null;
    const tables = [];
    if (root.matches && root.matches("table")) tables.push(root);
    if (root.querySelectorAll) tables.push(...Array.from(root.querySelectorAll("table")));
    const uniqueTables = Array.from(new Set(tables)).filter(table => !insideHelperUI(table));

    for (const headerTable of uniqueTables) {
      const rows = headerTable.rows ? Array.from(headerTable.rows).slice(0, 16)
        : Array.from(headerTable.querySelectorAll("tr,[role='row']")).slice(0, 16);
      for (let i = 0; i < rows.length; i++) {
        const cells = hthCells(rows[i]);
        if (!cells.length) continue;
        const labels = cells.map(cell => hthHeaderNorm(cell.innerText || cell.textContent || ""));
        const startIndex = labels.findIndex(label => label === "TGBATDAU" || label === "THOIGIANBATDAU" || label.includes("TGBATDAU"));
        const endIndex = labels.findIndex(label => label === "TGKETTHUC" || label === "THOIGIANKETTHUC" || label.includes("TGKETTHUC"));
        if (startIndex < 0 || endIndex < 0 || startIndex === endIndex) continue;
        const ticketIndex = labels.findIndex(label => label === "SOPHIEU" || label === "PHIEUDICHVU" || label === "SOPHIEUDICHVU");
        const sameTableRows = headerTable.rows ? Array.from(headerTable.rows).slice(i + 1)
          : Array.from(headerTable.querySelectorAll("tr,[role='row']")).slice(i + 1);
        // In jqGrid, header and data are split between .ui-jqgrid-htable and
        // .ui-jqgrid-btable. In ordinary tables, the data rows share the table.
        let bodyTables;
        if (root !== headerTable) {
          bodyTables = uniqueTables.filter(table => table !== headerTable && (
            table.matches(".ui-jqgrid-btable") || table.querySelector("tbody tr, tr td, [role='row'] [role='gridcell']")
          ));
          bodyTables.sort((a, b) => Number(b.matches(".ui-jqgrid-btable")) - Number(a.matches(".ui-jqgrid-btable")));
        } else {
          bodyTables = [headerTable];
        }
        return { root, headerTable, headerRow: rows[i], headerIndex: i, startIndex, endIndex, ticketIndex, bodyTables, sameTableRows };
      }
    }
    return null;
  }
  function hthTimingRows(info) {
    if (!info) return [];
    const rows = [];
    const maxIndex = Math.max(info.startIndex, info.endIndex, info.ticketIndex);
    for (const table of (info.bodyTables || [])) {
      let candidates = table.rows ? Array.from(table.rows) : Array.from(table.querySelectorAll("tr,[role='row']"));
      if (table === info.headerTable) candidates = candidates.slice(info.headerIndex + 1);
      for (const row of candidates) {
        if (row === info.headerRow || row.querySelector("th,[role='columnheader']")) continue;
        const cells = hthCells(row);
        if (cells.length <= Math.max(info.startIndex, info.endIndex)) continue;
        // Ignore empty jqGrid placeholder rows but keep rows where either time is missing.
        const text = String(row.innerText || row.textContent || "").replace(/\s+/g, " ").trim();
        if (!text) continue;
        rows.push(row);
      }
    }
    return rows;
  }
  function hthNormalizeGridDateTime(value) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    let match = text.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (match) return `${match[1].padStart(2,"0")}/${match[2].padStart(2,"0")}/${match[3]} ${match[4].padStart(2,"0")}:${match[5]}:${(match[6] || "00").padStart(2,"0")}`;
    match = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})[T ]+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (match) return `${String(match[3]).padStart(2,"0")}/${String(match[2]).padStart(2,"0")}/${match[1]} ${String(match[4]).padStart(2,"0")}:${match[5]}:${match[6] || "00"}`;
    return "";
  }
  function hthIsWarmSelectedColor(value) {
    const text = String(value || "").replace(/\s/g, "");
    const rgb = text.match(/^rgba?\((\d+),(\d+),(\d+)/i);
    if (!rgb) return false;
    const r = Number(rgb[1]), g = Number(rgb[2]), b = Number(rgb[3]);
    // VNPT-HIS uses several light yellow shades for the active grid row.
    // Match the hue/range rather than a brittle list of exact RGB values.
    return r >= 240 && g >= 185 && g <= 250 && b <= 190 && (r - b) >= 45 && (g - b) >= 25;
  }
  function hthSelectedRow(row, cells) {
    if (row.getAttribute("aria-selected") === "true" || /selected|highlight|current|marked.?row|ui-state-highlight/.test(String(row.className || "").toLowerCase())) return true;
    if (hthIsWarmSelectedColor(getComputedStyle(row).backgroundColor)) return true;
    return cells.some(cell => hthIsWarmSelectedColor(getComputedStyle(cell).backgroundColor));
  }
  function hthTextOfCell(cell) {
    if (!cell) return "";
    const title = String(cell.getAttribute("title") || "").trim();
    const visibleText = String(cell.innerText || cell.textContent || "").replace(/\s+/g, " ").trim();
    return title || visibleText;
  }
  function hthBedTimeColumnPair(value) {
    const desc = hthHeaderNorm(value);
    if (!desc.includes("NGAYGIUONG")) return null;
    // Actual aria-describedby IDs confirmed from the user's Elements screenshot.
    // The ending is NGAYMAUBENHPHAM_HOANTHANH (no underscore after normalization).
    const pairs = [
      { startSuffix: "NGAYMAUBENHPHAM", endSuffix: "NGAYMAUBENHPHAMHOANTHANH", source: "NGAYMAUBENHPHAM-HOANTHANH" },
      { startSuffix: "NGAYBATDAU", endSuffix: "NGAYKETTHUC", source: "NGAYBATDAU-NGAYKETTHUC" },
      { startSuffix: "THOIGIANBATDAU", endSuffix: "THOIGIANKETTHUC", source: "THOIGIANBATDAU-THOIGIANKETTHUC" },
      { startSuffix: "TGBATDAU", endSuffix: "TGKETTHUC", source: "TGBATDAU-TGKETTHUC" }
    ];
    return pairs.find(pair => desc.endsWith(pair.startSuffix)) || null;
  }
  function hthDirectBedGridRecords() {
    // Read named datetime cells directly; no DOM-wide polling is introduced.
    const allCells = Array.from(document.querySelectorAll('td[aria-describedby], [role="gridcell"][aria-describedby]'));
    const startCells = allCells.filter(cell =>
      isVisibleElement(cell) && !insideHelperUI(cell) &&
      Boolean(hthBedTimeColumnPair(cell.getAttribute("aria-describedby")))
    );
    const byTable = new Map();
    for (const startCell of startCells) {
      const row = startCell.closest("tr,[role='row']");
      if (!row || insideHelperUI(row)) continue;
      const startDesc = hthHeaderNorm(startCell.getAttribute("aria-describedby"));
      const pair = hthBedTimeColumnPair(startDesc);
      if (!pair) continue;
      const prefix = startDesc.slice(0, -pair.startSuffix.length);
      const cells = hthCells(row);
      const descOf = cell => hthHeaderNorm(cell.getAttribute("aria-describedby"));
      const expectedEndDesc = prefix + pair.endSuffix;
      let endCell = cells.find(cell => descOf(cell) === expectedEndDesc);
      if (!endCell) {
        // Permit an extra suffix in some VNPT-HIS versions, but keep the same grid prefix.
        endCell = cells.find(cell => descOf(cell).startsWith(prefix) && descOf(cell).endsWith(pair.endSuffix));
      }
      if (!endCell || !isVisibleElement(endCell)) continue;
      const startTime = hthNormalizeGridDateTime(hthTextOfCell(startCell));
      const endTime = hthNormalizeGridDateTime(hthTextOfCell(endCell));
      if (!startTime && !endTime) continue;
      const cellTexts = cells.map(hthTextOfCell);
      const descs = cells.map(cell => String(cell.getAttribute("aria-describedby") || ""));
      const ticketCell = cells.map((cell, i) => ({ value: cellTexts[i], desc: descs[i] }))
        .find(item => /SOPHIEU|PHIEU/.test(hthHeaderNorm(item.desc)) && /^\d{6,12}$/.test(String(item.value || "").trim()));
      const ticket = ticketCell ? String(ticketCell.value).trim() : "";
      const tokens = [];
      for (const cell of cells) {
        for (const value of [hthTextOfCell(cell), cell.getAttribute("title"), cell.getAttribute("id"), cell.getAttribute("aria-describedby")]) {
          if (String(value || "").trim()) tokens.push(String(value).trim());
        }
      }
      const table = row.closest("table") || startCell.closest("table");
      const key = table || row.parentElement || document;
      if (!byTable.has(key)) byTable.set(key, []);
      const rowsInGrid = Array.from(key.querySelectorAll ? key.querySelectorAll("tr,[role='row']") : [row]).filter(candidate => {
        if (!candidate.querySelector) return false;
        return Array.from(candidate.querySelectorAll('td[aria-describedby], [role="gridcell"][aria-describedby]')).some(cell =>
          Boolean(hthBedTimeColumnPair(cell.getAttribute("aria-describedby"))) && isVisibleElement(cell));
      });
      byTable.get(key).push({
        start: startTime, end: endTime, ticket, tokens, row,
        selected: hthSelectedRow(row, cells),
        gridId: String(table && table.id || prefix),
        rowIndex: rowsInGrid.indexOf(row), rowCount: rowsInGrid.length,
        source: "direct-" + pair.source, at: Date.now()
      });
    }
    const groups = Array.from(byTable.values()).filter(records => records.length);
    groups.sort((a, b) => b.length - a.length);
    return groups.length ? groups[0] : [];
  }
  function hthCaptureVisibleBedTicketRecords() {
    // The screenshot confirmed these fields on actual grid cells:
    // divNgayGiuonggrdSuatAn_NGAYMAUBENHPHAM and
    // divNgayGiuonggrdSuatAn_NGAYMAUBENHPHAM_HOANTHANH.
    // Prefer those exact rows; use the header-aware reader only as a fallback.
    let records = hthDirectBedGridRecords();
    if (!records.length) records = hthReadVisibleTimingRecords();
    const usable = (Array.isArray(records) ? records : [])
      .filter(record => record && (record.start || record.end) && record.row && document.contains(record.row))
      .slice(0, 60);
    const signature = usable.map((record, index) => [
      String(record.ticket || ""), String(record.start || ""), String(record.end || ""),
      String(record.rowIndex ?? index), String(record.row && record.row.id || "")
    ].join("|")).join("\n");
    if (signature === visibleBedTicketSignature) return false;
    visibleBedTicketSignature = signature;
    visibleBedTicketRecords = usable;
    hthScheduleRender(35);
    return true;
  }

  function hthRecordFromDirectBedRow(row) {
    if (!row || insideHelperUI(row)) return null;
    const hasStart = hthCells(row).some(cell => Boolean(hthBedTimeColumnPair(cell.getAttribute("aria-describedby"))));
    if (!hasStart) return null;
    const records = hthDirectBedGridRecords();
    return records.find(record => record.row === row) || null;
  }
  function hthRecordFromTimingRow(row, map) {
    const cells = hthCells(row);
    if (!cells.length) return null;
    const cellTexts = cells.map(cell => String(cell.innerText || cell.textContent || "").replace(/\s+/g, " ").trim());
    // The visible data grid can have selection/icon columns that are absent or
    // hidden in the separate jqGrid header. Read date-time cells from the row
    // itself first; use header indexes only if the row does not expose two times.
    const dateCells = [];
    for (let i = 0; i < cellTexts.length; i++) {
      const normalized = hthNormalizeGridDateTime(cellTexts[i]);
      if (normalized) dateCells.push({ index: i, value: normalized });
    }
    let start = "", end = "";
    if (dateCells.length >= 2) {
      start = dateCells[0].value;
      end = dateCells[1].value;
    } else if (map && cells.length > Math.max(map.startIndex, map.endIndex)) {
      start = hthNormalizeGridDateTime(cellTexts[map.startIndex] || "");
      end = hthNormalizeGridDateTime(cellTexts[map.endIndex] || "");
    } else if (dateCells.length === 1) {
      // Keep a partial result so the UI can still report one missing time.
      if (map && dateCells[0].index === map.endIndex) end = dateCells[0].value;
      else start = dateCells[0].value;
    }
    if (!start && !end) return null;

    // Prefer the header-mapped ticket only if it looks like a real ticket ID;
    // otherwise find the first standalone numeric ticket cell (e.g. 24336972).
    let ticket = "";
    if (map && map.ticketIndex >= 0 && cellTexts[map.ticketIndex] && /^\d{6,12}$/.test(cellTexts[map.ticketIndex])) {
      ticket = cellTexts[map.ticketIndex];
    }
    if (!ticket) {
      const candidates = cellTexts.filter(text => /^\d{6,12}$/.test(text));
      if (candidates.length) ticket = candidates[0];
    }
    return { start, end, ticket, row, selected: hthSelectedRow(row, cells), at: Date.now() };
  }
  let lastClickedTimingRecord = null;
  let bedTimingTimer = 0;
  let bedTimingRetryTimer = 0;
  let scheduledRenderTimer = 0;
  let lastRenderedSignature = "";
  // Independent cache of the visible day-bed ticket rows. This is read only
  // after an explicit timing-grid click, a relevant service response, or panel
  // expansion, so it does not add continuous polling to the HIS page.
  let visibleBedTicketRecords = [];
  let visibleBedTicketSignature = "";
  function hthTryTimingRowFromClick(target) {
    let row = target && target.closest ? target.closest("tr,[role='row']") : null;
    if (!row || insideHelperUI(row)) return null;
    const table = row.closest("table,[role='grid']");
    if (!table || insideHelperUI(table)) return null;
    // Exact jqGrid aria-describedby fields are the first-choice source.
    const directRecord = hthRecordFromDirectBedRow(row);
    if (directRecord && directRecord.start && directRecord.end) {
      lastClickedTimingRecord = { ...directRecord, at: Date.now() };
      return lastClickedTimingRecord;
    }
    // Fallback for other HIS screens with conventional start/end column labels.
    const map = hthFindTimingHeader(table);
    const record = hthRecordFromTimingRow(row, map);
    if (record && record.start && record.end) {
      const timingRows = map ? hthTimingRows(map).filter(item => isVisibleElement(item)) : [];
      lastClickedTimingRecord = { ...record, rowIndex: timingRows.indexOf(row), rowCount: timingRows.length, at: Date.now() };
    }
    return record;
  }
  function hthReadVisibleTimingRecords() {
    // Read named start/end cells directly first; this covers split jqGrid layouts.
    const direct = hthDirectBedGridRecords();
    if (direct.length) return direct;
    const tables = Array.from(document.querySelectorAll("table")).filter(table => isVisibleElement(table) && !insideHelperUI(table));
    const tableInfos = [];
    const seenRoots = new Set();
    for (const table of tables) {
      const map = hthFindTimingHeader(table);
      if (!map || seenRoots.has(map.root)) continue;
      seenRoots.add(map.root);
      const rows = hthTimingRows(map).filter(row => isVisibleElement(row)).slice(0, 501);
      if (!rows.length) continue;
      const records = [];
      rows.forEach((row, rowIndex) => {
        const record = hthRecordFromTimingRow(row, map);
        if (record && record.start && record.end) records.push({ ...record, rowIndex, rowCount: rows.length });
      });
      if (records.length) tableInfos.push({ map, rows, records });
    }
    tableInfos.sort((a, b) => b.records.length - a.records.length);
    return tableInfos.length ? tableInfos[0].records : [];
  }
  function hthReadVisibleTimingRecord() {
    // A recently clicked timing row is the most precise source and avoids guessing
    // when several bed tickets are visible.
    if (lastClickedTimingRecord && Date.now() - lastClickedTimingRecord.at < 12000 && lastClickedTimingRecord.start && lastClickedTimingRecord.end) {
      return lastClickedTimingRecord;
    }
    const records = hthReadVisibleTimingRecords();
    if (!records.length) return null;
    const selected = records.filter(record => record.selected || hthSelectedRow(record.row, hthCells(record.row)));
    if (selected.length === 1) return selected[0];
    if (records.length === 1) return records[0];
    return null;
  }
  function hthIsBedService(row) {
    const code = String(row.serviceCode || "").trim().toUpperCase();
    const name = hthHeaderNorm(row.serviceName || "");
    return /^G[_-]/.test(code) || /^GIUONG/.test(code) || name.includes("GIUONG");
  }
  function hthVisibleBedDetailMatches(targets) {
    if (!targets || !targets.length) return [];
    const timingGridRoots = new Set();
    const tables = Array.from(document.querySelectorAll("table"));
    for (const table of tables) {
      const info = hthFindTimingHeader(table);
      if (info) timingGridRoots.add(info.root);
    }

    // Build a compact map of the visible detail rows once. Avoid rescanning the
    // whole page separately for every missing bed card on a long-stay encounter.
    const byCode = new Map();
    const expectedCodes = new Set(targets.map(target => hthHeaderNorm(target.serviceCode)).filter(Boolean));
    const rows = Array.from(document.querySelectorAll("table tr, [role='row']"));
    for (const row of rows) {
      if (insideHelperUI(row) || !isVisibleElement(row)) continue;
      const table = row.closest("table,[role='grid']");
      if (table && Array.from(timingGridRoots).some(root => root === table || (root.contains && root.contains(table)))) continue;
      const cells = hthCells(row);
      if (!cells.length) continue;
      const cellNorms = cells.map(cell => hthHeaderNorm(cell.innerText || cell.textContent || ""));
      const bedCodes = cellNorms.filter(value => expectedCodes.has(value));
      if (!bedCodes.length) continue;
      const rowNorm = hthHeaderNorm(row.innerText || row.textContent || "");
      for (const code of bedCodes) {
        const list = byCode.get(code) || [];
        list.push({ rowNorm, cells: cellNorms });
        byCode.set(code, list);
      }
    }
    const matches = [];
    for (const target of targets) {
      const code = hthHeaderNorm(target.serviceCode);
      const name = hthHeaderNorm(target.serviceName);
      const candidates = byCode.get(code) || [];
      if (candidates.length !== 1) continue;
      const candidate = candidates[0];
      if (name.length >= 8 && !candidate.rowNorm.includes(name) && !candidate.cells.some(label => label.includes(name) || (name.includes(label) && label.length >= 8))) continue;
      matches.push(target);
    }
    return matches;
  }
  function hthScheduleRender(delay = 120) {
    if (scheduledRenderTimer) return;
    scheduledRenderTimer = setTimeout(() => {
      scheduledRenderTimer = 0;
      render();
    }, Math.max(0, delay));
  }
  function hthApplyVisibleBedTiming() {
    if (!currentRows.length) return false;
    const allBedRows = currentRows.filter(row => hthIsBedService(row));
    const bedRows = allBedRows.filter(row => (!String(row.start || "").trim() || !String(row.end || "").trim()));
    if (!bedRows.length) return false;

    // If all bed orders are visible in the HIS grid, pair them in displayed order
    // when the list is unambiguous (same bed service repeated, same count). This
    // handles cases where REST uses an internal group ID unlike the displayed ticket.
    const visibleRecords = hthReadVisibleTimingRecords();
    let changed = false;
    const allSameBedService = new Set(allBedRows.map(row => hthHeaderNorm(String(row.serviceCode || "") + "|" + String(row.serviceName || "")))).size === 1;
    if (visibleRecords.length > 1 && visibleRecords.length === allBedRows.length && bedRows.length === allBedRows.length && allSameBedService) {
      const visibleMatches = hthVisibleBedDetailMatches(allBedRows);
      if (visibleMatches.length === allBedRows.length) {
        for (let i = 0; i < allBedRows.length; i++) {
          const targetRow = allBedRows[i];
          const timingRow = visibleRecords[i];
          if (!timingRow.start || !timingRow.end) continue;
          if (targetRow.start === timingRow.start && targetRow.end === timingRow.end) continue;
          targetRow.start = timingRow.start;
          targetRow.end = timingRow.end;
          targetRow.timingSource = "visible-HIS-grid";
          targetRow.timingTicket = timingRow.ticket || "";
          changed = true;
        }
        if (changed) { hthScheduleRender(30); return true; }
      }
    }

    const timing = hthReadVisibleTimingRecord();
    if (!timing || !timing.start || !timing.end) return false;
    let target = null;
    // The clicked HIS row can contain hidden identifiers in jqGrid cells. Use
    // those to match API row/group keys before a weaker visible-order fallback.
    const timingTokens = Array.from(new Set((timing.tokens || []).map(hthHeaderNorm).filter(token => token.length >= 4)));
    const tokenMatches = bedRows.filter(row => {
      const keys = [row.groupKey, row.rowKey].map(hthHeaderNorm).filter(key => key.length >= 4);
      return keys.some(key => timingTokens.some(token => token === key || (key.length >= 6 && token.includes(key)) || (token.length >= 6 && key.includes(token))));
    });
    if (tokenMatches.length === 1) target = tokenMatches[0];
    else if (tokenMatches.length > 1) return false;
    const ticketKey = hthHeaderNorm(timing.ticket);
    if (!target && ticketKey) {
      // Match exact group IDs first; some HIS rows include the ticket inside a longer key.
      const exactMatches = bedRows.filter(row => {
        const group = hthHeaderNorm(row.groupKey);
        return group && (group === ticketKey || (ticketKey.length >= 6 && group.includes(ticketKey)) || (group.length >= 6 && ticketKey.includes(group)));
      });
      if (exactMatches.length === 1) target = exactMatches[0];
      else if (exactMatches.length > 1) return false;
    }
    if (!target) {
      const visibleMatches = hthVisibleBedDetailMatches(bedRows);
      if (visibleMatches.length === 1) target = visibleMatches[0];
      // If several identical bed entries exist, use the selected row's stable
      // position only when the visible grid count matches all bed cards. Never
      // apply the selected time to an arbitrary remaining card.
      else if (timing.rowIndex >= 0 && timing.rowCount === allBedRows.length &&
        visibleMatches.length === allBedRows.length && allBedRows[timing.rowIndex]) {
        target = allBedRows[timing.rowIndex];
      }
    }
    if (!target && bedRows.length === 1 && allBedRows.length === 1) target = bedRows[0];
    if (!target) return false;
    if (target.start === timing.start && target.end === timing.end) return false;
    // If row position points to a card that already has dates, don't redirect this
    // timing value into another card; wait for the user/selection to be unambiguous.
    if (String(target.start || "").trim() && String(target.end || "").trim()) return false;
    target.start = timing.start;
    target.end = timing.end;
    target.timingSource = "visible-HIS-grid";
    target.timingTicket = timing.ticket || "";
    hthScheduleRender(30);
    return true;
  }
  function hthScheduleBedTiming(delay = 100, retries = 1) {
    // One pending check per burst is enough; don't keep postponing it while a grid
    // paints rows continuously. The retry handles the delayed detail-table render.
    if (bedTimingTimer || bedTimingRetryTimer) return;
    bedTimingTimer = setTimeout(() => {
      bedTimingTimer = 0;
      hthCaptureVisibleBedTicketRecords();
      const applied = hthApplyVisibleBedTiming();
      if (!applied && retries > 0) {
        bedTimingRetryTimer = setTimeout(() => {
          bedTimingRetryTimer = 0;
          hthCaptureVisibleBedTicketRecords();
          hthApplyVisibleBedTiming();
        }, 260);
      }
    }, Math.max(0, delay));
  }

  function render(force = false) {
    const savedVentilation = hthGetVentilationIntervals();
    const ventilationSignature = savedVentilation.map(row => [row.serviceCode, row.serviceName, row.start, row.end].join("~")).join("\n");
    const signature = currentRows.map(row => [row.rowKey, row.serviceCode, row.serviceName, row.start, row.end, row.quantity, row.expected].join("~")).join("\n") + "\n#VENTILATION:" + ventilationSignature + "\n#BED_TICKETS:" + visibleBedTicketSignature;
    if (!force && signature === lastRenderedSignature) return;
    lastRenderedSignature = signature;
    area.replaceChildren();
    // The panel starts minimized. Avoid building dozens of hidden cards while the
    // user is working in HIS; data stays cached and cards are rendered on expand.
    if (panel.classList.contains("hth-minimized")) {
      const summary = document.createElement("div");
      summary.className = "hth-empty";
      summary.textContent = currentRows.length
        ? `Đã nhận ${currentRows.length} dịch vụ. Mở bảng để xem kết quả.`
        : "Chưa nhận được dữ liệu. Hãy bấm vào phiếu/dịch vụ.";
      area.appendChild(summary);
      return;
    }
    if (!currentRows.length && !visibleBedTicketRecords.length && !savedVentilation.length) {
      const empty = document.createElement("div");
      empty.className = "hth-empty";
      empty.textContent = "Chưa nhận được dữ liệu. Hãy bấm vào phiếu/dịch vụ.";
      area.appendChild(empty); return;
    }
    // Compare suction timing against every stored ventilation interval for this case,
    // not only rows present in the most recent RestService response.
    const ventilationRows = savedVentilation;
    let hiddenTimingCards = 0;
    currentRows.forEach((row, index) => {
      const hasStartTime = Boolean(String(row.start || "").trim());
      const hasEndTime = Boolean(String(row.end || "").trim());
      const missingStartTime = !hasStartTime;
      const missingEndTime = !hasEndTime;
      const missingTiming = missingStartTime || missingEndTime;
      const actual = elapsed(row.start, row.end);
      const expected = num(row.expected);
      const quantity = num(row.quantity);
      const status = getStatus(actual, expected);
      const ventilation = isVentilation(row);
      const suction = isSuction(row);
      const electromyography = isElectromyography(row);
      const emgSeconds = elapsedSeconds(row.start, row.end);
      const electromyographyTooShort = electromyography && emgSeconds !== null && emgSeconds < 30 * 60;
      // Dùng định danh đối tượng để loại chính dòng đang xét. HIS có thể tái sử dụng
      // rowKey ở các record lồng nhau; so sánh rowKey có thể loại nhầm khoảng PT0034 thật.
      // Quy tắc vẫn theo v3.2.3: toàn bộ khoảng PT0022 phải nằm trong một khoảng thở máy.
      const containedVent = suction && ventilationRows.some(v =>
        v !== row && containedIn(row.start, row.end, v.start, v.end)
      );
      const card = document.createElement("div"); card.className = "hth-card";
      if (electromyographyTooShort) card.classList.add("hth-short-duration");
      if (missingTiming) card.classList.add("hth-missing-time");
      card.dataset.rowKey = String(row.rowKey || "");
      card.dataset.groupKey = String(row.groupKey || "");
      card.dataset.start = String(row.start || "");
      card.dataset.code = String(row.serviceCode || "").toLowerCase();
      card.dataset.serviceName = String(row.serviceName || "");
      card.title = "Bấm để tìm và làm nổi dòng dịch vụ tương ứng trên HIS";
      const name = document.createElement("div"); name.className = "hth-name";
      name.textContent = (currentRows.length > 1 ? (index + 1) + ". " : "") + (row.serviceName || row.serviceCode || "Dịch vụ chưa có tên");
      card.appendChild(name);
      const grid = document.createElement("div"); grid.className = "hth-grid";
      addLine(grid, "Mã dịch vụ", row.serviceCode || "—");
      addLine(grid, "Bắt đầu", row.start || "CHƯA CÓ GIỜ", missingStartTime ? "hth-bad" : "");
      addLine(grid, "Kết thúc", row.end || "CHƯA CÓ GIỜ", missingEndTime ? "hth-bad" : "");
      if (row.timingSource === "visible-HIS-grid") addLine(grid, "Nguồn giờ", "Đọc từ bảng TG bắt đầu/TG kết thúc trên HIS", "hth-warn");
      const actualSeconds = elapsedSeconds(row.start, row.end);
      addLine(
        grid,
        "Thời gian thực tế",
        missingTiming ? "Chưa đủ giờ bắt đầu/kết thúc từ HIS" : formatDuration(actualSeconds),
        missingTiming ? "hth-bad" : "hth-actual"
      );
      if (missingTiming) {
        const missingParts = [];
        if (missingStartTime) missingParts.push("giờ bắt đầu");
        if (missingEndTime) missingParts.push("giờ kết thúc");
        addLine(grid, "CẢNH BÁO", "THIẾU " + missingParts.join(" VÀ ").toUpperCase() + " — CẦN KIỂM TRA", "hth-bad");
      }
      if (electromyography) {
        let emgText, emgClass;
        if (actualSeconds === null) {
          emgText = "Chưa đủ giờ bắt đầu/kết thúc để kiểm tra ngưỡng 30 phút";
          emgClass = "hth-warn";
        } else if (actualSeconds < 30 * 60) {
          emgText = "DƯỚI 30 PHÚT — CẦN KIỂM TRA";
          emgClass = "hth-bad";
        } else {
          emgText = "Đạt từ 30 phút trở lên";
          emgClass = "hth-good";
        }
        addLine(grid, "Kiểm tra thời gian Ghi điện cơ (CĐHA)", emgText, emgClass);
      }
      if (ventilation) {
        const totalMinutes = actual;
        const wholeDays = totalMinutes === null ? null : Math.floor(totalMinutes / (60 * 24));
        const remainingMinutes = totalMinutes === null ? null : totalMinutes % (60 * 24);
        const remainingHours = remainingMinutes === null ? null : Math.floor(remainingMinutes / 60);
        const leftoverMinutes = remainingMinutes === null ? null : remainingMinutes % 60;
        // Under 24 hours: minutes / 60. At/above 24 hours: whole days plus remaining hours.
        // Display/compare day.hour as requested (25 hours => 1.1), not decimal days.
        const convertedValue = totalMinutes === null ? null :
          (wholeDays === 0
            ? Math.round((totalMinutes / 60) * 100) / 100
            : Math.round((wholeDays + (remainingHours / 10)) * 100) / 100);
        const convertedLabel = totalMinutes === null ? "Không tính được" :
          (wholeDays === 0
            ? (Math.round((totalMinutes / 60) * 100) / 100) + " giờ" + (leftoverMinutes ? " " + leftoverMinutes + " phút" : "")
            : wholeDays + " ngày " + remainingHours + " giờ" + (leftoverMinutes ? " " + leftoverMinutes + " phút" : ""));
        const formatQty = value => value === null ? "Không tính được" : String(Math.round(value * 100) / 100);
        addLine(grid, "Thời gian quy đổi", convertedLabel, "hth-qty");
        addLine(grid, "Số lượng quy đổi để đối chiếu HIS", formatQty(convertedValue));
        addLine(grid, "Số lượng trên HIS", quantity === null ? "Chưa có" : quantity);
        if (convertedValue !== null && quantity !== null) {
          const diff = Math.round((convertedValue - quantity) * 100) / 100;
          const match = Math.abs(diff) < 0.01;
          addLine(grid, "Chênh lệch quy đổi − HIS", (diff > 0 ? "+" : "") + formatQty(diff) + (match ? " (khớp)" : " (cần đối chiếu)"), match ? "hth-good" : "hth-bad");
        }
      }
      const dialysisRoutine = /pt0043|thận nhân tạo thường quy/i.test(serviceText(row));
      if (dialysisRoutine) {
        const tooShort = actualSeconds === null || actualSeconds < 4 * 60 * 60;
        addLine(
          grid,
          "Kiểm tra thời gian thận nhân tạo",
          tooShort ? "CHƯA ĐỦ 4 TIẾNG — cần kiểm tra" : "Đạt từ 4 tiếng trở lên",
          tooShort ? "hth-bad" : "hth-good"
        );
      }
      if (suction) {
        let suctionText, suctionClass;
        if (!row.start || !row.end) {
          suctionText = "Chưa đủ giờ bắt đầu/kết thúc để đối chiếu";
          suctionClass = "hth-warn";
        } else if (!ventilationRows.length) {
          suctionText = "Chưa có dữ liệu thở máy để đối chiếu";
          suctionClass = "hth-warn";
        } else if (containedVent) {
          suctionText = "Nằm trong giờ thở máy — bình thường";
          suctionClass = "hth-good";
        } else {
          suctionText = "SAI — HÚT ĐỜM NẰM NGOÀI KHOẢNG GIỜ THỞ MÁY";
          suctionClass = "hth-bad";
        }
        addLine(grid, "Kiểm tra giờ hút đờm", suctionText, suctionClass);
      }
      card.appendChild(grid);
      const isErrorCard = card.classList.contains("hth-short-duration") || card.classList.contains("hth-missing-time") ||
        !!grid.querySelector(".hth-bad");
      if (hthOnlyErrors && !isErrorCard) { hiddenTimingCards++; return; }
      area.appendChild(card);
    });

    // Ventilation history is kept internally for comparison with PT0022. The visible
    // history remains the old numbered card list built from selected service responses.

    if (visibleBedTicketRecords.length) {
      const section = document.createElement("div");
      section.className = "hth-card hth-bed-ticket-section";
      const title = document.createElement("div");
      title.className = "hth-name";
      title.textContent = `Phiếu giường đọc trực tiếp từ HIS (${visibleBedTicketRecords.length} dòng)`;
      section.appendChild(title);
      const note = document.createElement("div");
      note.className = "hth-note";
      note.textContent = "Giờ đọc trực tiếp từ từng dòng đang hiển thị trên HIS. Bấm một dòng để cuộn đến phiếu tương ứng. Khi chưa ghép duy nhất được phiếu với mã dịch vụ chi tiết, thời gian được hiển thị riêng để tránh ghép nhầm.";
      section.appendChild(note);
      const table = document.createElement("table");
      table.className = "hth-bed-ticket-table";
      const thead = document.createElement("thead");
      const header = document.createElement("tr");
      ["Số phiếu", "Bắt đầu", "Kết thúc", "Thời gian thực tế"].forEach(label => {
        const th = document.createElement("th"); th.textContent = label; header.appendChild(th);
      });
      thead.appendChild(header); table.appendChild(thead);
      const tbody = document.createElement("tbody");
      let hiddenBedRows = 0;
      visibleBedTicketRecords.forEach((record, index) => {
        if (hthOnlyErrors && record.start && record.end && elapsedSeconds(record.start, record.end) !== null) { hiddenBedRows++; return; }
        const tr = document.createElement("tr");
        tr.className = "hth-bed-ticket-row";
        tr.dataset.recordIndex = String(index);
        tr.title = "Bấm để tìm dòng phiếu giường trên HIS";
        const duration = record.start && record.end ? elapsedSeconds(record.start, record.end) : null;
        const values = [
          record.ticket || `Phiếu ${index + 1}`,
          record.start || "CHƯA CÓ GIỜ",
          record.end || "CHƯA CÓ GIỜ",
          duration === null ? "Thiếu giờ" : formatDuration(duration)
        ];
        values.forEach((value, col) => {
          const td = document.createElement("td"); td.textContent = value;
          if ((col === 1 && !record.start) || (col === 2 && !record.end) || (col === 3 && duration === null)) td.className = "hth-bad";
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody); section.appendChild(table);
      if (tbody.children.length) area.appendChild(section);
      hiddenTimingCards += hiddenBedRows;
    }
    if (hiddenTimingCards) area.appendChild(hthHiddenNote(hiddenTimingCards, "hth-note"));
    if (hthOnlyErrors && !area.querySelector(".hth-card")) {
      area.insertBefore(auditElement("div", "hth-empty", "Không có lỗi về thời gian dịch vụ."), area.firstChild);
    }
    // Luôn đưa thẻ mới nhất xuống cuối vùng xem và tự cuộn tới đó.
    // Chờ trình duyệt cập nhật layout rồi cuộn vùng danh sách tới cuối.
    requestAnimationFrame(() => {
      area.scrollTop = area.scrollHeight;
      const scrollParent = area.closest(".hth-panel-body, .hth-panel-content, .hth-list");
      if (scrollParent) scrollParent.scrollTop = scrollParent.scrollHeight;
      const lastCard = area.lastElementChild;
      if (lastCard && typeof lastCard.scrollIntoView === "function") {
        lastCard.scrollIntoView({ block: "end", behavior: "auto" });
      }
    });
  }

  function clearStoredRows(options = {}) {
    const preserveVentilation = Boolean(options && options.preserveVentilation);
    currentRows = [];
    currentGroup = "";
    currentCase = "";
    if (!preserveVentilation) hthClearVentilationCache();
    lastClickedTimingRecord = null;
    visibleBedTicketRecords = [];
    visibleBedTicketSignature = "";
    if (scheduledRenderTimer) { clearTimeout(scheduledRenderTimer); scheduledRenderTimer = 0; }
    if (bedTimingTimer) { clearTimeout(bedTimingTimer); bedTimingTimer = 0; }
    if (bedTimingRetryTimer) { clearTimeout(bedTimingRetryTimer); bedTimingRetryTimer = 0; }
    lastRenderedSignature = "";
    render(true);
  }

  function isVisibleElement(el) {
    if (!el || el.closest("#scanx-time-helper, #scanx-scan-panel, #scanx-scan-trigger")) return false;
    const style = getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden" &&
      el.getClientRects().length > 0;
  }

  function readVisibleEncounter() {
    const baPattern = /\bBA\d{6,}\b/i;

    // During QUÉT the scan knows exactly which visit it selected.
    if (scanForcedEncounter) return scanForcedEncounter;

    // The selected row of the patient grid is the open visit. Without this, the
    // search screen (several visits of one patient, empty Mã BA box) fell through
    // to "topmost BA on screen" = always row 1, so switching visits never reset
    // the previous visit's rows.
    const patientGrid = document.getElementById("grdLS");
    const selectedPatientRow = patientGrid && patientGrid.querySelector("tr.jqgrow.ui-state-highlight, tr.jqgrow[aria-selected='true']");
    if (selectedPatientRow) {
      const match = String(selectedPatientRow.textContent || "").match(baPattern);
      if (match) return match[0].toUpperCase();
    }

    // Ưu tiên ô nhập Mã BA trên màn hình tìm kiếm bệnh nhân.
    // Tránh lấy nhầm mã BA từ dữ liệu lịch sử còn nằm trong DOM.
    const inputs = Array.from(document.querySelectorAll("input, textarea, [contenteditable='true']"));
    for (const el of inputs) {
      if (!isVisibleElement(el)) continue;
      const value = String(("value" in el ? el.value : el.textContent) || "").trim();
      const match = value.match(baPattern);
      if (match) return match[0].toUpperCase();
    }

    // Ưu tiên tiêu đề thông tin bệnh nhân hiện hành dạng "BA... | Họ tên | ...".
    const headers = Array.from(document.querySelectorAll("h1,h2,h3,div,span,td,th,label,p"))
      .filter(isVisibleElement)
      .map(el => ({el, text: String(el.innerText || el.textContent || "").trim().replace(/\s+/g, " ")}))
      .filter(x => x.text && x.text.length <= 260 && /^\s*BA\d{6,}\s*\|/i.test(x.text))
      .sort((a, b) => a.text.length - b.text.length ||
        a.el.getBoundingClientRect().top - b.el.getBoundingClientRect().top);
    if (headers.length) {
      const match = headers[0].text.match(baPattern);
      if (match) return match[0].toUpperCase();
    }

    // Fallback to the topmost visible exact text containing a BA identifier.
    const candidates = Array.from(document.querySelectorAll("body *"))
      .filter(el => isVisibleElement(el) && !el.children.length)
      .map(el => ({el, text: String(el.innerText || el.textContent || "").trim()}))
      .filter(x => x.text && x.text.length <= 80 && baPattern.test(x.text))
      .sort((a, b) => a.el.getBoundingClientRect().top - b.el.getBoundingClientRect().top);
    if (candidates.length) {
      const match = candidates[0].text.match(baPattern);
      if (match) return match[0].toUpperCase();
    }
    return "";
  }
  function readVisibleSelection() {
    // VNPT-HIS highlights the selected service row. Read its visible cells so switching
    // to a different treatment ticket/encounter can reset stale cards even if BA is unchanged.
    const candidates = Array.from(document.querySelectorAll("tr, [role='row']"));
    const selected = candidates.find(el => {
      const st = getComputedStyle(el);
      const bg = (st.backgroundColor || "").replace(/\s/g, "");
      const cls = String(el.className || "").toLowerCase();
      return /selected|active|highlight|current/.test(cls) ||
        bg === "rgb(255,235,59)" || bg === "rgb(255,241,118)" ||
        bg === "rgb(255,235,120)" || bg === "rgb(255,238,88)" ||
        bg === "rgb(255,235,153)" || bg === "rgb(255,235,140)";
    });
    if (!selected) return "";
    const cells = Array.from(selected.querySelectorAll("td, [role='gridcell']"))
      .map(el => (el.innerText || el.textContent || "").trim().replace(/\s+/g, " "))
      .filter(Boolean);
    return cells.join("|");
  }

  function checkEncounterChange(hintedEncounter = "", hintedSelection = "") {
    const nextEncounter = hintedEncounter || readVisibleEncounter();
    // The selected service row can be passed directly from the click handler.
    // Avoid scanning every row and reading computed styles when we already know it.
    const nextSelection = hintedSelection || currentVisibleSelection;

    if (nextEncounter && currentVisibleEncounter && nextEncounter !== currentVisibleEncounter) {
      clearStoredRows();
      clearAuditData();
      currentVisibleSelection = "";
      lastClickedTimingRecord = null;
    }
    // IMPORTANT: selecting another service row/order ticket (including a different
    // BV... number) inside the same BA encounter is NOT a case change. The old logic
    // cleared currentRows when the BV ticket changed, which removed earlier cards and
    // broke cross-service history checks such as PT0034 vs PT0022. Keep the full
    // per-encounter service history; only the stable encounter-change branch above or
    // the explicit patient-row switch below may clear it.

    if (nextEncounter) currentVisibleEncounter = nextEncounter;
    if (nextSelection) currentVisibleSelection = nextSelection;
  }

  // Coalesce explicit user actions/API events. Unlike the previous whole-body
  // MutationObserver, this does not rescan all grids whenever HIS inserts table cells.
  let encounterCheckTimer = 0;
  let encounterCheckDue = 0;
  let lastEncounterCheckAt = 0;
  let clickFollowupTimer = 0;
  let pendingEncounterHint = "";
  let pendingSelectionHint = "";
  function scheduleEncounterCheck(delay = 120, hints = {}) {
    if (hints && hints.caseNo) pendingEncounterHint = String(hints.caseNo).toUpperCase();
    if (hints && hints.selection) pendingSelectionHint = String(hints.selection).slice(0, 1200);
    const now = Date.now();
    const wait = Math.max(delay, Math.max(0, 180 - (now - lastEncounterCheckAt)));
    const due = now + wait;
    if (encounterCheckTimer && due >= encounterCheckDue) return;
    if (encounterCheckTimer) clearTimeout(encounterCheckTimer);
    encounterCheckDue = due;
    encounterCheckTimer = setTimeout(() => {
      encounterCheckTimer = 0;
      encounterCheckDue = 0;
      lastEncounterCheckAt = Date.now();
      const caseHint = pendingEncounterHint;
      const selectionHint = pendingSelectionHint;
      pendingEncounterHint = "";
      pendingSelectionHint = "";
      try { checkEncounterChange(caseHint, selectionHint); } catch (_) {}
    }, wait);
  }

  function insideHelperUI(node) {
    const el = node && (node.nodeType === 1 ? node : node.parentElement);
    return !!(el && el.closest && el.closest("#scanx-time-helper, #scanx-scan-panel, #scanx-scan-trigger, #scanx-jump-toast, #his-time-helper, #his-bhyt-result, #his-bhyt-helper-trigger, #hth-scan-panel, #hth-scan-trigger, #hth-jump-toast"));
  }
  function hthClickedCaseHint(target) {
    const row = target && target.closest ? target.closest("tr,[role='row']") : null;
    if (!row || insideHelperUI(row)) return "";
    const text = String(row.innerText || row.textContent || "").replace(/\s+/g, " ").trim();
    // Patient grid rows carry both the admission number and a patient identifier.
    // Service rows are intentionally not interpreted as patient selections.
    if (!/\bBN\d{5,}\b/i.test(text) && !/\b[A-Z]{2}\d{10,16}\b/i.test(text)) return "";
    const match = text.match(/\b(BA\d{6,})\b/i);
    return match ? match[1].toUpperCase() : "";
  }
  function hthIsLikelyPatientRow(target) {
    const row = target && target.closest ? target.closest("tr,[role='row']") : null;
    if (!row || insideHelperUI(row)) return false;
    const text = String(row.innerText || row.textContent || "");
    return /\bBA\d{6,}\b/i.test(text) && (/\bBN\d{5,}\b/i.test(text) || /\b[A-Z]{2}\d{10,16}\b/i.test(text));
  }
  if (document.body) {
    checkEncounterChange();
    lastEncounterCheckAt = Date.now();
  }
  // Do not run expensive page-wide checks on every input/keypress or every DOM mutation.
  // Only process patient-row clicks, explicit form changes and the few
  // navigation events that can change the current HIS record.
  document.addEventListener("change", event => {
    if (!insideHelperUI(event.target)) scheduleEncounterCheck(180);
  }, true);
  document.addEventListener("click", event => {
    if (insideHelperUI(event.target)) return;
    const clickedRow = findHisServiceRow(event.target);
    const timingRecord = hthTryTimingRowFromClick(event.target);
    // Only inspect the visible timing grid after a click inside that grid. For other
    // rows, the debounced SERVICES response below is the trigger; this avoids a grid
    // scan for every click in a long patient chart.
    if (timingRecord) hthScheduleBedTiming(80, 2);

    const caseHint = hthClickedCaseHint(event.target);
    if (caseHint && hthIsLikelyPatientRow(event.target)) {
      if (currentVisibleEncounter && currentVisibleEncounter !== caseHint) {
        clearStoredRows();
        clearAuditData();
        currentVisibleSelection = "";
        lastClickedTimingRecord = null;
      }
      currentVisibleEncounter = caseHint;
      scheduleEncounterCheck(40, { caseNo: caseHint });
      if (clickFollowupTimer) clearTimeout(clickFollowupTimer);
      clickFollowupTimer = setTimeout(() => {
        clickFollowupTimer = 0;
        scheduleEncounterCheck(0, { caseNo: caseHint });
      }, 300);
    } else if (timingRecord) {
      const row = event.target.closest("tr,[role='row']");
      scheduleEncounterCheck(120, { selection: row ? String(row.innerText || row.textContent || "") : "" });
    }
  }, true);
  window.addEventListener("hashchange", () => scheduleEncounterCheck(160));
  window.addEventListener("popstate", () => scheduleEncounterCheck(160));

  window.addEventListener("pagehide", () => {
    if (encounterCheckTimer) clearTimeout(encounterCheckTimer);
    if (clickFollowupTimer) clearTimeout(clickFollowupTimer);
    if (bedTimingTimer) clearTimeout(bedTimingTimer);
    if (bedTimingRetryTimer) clearTimeout(bedTimingRetryTimer);
    if (scheduledRenderTimer) clearTimeout(scheduledRenderTimer);
    currentRows = [];
    currentGroup = "";
    currentCase = "";
    currentVisibleEncounter = "";
    currentVisibleSelection = "";
    clearAuditData();
    hthClearVentilationCache();
  });

  // The HIS may reuse a nested "ID"/rowKey for several service records.
  // Keep a separate history card for each service-code/name/start-time combination;
  // if a later response only fills a missing end time, update the same card.
  function hthHistoryNorm(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toUpperCase().replace(/[^A-Z0-9]/g, "");
  }
  function hthHistoryScope(row) {
    return hthHistoryNorm(currentVisibleEncounter || (row && row.caseKey) || currentCase || "CURRENT");
  }
  function hthHistoryBaseKey(row) {
    const code = hthHistoryNorm(row && row.serviceCode);
    const name = hthHistoryNorm(row && row.serviceName);
    const main = (code || name) ? [code, name] : [hthHistoryNorm(row && row.rowKey)];
    return [hthHistoryScope(row), ...main].join("|");
  }
  function hthHistoryKey(row) {
    const start = normalizeDateTime(row && row.start || "");
    return hthHistoryBaseKey(row) + "|" + hthHistoryNorm(start || "NO_START");
  }

  window.addEventListener("message", event => {
    if (event.source !== window || !event.data ||
        (event.data.__hisTimeHelperV31 !== true && event.data.__hisTimeHelperIcdV1 !== true)) return;
    if (event.data.type === "PATIENT" && event.data.patient && typeof event.data.patient === "object") {
      // A patient-detail response may follow a case switch: re-check the open case
      // (one scheduled DOM scan per response burst).
      const p = event.data.patient;
      if (p.caseNo && p.card && p.name && p.dob) scheduleEncounterCheck(120);
      return;
    }
    if (event.data.type === "ICD_DATA" && event.data.__hisTimeHelperIcdV1 === true) {
      const incomingHoSoId = auditNormalizeHoSoId(event.data.hoSoBenhAnId || (event.data.icdData && event.data.icdData.hoSoBenhAnId));
      const currentHoSoId = auditCurrentHoSoId() || auditNormalizeHoSoId(auditState.context && auditState.context.hoSoBenhAnId);
      if (!incomingHoSoId) return;
      const incomingIcd = event.data.icdData && typeof event.data.icdData === "object" ? event.data.icdData : null;
      if (!incomingIcd || !Array.isArray(incomingIcd.diagnoses)) return;
      const icdData = {
        source: String(incomingIcd.source || "NT.005.HSBA"),
        mainCode: String(incomingIcd.mainCode || "").trim().toUpperCase(),
        mainName: String(incomingIcd.mainName || "").trim(),
        admissionTime: String(incomingIcd.admissionTime || "").trim(),
        diagnoses: incomingIcd.diagnoses.map(item => ({
          code: String(item && item.code || "").trim().toUpperCase(),
          name: String(item && item.name || "").trim()
        })).filter(item => item.code),
        hasMainField: !!incomingIcd.hasMainField,
        hasSecondaryField: !!incomingIcd.hasSecondaryField,
        capturedAt: Number(incomingIcd.capturedAt || Date.now()),
        // Whole BENHCHINH / BENHPHU text, so a diagnosis is still found when
        // its name could not be split from its code.
        rawText: String(incomingIcd.rawText || "")
      };
      icdCacheByHoSoId.delete(incomingHoSoId);
      icdCacheByHoSoId.set(incomingHoSoId, icdData);
      if (icdCacheByHoSoId.size > 200) icdCacheByHoSoId.delete(icdCacheByHoSoId.keys().next().value);
      // A payload for another case stays in the cache until that case is shown.
      if (currentHoSoId && incomingHoSoId !== currentHoSoId) return;
      auditState.icdHoSoBenhAnId = incomingHoSoId;
      auditState.icdData = icdData;
      return;
    }
    if (event.data.type === "LAB_RESULTS") {
      const key = String(event.data.context && event.data.context.key || "").trim();
      if (!key || (auditState.contextKey && auditState.contextKey !== key)) return;
      const rows = Array.isArray(event.data.rows) ? event.data.rows : [];
      for (const row of rows) if (row && row.key) auditState.labResults.set(String(row.key), { ...row, contextKey: key });
      while (auditState.labResults.size > 2000) auditState.labResults.delete(auditState.labResults.keys().next().value);
      return;
    }
    if (event.data.type === "AUDIT_DATA") {
      const context =event.data.context && typeof event.data.context === "object" ? event.data.context : {};
      const incomingKey = String(context.key || "").trim();
      if (!incomingKey) return; // Do not combine rows across cases without a stable HIS encounter key.
      if (auditState.contextKey && auditState.contextKey !== incomingKey) {
        auditState.dvktRows.clear(); auditState.medicineRows.clear();
        auditState.contrastServices.clear(); auditState.contrastMedicines.clear();
        for (const [k, row] of auditState.labResults) if (row.contextKey !== incomingKey) auditState.labResults.delete(k);
        auditState.labErrors = [];
        const nextHoSoId =auditNormalizeHoSoId(context.hoSoBenhAnId);
        if (auditState.icdHoSoBenhAnId && nextHoSoId && auditState.icdHoSoBenhAnId !== nextHoSoId) {
          auditState.icdHoSoBenhAnId = ""; auditState.icdData = null;
        }
      }
      auditState.contextKey = incomingKey;
      auditState.context = { ...auditState.context };
      for (const [key, value] of Object.entries(context)) {
        if (value !== null && value !== undefined && String(value).trim() !== "") auditState.context[key] = value;
      }
      const dvktRows = Array.isArray(event.data.dvktRows) ? event.data.dvktRows : [];
      const medicineRows = Array.isArray(event.data.medicineRows) ? event.data.medicineRows : [];
      const contrastServices = Array.isArray(event.data.contrastServices) ? event.data.contrastServices : [];
      const contrastMedicines = Array.isArray(event.data.contrastMedicines) ? event.data.contrastMedicines : [];
      for (const row of dvktRows) if (row && row.key) auditState.dvktRows.set(String(row.key), row);
      for (const row of medicineRows) if (row && row.key) auditState.medicineRows.set(String(row.key), row);
      for (const row of contrastServices) if (row && row.key) auditState.contrastServices.set(String(row.key), row);
      for (const row of contrastMedicines) if (row && row.key) auditState.contrastMedicines.set(String(row.key), row);
      while (auditState.dvktRows.size > 1000) auditState.dvktRows.delete(auditState.dvktRows.keys().next().value);
      while (auditState.medicineRows.size > 1000) auditState.medicineRows.delete(auditState.medicineRows.keys().next().value);
      while (auditState.contrastServices.size > 500) auditState.contrastServices.delete(auditState.contrastServices.keys().next().value);
      while (auditState.contrastMedicines.size > 500) auditState.contrastMedicines.delete(auditState.contrastMedicines.keys().next().value);
      scheduleVisibleResultScan(0);
      setTimeout(() => scheduleVisibleResultScan(0), 500);
      setTimeout(() => scheduleVisibleResultScan(0), 1100);
      return;
    }
    if (event.data.type !== "SERVICES") return;
    const incoming = Array.isArray(event.data.rows) ? event.data.rows : [];
    if (!incoming.length) return;
    const ventilationChanged = hthRememberVentilationIntervals(incoming);
    const caseKeys = [...new Set(incoming.map(r => String(r.caseKey || "")).filter(Boolean))];
    const incomingCase = caseKeys.length === 1 ? caseKeys[0] : "";
    const groups = [...new Set(incoming.map(r => String(r.groupKey || "")).filter(Boolean))];
    const incomingGroup = groups.length === 1 ? groups[0] : "";

    // Prefer the visible BA number as the stable encounter scope. Different nested
    // RestService payloads can carry different internal IDs for the same case; using
    // those IDs as the reset key would erase the numbered service history on each click.
    const visibleCaseScope = String(currentVisibleEncounter || readVisibleEncounter() || "").trim().toUpperCase();
    if (visibleCaseScope) {
      if (/^BA\d{6,}$/i.test(currentCase) && currentCase.toUpperCase() !== visibleCaseScope) {
        currentRows = [];
        currentGroup = "";
        hthClearVentilationCache();
      }
      currentCase = visibleCaseScope;
    } else {
      // If HIS hasn't exposed a visible BA yet, fall back to the available API case key.
      if (incomingCase && currentCase && incomingCase !== currentCase) {
        currentRows = [];
        currentGroup = "";
        hthClearVentilationCache();
      }
      if (incomingCase) currentCase = incomingCase;
    }
    if (incomingGroup) currentGroup = incomingGroup;
    const byKey = new Map(currentRows.map(r => [hthHistoryKey(r), r]));
    for (const r of incoming) {
      const key = hthHistoryKey(r);
      let previous = byKey.get(key) || null;
      let previousKey = key;

      // If the first payload lacked a start time but the next one supplies it, upgrade
      // that same history item instead of leaving a duplicate missing-time card behind.
      if (!previous && String(r.start || "").trim()) {
        const base = hthHistoryBaseKey(r);
        const candidates = [...byKey.entries()].filter(([, existing]) =>
          hthHistoryBaseKey(existing) === base && !String(existing.start || "").trim()
        );
        if (candidates.length === 1) {
          previousKey = candidates[0][0];
          previous = candidates[0][1];
        }
      }
      // If only the end time is updated, use the unique same-service entry with the
      // same start. This preserves the numbered card and its previous metadata.
      const prior = previous || {};
      const sameService = String(r.serviceCode || prior.serviceCode || "") === String(prior.serviceCode || r.serviceCode || "") &&
        String(r.serviceName || prior.serviceName || "") === String(prior.serviceName || r.serviceName || "");
      const next = {
        ...prior,
        rowKey: String(r.rowKey || prior.rowKey || key),
        caseKey: String(r.caseKey || prior.caseKey || ""),
        groupKey: String(r.groupKey || prior.groupKey || ""),
        serviceName: String(r.serviceName || prior.serviceName || ""),
        serviceCode: String(r.serviceCode || prior.serviceCode || ""),
        start: String(r.start || (sameService ? prior.start : "") || ""),
        end: String(r.end || (sameService ? prior.end : "") || ""),
        expected: String(r.expected || prior.expected || ""),
        quantity: String(r.quantity || prior.quantity || "")
      };
      // Preserve timing recovered from the visible HIS bed grid if a smaller REST
      // response for this same service omits its start/end fields.
      if (prior.timingSource === "visible-HIS-grid" && sameService) {
        const missingApiStart = !String(r.start || "").trim();
        const missingApiEnd = !String(r.end || "").trim();
        if (missingApiStart) next.start = prior.start;
        if (missingApiEnd) next.end = prior.end;
        if (missingApiStart || missingApiEnd) {
          next.timingSource = prior.timingSource;
          next.timingTicket = prior.timingTicket || "";
        } else {
          delete next.timingSource;
          delete next.timingTicket;
        }
      }
      const nextKey = hthHistoryKey(next);
      if (previous && previousKey !== nextKey) byKey.delete(previousKey);
      byKey.set(nextKey, next);
    }
    // Keep recent visible service history for the numbered cards. Ventilation intervals
    // are retained separately for suction checks; the history UI itself remains the old
    // per-service numbered cards, not a second unrelated cache table.
    currentRows = Array.from(byKey.values()).slice(-100);
    // A newly received interval can change suction comparison even when the service list
    // itself was trimmed or a later response belongs to another service row.
    hthScheduleRender(ventilationChanged ? 45 : 170);
    if (currentRows.some(row => hthIsBedService(row) && (!String(row.start || "").trim() || !String(row.end || "").trim()))) {
      hthScheduleBedTiming(110, 2);
    }
  });


  // Khi rê chuột/bấm vào một dòng dịch vụ trong bảng HIS, tìm thẻ tương ứng
  // theo thời điểm chỉ định (ưu tiên) hoặc mã dịch vụ, rồi cuộn thẻ đó vào tầm nhìn.
  function normalizeDateTime(value) {
    const m = String(value || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!m) return "";
    return `${m[1].padStart(2,"0")}/${m[2].padStart(2,"0")}/${m[3]} ${m[4].padStart(2,"0")}:${m[5]}:${(m[6] || "00").padStart(2,"0")}`;
  }
  function findHisServiceRow(target) {
    let el = target;
    while (el && el !== document.body) {
      if (/^(TR|LI)$/i.test(el.tagName) && el.querySelectorAll("td,th").length >= 2) return el;
      el = el.parentElement;
    }
    return null;
  }
  function focusMatchingCard(tr) {
    if (!tr || !area || !area.children.length) return;
    const rowText = tr.innerText || tr.textContent || "";
    const dateMatch = rowText.match(/\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}(?::\d{2})?/);
    const selectedTime = dateMatch ? normalizeDateTime(dateMatch[0]) : "";
    const cells = Array.from(tr.querySelectorAll("td,th")).map(td => (td.innerText || td.textContent || "").trim());
    // Mã dịch vụ có thể nằm trong bảng chi tiết bên dưới; khi không đọc được mã ở dòng trên,
    // dùng thời gian chỉ định làm khóa chính để tránh chọn nhầm dịch vụ cùng ca.
    let matched = null;
    if (selectedTime) {
      matched = Array.from(area.querySelectorAll(".hth-card")).find(card =>
        normalizeDateTime(card.dataset.start) === selectedTime
      ) || null;
    }
    if (!matched) {
      const text = rowText.toLowerCase();
      const code = (text.match(/\bpt\d{4}\b/i) || [])[0];
      if (code) matched = Array.from(area.querySelectorAll(".hth-card")).find(card =>
        (card.dataset.code || "").toLowerCase() === code.toLowerCase()
      ) || null;
    }
    if (!matched) return;
    area.querySelectorAll(".hth-card.hth-selected").forEach(card => card.classList.remove("hth-selected"));
    matched.classList.add("hth-selected");
    matched.scrollIntoView({block:"nearest", behavior:"auto"});
    const bodyRect = body.getBoundingClientRect();
    const cardRect = matched.getBoundingClientRect();
    if (cardRect.top < bodyRect.top) body.scrollTop -= (bodyRect.top - cardRect.top) + 12;
    else if (cardRect.bottom > bodyRect.bottom) body.scrollTop += (cardRect.bottom - bodyRect.bottom) + 12;
  }
  function normalizeMatchText(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
  }
  function dateTimesInText(value) {
    const text = String(value || "");
    const re = /\b\d{1,2}[\/-]\d{1,2}[\/-]\d{4}\s+\d{1,2}:\d{2}(?::\d{2})?\b/g;
    return Array.from(text.matchAll(re), match => normalizeDateTime(match[0])).filter(Boolean);
  }
  function visibleHisServiceRows() {
    return Array.from(document.querySelectorAll("tr, [role='row'], li"))
      .filter(el => isVisibleElement(el) && el.querySelectorAll("td, th, [role='gridcell'], [role='columnheader']").length >= 2);
  }
  function jumpToHisRowFromCard(card) {
    if (!card) return;
    const start = normalizeDateTime(card.dataset.start || "");
    const code = String(card.dataset.code || "").trim().toLowerCase();
    const serviceName = normalizeMatchText(card.dataset.serviceName ||
      (card.querySelector(".hth-name") ? card.querySelector(".hth-name").textContent.replace(/^\s*\d+\.\s*/, "") : ""));
    const rows = visibleHisServiceRows();
    let best = null;
    let bestScore = 0;
    let tied = false;

    for (const row of rows) {
      if (row.closest("#scanx-time-helper, #scanx-scan-panel, #scanx-scan-trigger")) continue;
      const rowText = String(row.innerText || row.textContent || "").replace(/\s+/g, " ").trim();
      if (!rowText) continue;
      const dates = dateTimesInText(rowText);
      const hasStart = !!start && dates.includes(start);
      const normalizedRow = normalizeMatchText(rowText);
      const normalizedCode = normalizeMatchText(code);
      const hasCode = !!normalizedCode && normalizedRow.includes(normalizedCode);
      const hasName = !!serviceName && serviceName.length >= 5 && normalizedRow.includes(serviceName);
      // Exact start time is the main link; service code/name disambiguate rows sharing a time.
      let score = hasStart ? 100 : 0;
      if (hasCode) score += 55;
      if (hasName) score += 35;
      if (!hasStart && hasCode && hasName) score = Math.max(score, 95);
      if (score > bestScore) { best = row; bestScore = score; tied = false; }
      else if (score && score === bestScore && best && row !== best) tied = true;
    }

    if (!best || bestScore < 95) {
      showJumpToast("Chưa tìm thấy dòng HIS tương ứng trên màn hình hiện tại. Em mở đúng tab/danh sách dịch vụ rồi bấm vào mục này lần nữa nhé.", true);
      return;
    }
    area.querySelectorAll(".hth-card.hth-selected").forEach(el => el.classList.remove("hth-selected"));
    card.classList.add("hth-selected");
    document.querySelectorAll(".scanx-jump-target").forEach(el => el.classList.remove("scanx-jump-target"));
    best.classList.add("scanx-jump-target");
    try { best.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" }); }
    catch (_) { best.scrollIntoView(); }
    const rowLabel = card.dataset.serviceName || card.dataset.code || "dịch vụ";
    const matchQuality = bestScore >= 100 ? "Đã tìm thấy" : "Đã tìm được dòng phù hợp theo mã/tên";
    showJumpToast(matchQuality + ": " + rowLabel + (tied ? " (có nhiều dòng gần giống, em kiểm tra ngày giờ trên dòng tô vàng nhé)." : "."), false);
    if (best.__hthJumpHighlightTimer) clearTimeout(best.__hthJumpHighlightTimer);
    best.__hthJumpHighlightTimer = setTimeout(() => best.classList.remove("scanx-jump-target"), 5200);
  }

  // Clicking a timing card locates the matching source row in HIS. This only scrolls/highlights;
  // it does not click the row or otherwise change the HIS record.
  panel.addEventListener("click", event => {
    const card = event.target.closest(".hth-card");
    if (!card) return;
    event.preventDefault();
    jumpToHisRowFromCard(card);
  });

  document.addEventListener("click", event => {
    const tr = findHisServiceRow(event.target);
    if (tr) focusMatchingCard(tr);
  }, true);

  panel.addEventListener("click", event => {
    if (event.target.closest("button[data-hth-toggle-errors]")) { hthSetOnlyErrors(!hthOnlyErrors); return; }
    const bedTicketRow = event.target.closest(".hth-bed-ticket-row");
    if (bedTicketRow) {
      event.preventDefault();
      const index = Number(bedTicketRow.dataset.recordIndex);
      const record = Number.isInteger(index) ? visibleBedTicketRecords[index] : null;
      if (record && record.row && document.contains(record.row)) {
        try { record.row.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" }); }
        catch (_) { record.row.scrollIntoView(); }
        document.querySelectorAll(".scanx-jump-target").forEach(el => el.classList.remove("scanx-jump-target"));
        record.row.classList.add("scanx-jump-target");
        if (record.row.__hthJumpHighlightTimer) clearTimeout(record.row.__hthJumpHighlightTimer);
        record.row.__hthJumpHighlightTimer = setTimeout(() => record.row.classList.remove("scanx-jump-target"), 5200);
      }
      return;
    }
    const button = event.target.closest("button[data-act]");
    if (!button) return;
    minimized = !minimized;
    body.style.display = minimized ? "none" : "block";
    panel.classList.toggle("hth-minimized", minimized);
    button.textContent = minimized ? "⏱" : "−";
    button.title = minimized ? "Mở bảng theo dõi" : "Thu gọn bảng theo dõi";
    if (!minimized) {
      lastRenderedSignature = "";
      render(true);
      hthScheduleBedTiming(80, 2);
    } else {
      // Tear down the card DOM when minimizing to keep the HIS page lightweight.
      lastRenderedSignature = "";
      render(true);
    }
  });

  // ---------------------------------------------------------------------------
  // QUÉT TẤT CẢ: tự chọn lần lượt từng bệnh nhân trong lưới #grdLS, chờ HIS tải
  // xong dữ liệu (main.js vẫn bắt RestService như khi người dùng tự bấm), rồi
  // gom toàn bộ cảnh báo DVKT / Thuốc / CT / thời gian dịch vụ vào một bảng.
  // Các quy tắc kiểm tra được dùng lại nguyên vẹn từ các bảng hiện có.
  // ---------------------------------------------------------------------------
  const scanStyle = document.createElement("style");
  scanStyle.id = "scanx-scan-style";
  scanStyle.textContent = `
    #scanx-scan-trigger{position:fixed;right:12px;top:70px;width:42px;height:42px;z-index:2147483645;border:1px solid #f0b46b;border-radius:10px;background:#fff4e5;color:#9a4d00;box-shadow:0 3px 14px rgba(0,0,0,.18);font:700 10px Arial,sans-serif;cursor:pointer;padding:0}
    #scanx-scan-panel{position:fixed;right:62px;top:70px;width:560px;max-width:calc(100vw - 80px);max-height:72vh;z-index:2147483646;background:#fff;color:#202124;border:1px solid #c9ced6;border-radius:10px;box-shadow:0 5px 24px rgba(0,0,0,.22);font:11px/1.4 Arial,sans-serif;overflow:hidden;display:none}
    #scanx-scan-panel *{box-sizing:border-box}
    #scanx-scan-panel .sc-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 10px;background:#fff4e5;color:#9a4d00;font-weight:700}
    #scanx-scan-panel .sc-head-actions{display:flex;gap:6px;align-items:center}
    #scanx-scan-panel button{border:1px solid #b8c2d1;background:#fff;border-radius:5px;padding:4px 8px;cursor:pointer;font-size:11px}
    #scanx-scan-panel button.sc-primary{background:#9a4d00;border-color:#9a4d00;color:#fff;font-weight:700}
    #scanx-scan-panel button:disabled{opacity:.55;cursor:default}
    #scanx-scan-panel .sc-body{padding:8px;overflow:auto;max-height:calc(72vh - 40px)}
    #scanx-scan-panel .sc-status{padding:7px 8px;border-radius:6px;background:#f5f7fa;color:#3c4650;margin-bottom:8px;overflow-wrap:anywhere}
    #scanx-scan-panel .sc-opts{display:grid;gap:5px;margin:0 0 8px;padding:7px 8px;border:1px solid #eef0f3;border-radius:7px;background:#fcfcfd}
    #scanx-scan-panel .sc-opt-row{display:flex;flex-wrap:wrap;gap:5px;align-items:center}
    #scanx-scan-panel .sc-opt-label{width:96px;color:#6b7280;font-weight:700}
    #scanx-scan-panel .sc-opts input.sc-bhyt{width:200px;height:26px;box-sizing:border-box;background:#fff;color:#1f2937;border:1px solid #b8c2d1;border-radius:5px;padding:4px 6px;font-size:11px}
    #scanx-scan-panel .sc-lookup{border:1px solid #c9d7ea;background:#f3f8ff;border-radius:6px;padding:6px 8px;margin-bottom:6px;line-height:1.45}
    #scanx-scan-panel .sc-lookup ul{margin:3px 0 0 16px;padding:0}
    #scanx-scan-panel .sc-lookup summary{cursor:pointer;color:#1f4f8a}
    #scanx-scan-panel .sc-opts label{position:relative;cursor:pointer;user-select:none}
    #scanx-scan-panel .sc-opts input[type=checkbox],#scanx-scan-panel .sc-opts input[type=radio]{position:absolute;opacity:0;width:0;height:0;margin:0}
    #scanx-scan-panel .sc-opts label>span{display:inline-block;padding:2px 9px;border:1px solid #d0d5dd;background:#fff;color:#475467;transition:background .12s,border-color .12s}
    #scanx-scan-panel .sc-chip>span{border-radius:12px}
    #scanx-scan-panel .sc-chip>span::before{content:"+ ";color:#98a2b3}
    #scanx-scan-panel .sc-chip input:checked+span{background:#fff4e5;border-color:#f0b46b;color:#9a4d00;font-weight:700}
    #scanx-scan-panel .sc-chip input:checked+span::before{content:"✓ ";color:#9a4d00}
    #scanx-scan-panel .sc-seg{display:inline-flex}
    #scanx-scan-panel .sc-seg label+label>span{margin-left:-1px}
    #scanx-scan-panel .sc-seg label:first-child>span{border-radius:12px 0 0 12px}
    #scanx-scan-panel .sc-seg label:last-child>span{border-radius:0 12px 12px 0}
    #scanx-scan-panel .sc-seg input:checked+span{background:#9a4d00;border-color:#9a4d00;color:#fff;font-weight:700}
    #scanx-scan-panel .sc-opts label:hover>span{border-color:#f0b46b}
    #scanx-scan-panel .sc-opts input:focus-visible+span{outline:2px solid #1a73e8;outline-offset:1px}
    #scanx-scan-panel .sc-patient{border:1px solid #e1e6eb;border-radius:7px;margin:7px 0;overflow:hidden}
    #scanx-scan-panel .sc-patient.sc-has-error{border:2px solid #d92d20}
    #scanx-scan-panel .sc-phead{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 8px;background:#f8fafc}
    #scanx-scan-panel .sc-has-error .sc-phead{background:#fff0ee}
    #scanx-scan-panel .sc-pname{font-weight:700;overflow-wrap:anywhere}
    #scanx-scan-panel .sc-badge{border-radius:10px;padding:1px 8px;font-weight:700;white-space:nowrap}
    #scanx-scan-panel .sc-badge-bad{background:#c62828;color:#fff}
    #scanx-scan-panel .sc-badge-good{background:#eaf7ef;color:#176b3a}
    #scanx-scan-panel .sc-badge-none{background:#eef1f4;color:#5f6368}
    #scanx-scan-panel .sc-errors{margin:0;padding:6px 8px 6px 26px}
    #scanx-scan-panel .sc-errors li{margin:2px 0;color:#842018;overflow-wrap:anywhere}
    #scanx-scan-panel .sc-errors b{color:#5b1610}
    #scanx-scan-panel .sc-errors li.sc-info{color:#8a5a00;background:#fff8d6;border-radius:4px;padding:1px 4px}
    #scanx-scan-panel .sc-errors li.sc-info b{color:#7a4f00}
    #scanx-scan-panel .sc-errors ul.sc-repeat-lines{margin:2px 0 3px 14px;padding:0;list-style:disc}
    #scanx-scan-panel .sc-errors ul.sc-repeat-lines li{margin:1px 0;background:none;padding:0}
    #scanx-scan-panel .sc-meta{margin:6px 8px 2px;padding:5px 8px;border-left:3px solid #1a73e8;background:#eef4fd;border-radius:4px;color:#1f2937;font-size:11px}
    #scanx-scan-panel .sc-meta-row{margin:1px 0;overflow-wrap:anywhere}
    #scanx-scan-panel .sc-meta-row b{color:#174ea6}
    #scanx-scan-panel .sc-meta-none{color:#6b7280}
    #scanx-scan-panel details{padding:4px 8px 8px}
    #scanx-scan-panel summary{cursor:pointer;color:#174ea6;font-weight:700}
    #scanx-scan-panel table{border-collapse:collapse;width:100%;font-size:10.5px;margin-top:5px;table-layout:fixed}
    #scanx-scan-panel th{background:#f1f5f9;text-align:left}
    #scanx-scan-panel td,#scanx-scan-panel th{padding:3px 4px;border-bottom:1px solid #e7ebef;vertical-align:top;overflow-wrap:anywhere}
    #scanx-scan-panel td.sc-bad{color:#b91c1c;font-weight:700;background:#fff0f0}
  `;
  (document.head || document.documentElement).appendChild(scanStyle);

  const scanButton = document.createElement("button");
  scanButton.id = "scanx-scan-trigger"; scanButton.type = "button";
  scanButton.title = "Quét bệnh nhân trong danh sách và hiển thị toàn bộ lỗi, thời gian";
  scanButton.textContent = "QUÉT";
  (document.body || document.documentElement).appendChild(scanButton);

  const scanLoadEarly = key => { try { return window.localStorage.getItem(key) || ""; } catch (_) { return ""; } };
  const scanPanel = document.createElement("section");
  scanPanel.id = "scanx-scan-panel";
  scanPanel.innerHTML = `<div class="sc-head"><span>QUÉT BỆNH NHÂN</span><div class="sc-head-actions">
      <button type="button" class="sc-primary" data-scan-act="start">Bắt đầu quét</button>
      <button type="button" data-scan-act="stop" disabled>Dừng</button>
      <button type="button" data-scan-act="close">Đóng</button></div></div>
    <div class="sc-body"><div class="sc-status">Chọn phạm vi rồi bấm "Bắt đầu quét". Giữ tab HIS đang mở trong khi quét.</div>
    <div class="sc-opts">
      <div class="sc-opt-row"><span class="sc-opt-label">Quét bệnh nhân</span><span class="sc-seg">
        <label title="Quét tất cả bệnh nhân đang hiện trong danh sách HIS"><input type="radio" name="scanx-scan-scope" value="all" data-scan-scope><span>Tất cả</span></label><label title="Chỉ quét bệnh nhân đang chọn (hoặc đã tích) trong danh sách HIS"><input type="radio" name="scanx-scan-scope" value="selected" data-scan-scope><span>1 người</span></label></span></div>
      <div class="sc-opt-row"><span class="sc-opt-label">Theo BHYT</span>
        <input type="text" class="sc-bhyt" data-scan-bhyt placeholder="Mã thẻ BHYT (hoặc 10 số cuối)" title="Tìm theo Mã BHYT để lấy họ tên, năm sinh, địa chỉ; tìm lại theo họ tên + năm sinh; chỉ quét các lần vào viện có cùng địa chỉ">
        <button type="button" class="sc-primary" data-scan-act="bhyt">Tìm &amp; quét</button></div>
      <div class="sc-opt-row"><span class="sc-opt-label">Kiểm tra</span>
        <label class="sc-chip" title="Kiểm tra xét nghiệm: tự mở tab Xét nghiệm và tất cả phiếu xét nghiệm của từng bệnh nhân"><input type="checkbox" data-scan-tab-xn><span>Xét nghiệm</span></label>
        <label class="sc-chip" title="Kiểm tra thuốc: tự mở tab Thuốc và tất cả đơn thuốc của từng bệnh nhân"><input type="checkbox" data-scan-tab-thuoc><span>Thuốc</span></label>
        <label class="sc-chip" title="Kiểm tra PTTT: tự mở tab PTTT của từng bệnh nhân và báo dịch vụ không đủ thời gian thực hiện"><input type="checkbox" data-scan-tab-pttt><span>PTTT</span></label>
</div>
      <div class="sc-opt-row"><span class="sc-opt-label">Hiện</span>
        <label class="sc-chip" title="Bật: chỉ hiện ca và dòng có lỗi. Tắt: hiện tất cả dòng xét nghiệm, có lỗi và không lỗi"><input type="checkbox" data-scan-filter><span>Chỉ hiện lỗi</span></label>
</div>
    </div>
    <div class="sc-results"></div></div>`;
  (document.body || document.documentElement).appendChild(scanPanel);
  // Other extensions on this page (e.g. "Kiểm tra hồ sơ bệnh án điện tử") put
  // their own buttons in the same right-hand column (⏱, BHYT, DVKT, THUỐC, CT,
  // QUÉT...). Their layout differs between versions, so instead of a fixed top
  // look at what is actually there and take the first free 42px slot.
  const SCAN_SLOT_TOP = 70, SCAN_SLOT_H = 42, SCAN_SLOT_GAP = 8;
  function scanRightColumnObstacles() {
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const out = [];
    // Extension launchers are appended straight to <body>/<html>; checking only
    // those keeps this cheap on the large HIS page.
    const candidates = [...(document.body ? document.body.children : []), ...document.documentElement.children];
    for (const el of candidates) {
      if (el === scanButton || el === scanPanel) continue;
      const cs = getComputedStyle(el);
      if (cs.position !== "fixed" || cs.display === "none" || cs.visibility === "hidden") continue;
      const r = el.getBoundingClientRect();
      // Only small launcher buttons hugging the right edge; open panels move
      // around and are not slots.
      if (!r.width || !r.height || r.width > 90 || r.height > 90) continue;
      if (r.right < vw - 40 || r.left > vw) continue;
      out.push(r);
    }
    return out.sort((x, y) => x.top - y.top);
  }
  let scanPlacedTop = -1;
  function scanPlaceTrigger() {
    let top = SCAN_SLOT_TOP;
    const obstacles = scanRightColumnObstacles();
    for (let moved = true; moved;) {
      moved = false;
      for (const r of obstacles) {
        if (r.top < top + SCAN_SLOT_H + SCAN_SLOT_GAP && r.bottom + SCAN_SLOT_GAP > top) {
          top = Math.ceil(r.bottom + SCAN_SLOT_GAP); moved = true;
        }
      }
    }
    if (top === scanPlacedTop) return;
    scanPlacedTop = top;
    scanButton.style.top = `${top}px`;
    // Keep the panel's top inside the screen even if the button ends up low.
    scanPanel.style.top = `${Math.min(top, Math.max(SCAN_SLOT_TOP, Math.round(window.innerHeight * 0.25)))}px`;
  }
  scanPlaceTrigger();
  // Content scripts of different extensions load in no fixed order, and some
  // add their buttons late: re-check for a while after start-up and on resize.
  {
    let placeTimer = 0;
    const schedulePlace = () => { clearTimeout(placeTimer); placeTimer = setTimeout(scanPlaceTrigger, 150); };
    const placeObserver = new MutationObserver(schedulePlace);
    placeObserver.observe(document.body || document.documentElement, { childList: true });
    for (const ms of [500, 1500, 3000, 6000, 10000]) setTimeout(scanPlaceTrigger, ms);
    setTimeout(() => placeObserver.disconnect(), 20000);
    window.addEventListener("resize", schedulePlace);
  }
  const scanStatus = scanPanel.querySelector(".sc-status");
  const scanResultsEl = scanPanel.querySelector(".sc-results");
  const scanStartBtn = scanPanel.querySelector('[data-scan-act="start"]');
  const scanStopBtn = scanPanel.querySelector('[data-scan-act="stop"]');
  const scanBhytInput = scanPanel.querySelector("[data-scan-bhyt]");
  const scanBhytBtn = scanPanel.querySelector('[data-scan-act="bhyt"]');
  scanBhytInput.value = scanLoadEarly("hthScanBhyt");
  // HIS listens on the whole page for focus, mouse and key events (modal
  // dialogs pull focus back to themselves, hotkeys swallow typing), so a click
  // on the BHYT box never lets you type. Keep these events inside the panel.
  for (const type of ["mousedown", "pointerdown", "focusin", "keydown", "keypress", "keyup", "input"]) {
    scanPanel.addEventListener(type, event => event.stopPropagation());
  }
  scanBhytInput.addEventListener("keydown", event => {
    if (event.key === "Enter") { event.preventDefault(); scanByBhyt(scanBhytInput.value); }
  });
  const scanFilter = scanPanel.querySelector("[data-scan-filter]");
  // Every collected error is shown ([Thuốc] errors included).
  function scanVisibleErrors(result) {
    return result.errors || [];
  }
  // "Hoàn tất: 4/4 ca đã quét" part of the status line; counts are added from the visible errors.
  let scanSummaryPrefix = "";
  function scanUpdateSummary() {
    if (!scanSummaryPrefix) return;
    const errorCases = scanResults.filter(r => scanVisibleErrors(r).length).length;
    const totalErrors = scanResults.reduce((sum, r) => sum + scanVisibleErrors(r).length, 0);
    scanStatus.textContent = `${scanSummaryPrefix} · ${errorCases} ca có lỗi · ${totalErrors} lỗi.`;
    scanButton.textContent = errorCases ? `QUÉT ${errorCases}` : "QUÉT";
  }
  // Scan scope (all rows / only the rows ticked or highlighted in #grdLS) and
  // which HIS data tabs QUÉT opens per patient. Remembered per browser.
  const scanStore = (key, value) => { try { window.localStorage.setItem(key, value); } catch (_) {} };
  const scanLoad = (key, fallback) => { try { const v = window.localStorage.getItem(key); return v === null ? fallback : v; } catch (_) { return fallback; } };
  const scanScopeInputs = Array.from(scanPanel.querySelectorAll("[data-scan-scope]"));
  const savedScope = scanLoad("hthScanScope", "all");
  scanScopeInputs.forEach(input => {
    input.checked = input.value === savedScope;
    input.addEventListener("change", () => { if (input.checked) scanStore("hthScanScope", input.value); });
  });
  if (!scanScopeInputs.some(input => input.checked)) scanScopeInputs[0].checked = true;
  const scanScope = () => (scanScopeInputs.find(input => input.checked) || {}).value || "all";
  const scanTabXn = scanPanel.querySelector("[data-scan-tab-xn]");
  const scanTabThuoc = scanPanel.querySelector("[data-scan-tab-thuoc]");
  scanTabXn.checked = scanLoad("hthScanTabXN", "1") !== "0";
  scanTabThuoc.checked = scanLoad("hthScanTabThuoc", "1") !== "0";
  scanTabXn.addEventListener("change", () => scanStore("hthScanTabXN", scanTabXn.checked ? "1" : "0"));
  scanTabThuoc.addEventListener("change", () => scanStore("hthScanTabThuoc", scanTabThuoc.checked ? "1" : "0"));
  const scanTabPttt = scanPanel.querySelector("[data-scan-tab-pttt]");
  scanTabPttt.checked = scanLoad("hthScanTabPTTT", "1") !== "0";
  scanTabPttt.addEventListener("change", () => scanStore("hthScanTabPTTT", scanTabPttt.checked ? "1" : "0"));
  const scanAnyDataTab = () => scanTabXn.checked || scanTabThuoc.checked || scanTabPttt.checked;

  // Tuned for VNPT-HIS: one patient click triggers a burst of RestService calls,
  // which main.js parses during idle time. Wait for that burst to go quiet.
  const SCAN_MIN_WAIT_MS = 1000;
  const SCAN_QUIET_MS = 1500;
  const SCAN_MAX_WAIT_MS = 30000;
  const SCAN_SWITCH_WAIT_MS = 6000;

  let scanRunning = false;
  let scanStopRequested = false;
  let scanLastDataAt = 0;
  let scanResults = [];
  // QUÉT theo BHYT: who was looked up and which visits were kept (shown above the results).
  let scanLookup = null;
  // Phiếu lists HIS returned for the visit being scanned (diagnostics).
  let scanVisitLists = [];
  // HIS tabs QUÉT opened for the visit being scanned (diagnostics).
  let scanVisitTabs = [];
  // Every phiếu list main.js reported (empty ones too), and whether the last was empty.
  let scanListEvents = 0;
  let scanLastListEmpty = false;

  // Phiếu auto-walk state reported by main.js (page world).
  let walkActive = false;
  let walkStartedAt = 0;
  window.addEventListener("message", event => {
    if (event.source !== window || !event.data) return;
    if (event.data.__hthScanResponse === true && /^walk-/.test(String(event.data.id || "")) && !event.data.ok) {
      showJumpToast(`Không mở được phiếu: ${event.data.error || "không rõ lý do"}`, true);
      return;
    }
    if (event.data.__hthWalkEvent === true) {
      const ev = event.data;
      scanLastDataAt = Date.now();
      const kind = ev.kind || "phiếu";
      const isDrug = /thuốc/i.test(kind);
      const tally = () => isDrug ? `Thuốc ${auditState.medicineRows.size} dòng` : `DVKT ${auditState.dvktRows.size} dòng`;
      if (ev.type === "labError") {
        if (scanRunning && !auditState.labErrors.includes(String(ev.error || ""))) auditState.labErrors.push(String(ev.error || "không rõ lý do"));
        return;
      }
      if (ev.type === "list") {
        scanListEvents++;
        scanLastListEmpty = !!ev.empty;
        // An empty list has nothing to open: not shown under "Phiếu đã nhận".
        // A list already opened for this visit (HIS re-sent it) is not shown twice.
        // A list of a kind whose "Tự mở" button is off is not opened: not shown either.
        if (scanRunning && !ev.empty && !ev.repeat && !ev.skipped) scanVisitLists.push({ kind, total: Number(ev.total) || 0, opened: null });
      }
      if (scanRunning && ev.type === "done") {
        const entry = [...scanVisitLists].reverse().find(item => item.kind === kind && item.opened === null);
        if (entry) entry.opened = Number(ev.opened) || 0;
      }
      if (ev.type === "start") {
        walkActive = true; walkStartedAt = Date.now();
        showJumpToast(`Đang tự mở ${ev.total} ${kind}…`);
      } else if (ev.type === "progress") {
        walkActive = true;
        showJumpToast(`Đang tự mở ${kind} ${ev.done}/${ev.total}… (${tally()})`);
      } else if (ev.type === "done") {
        walkActive = false;
        // Switching patient mid-run is normal: the new patient's run follows.
        if (!ev.ok && /bệnh nhân khác/.test(String(ev.error || ""))) return;
        showJumpToast(ev.ok
          ? `Đã mở xong ${ev.opened}/${ev.total} ${kind} · ${tally()}`
          : `Ngừng tự mở ${kind}: ${ev.error || "không rõ lý do"} (${ev.opened || 0}/${ev.total || 0})`, !ev.ok);
      }
      return;
    }
    if (event.data.__hisTimeHelperV31 !== true && event.data.__hisTimeHelperIcdV1 !== true) return;
    scanLastDataAt = Date.now();
  });

  // Chrome throttles timers in hidden tabs (1 s, then 1 per minute after 5 min).
  // Timers inside a dedicated Worker are not throttled, so while the tab is
  // hidden sleep through a tiny Worker; fall back to setTimeout if it is blocked.
  function hthMakeBackgroundSleep() {
    let worker = null, seq = 0;
    const pending = new Map();
    const flush = () => { worker = null; for (const done of pending.values()) done(); pending.clear(); };
    try {
      const src = "onmessage=e=>setTimeout(()=>postMessage(e.data),e.data.ms)";
      worker = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
      worker.onmessage = e => { const done = pending.get(e.data.id); if (done) { pending.delete(e.data.id); done(); } };
      worker.onerror = flush;
    } catch (_) { worker = null; }
    return ms => new Promise(resolve => {
      if (!worker || document.visibilityState === "visible") { setTimeout(resolve, ms); return; }
      const id = ++seq;
      pending.set(id, resolve);
      try { worker.postMessage({ id, ms }); } catch (_) { pending.delete(id); setTimeout(resolve, ms); }
    });
  }
  const scanSleep = hthMakeBackgroundSleep();
  function scanHisKey() {
    const read = id => {
      const el = document.getElementById(id);
      return el && "value" in el ? String(el.value || "").trim() : "";
    };
    return [read("hidTIEPNHANID"), read("hidHOSOBENHANID"), read("hidBENHNHANID")].join("|");
  }
  function scanCellByField(row, pattern) {
    return Array.from(row.querySelectorAll("td")).find(td => pattern.test(String(td.getAttribute("aria-describedby") || ""))) || null;
  }
  function scanRowInfo(row, index) {
    const cells = Array.from(row.querySelectorAll("td"));
    const text = (cells.length ? cells.map(td => String(td.textContent || "").trim()).join(" ") : String(row.textContent || ""))
      .replace(/\s+/g, " ").trim();
    const caseNo = ((text.match(/\b(BA\d{6,})\b/i) || [])[1] || "").toUpperCase();
    const nameCell = scanCellByField(row, /TENBENHNHAN|HOTEN|HO_TEN/i);
    const name = nameCell ? String(nameCell.innerText || nameCell.textContent || "").trim() : "";
    // Patient identity across visits (Bộ mỡ rule): Mã BN, else Mã BHYT, else name + birth date.
    const patientId = ((text.match(/\b(BN\d{4,})\b/i) || [])[1] || "").toUpperCase();
    const card = ((text.match(/\b([A-Z]{2}\d{13})\b/) || [])[1] || "").toUpperCase();
    const dobText = (text.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b(?!\s+\d{1,2}:\d{2})/) || [])[1] || "";
    const patientKey = patientId ? `BN:${patientId}` : (card ? `BHYT:${card}` : (name && dobText ? `NAME:${domToken(name)}|${dobText}` : ""));
    // Visit date = "Ngày vào viện" column, else the first date-time in the row (birth date has no time).
    const admissionCell = scanCellByField(row, /NGAYVAO|VAOVIEN|NGAYTIEPNHAN|THOIGIANVAO/i);
    const admissionText = admissionCell ? String(admissionCell.textContent || "").trim() : "";
    const visitDate = auditDateOnly(admissionText) ||
      auditDateOnly((text.match(/\b(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2})/) || [])[1] || "");
    const cellText = pattern => { const td = scanCellByField(row, pattern); return td ? String(td.textContent || "").replace(/\s+/g, " ").trim() : ""; };
    const bhyt = cellText(/_MA_BHYT$|_MABHYT$/i);
    const address = cellText(/_DIACHI$/i);
    const birthYear = ((cellText(/_NGAYSINH$|_NAMSINH$/i) || dobText).match(/\b((?:19|20)\d{2})\b/) || [])[1] || "";
    return { index, row, rowId: row.id || "", caseNo, name, patientKey, visitDate, bhyt, address, birthYear,
      label: [caseNo, name].filter(Boolean).join(" – ") || text.slice(0, 80) };
  }
  function scanPatientRows() {
    const grid = document.getElementById("grdLS");
    if (grid) {
      const rows = Array.from(grid.querySelectorAll("tr.jqgrow"))
        .filter(row => getComputedStyle(row).display !== "none");
      if (rows.length) return rows.map(scanRowInfo);
    }
    // Fallback: visible patient rows identified the same way as manual clicks.
    const seen = new Set();
    const out = [];
    for (const row of document.querySelectorAll("tr")) {
      if (insideHelperUI(row) || !isVisibleElement(row)) continue;
      if (!hthIsLikelyPatientRow(row)) continue;
      const info = scanRowInfo(row, out.length);
      if (!info.caseNo || seen.has(info.caseNo)) continue;
      seen.add(info.caseNo);
      out.push(info);
    }
    return out;
  }
  function scanIsRowSelected(row) {
    if (!row) return false;
    const box = row.querySelector('td[aria-describedby$="_cb"] input[type="checkbox"]');
    if (box && box.checked) return true;
    return row.classList.contains("ui-state-highlight") || row.getAttribute("aria-selected") === "true";
  }
  function scanResolveRow(info) {
    if (info.row && document.contains(info.row)) return info.row;
    if (info.rowId) {
      const grid = document.getElementById("grdLS");
      const byId = grid ? grid.querySelector(`tr[id="${CSS.escape(info.rowId)}"]`) : null;
      if (byId) return byId;
    }
    if (info.caseNo) {
      const match = scanPatientRows().find(item => item.caseNo === info.caseNo);
      if (match) return match.row;
    }
    return null;
  }
  function scanClickRow(row) {
    const cell = scanCellByField(row, /TENBENHNHAN|HOTEN|HO_TEN/i) ||
      Array.from(row.querySelectorAll("td")).find(td => !/_cb$|_rn$/.test(String(td.getAttribute("aria-describedby") || ""))) ||
      row;
    // The patient name may be a link/span with its own click handler; click the
    // innermost element of the name cell so that handler runs (it still bubbles to the row).
    let target = cell;
    while (target.firstElementChild && target.children.length === 1) target = target.firstElementChild;
    const link = cell.querySelector("a, [onclick]");
    if (link) target = link;
    try { row.scrollIntoView({ block: "nearest" }); } catch (_) {}
    const rect = target.getBoundingClientRect ? target.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
    const init = { bubbles: true, cancelable: true, view: window, button: 0, buttons: 1,
      clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
    target.dispatchEvent(new MouseEvent("mousedown", init));
    target.dispatchEvent(new MouseEvent("mouseup", { ...init, buttons: 0 }));
    target.dispatchEvent(new MouseEvent("click", { ...init, buttons: 0 }));
  }
  let scanRequestSeq = 0;
  function scanMainSelect(rowId) {
    // Ask main.js (page world) to select the row through jqGrid itself.
    return scanMainCall({ action: "select", rowId });
  }
  function scanMainCall(payload) {
    return new Promise(resolve => {
      const id = `scan-${Date.now()}-${++scanRequestSeq}`;
      const onMessage = event => {
        if (event.source !== window || !event.data || event.data.__hthScanResponse !== true || event.data.id !== id) return;
        window.removeEventListener("message", onMessage);
        clearTimeout(timer);
        resolve(event.data);
      };
      const timer = setTimeout(() => {
        window.removeEventListener("message", onMessage);
        resolve({ ok: false, error: "main.js không phản hồi (hãy tải lại tiện ích và trang HIS)" });
      }, 2000);
      window.addEventListener("message", onMessage);
      window.postMessage({ __hthScanRequest: true, id, ...payload }, "*");
    });
  }
  async function scanWaitKeyChange(previousKey, ms) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms && !scanStopRequested) {
      if (scanHisKey() !== previousKey) return true;
      await scanSleep(60);
    }
    return scanHisKey() !== previousKey;
  }
  // Select a patient the same way a user does, falling back to the jqGrid API.
  async function scanSelectPatient(row, info, previousKey, alreadySelected) {
    scanClickRow(row);
    if (alreadySelected) return { switched: true, method: "đang chọn sẵn" };
    if (await scanWaitKeyChange(previousKey, 1500)) return { switched: true, method: "click" };
    if (!info.rowId) return { switched: false, error: "Dòng không có id jqGrid" };
    const res = await scanMainSelect(info.rowId);
    if (await scanWaitKeyChange(previousKey, SCAN_SWITCH_WAIT_MS)) return { switched: true, method: "jqGrid" };
    return { switched: false, error: res.ok ? "HIS không chuyển sang ca này" : res.error };
  }
  async function scanWaitForPatient() {
    const t0 = Date.now();
    while (!scanStopRequested) {
      const now = Date.now();
      // While the helper is opening every phiếu of this patient, keep waiting
      // (up to 10 minutes) as long as it keeps making progress.
      if (walkActive) {
        if (now - t0 >= 10 * 60 * 1000 || now - scanLastDataAt >= SCAN_MAX_WAIT_MS) break;
        await scanSleep(300);
        continue;
      }
      if (now - t0 >= SCAN_MAX_WAIT_MS) break;
      if (now - t0 >= SCAN_MIN_WAIT_MS && now - Math.max(scanLastDataAt, t0) >= SCAN_QUIET_MS) break;
      await scanSleep(200);
    }
  }

  // ---- HIS tabs (Danh sách / Xét nghiệm / Thuốc) ----
  // HIS loads a tab's phiếu list only when that tab is opened. QUÉT therefore
  // opens the tabs below for every patient; each list that arrives is walked
  // phiếu by phiếu by main.js (scan mode).
  const SCAN_LIST_TAB = { name: "Danh sách", pattern: /^DANHSACH$/ };
  const SCAN_DATA_TABS = [
    { name: "Xét nghiệm", pattern: /^XETNGHIEM\d*$/, enabled: () => scanTabXn.checked },
    { name: "Thuốc", pattern: /^THUOC\d*$/, enabled: () => scanTabThuoc.checked },
    // "PTTT(3)" or "Phẫu thuật thủ thuật(3)" / "Phẫu thuật - Thủ thuật".
    { name: "PTTT", pattern: /^(PTTT|PHAUTHUATTHUTHUAT)\d*$/, enabled: () => scanTabPttt.checked }
  ];
  // The visible HIS tab whose own text is exactly the tab name, optionally with
  // the "(n)" count HIS appends ("Xét nghiệm(7)" -> XETNGHIEM7). "CT Thuốc/VT"
  // and the "Danh sách xét nghiệm" grid caption do not match.
  function scanFindHisTab(tab) {
    let best = null;
    for (const el of document.querySelectorAll("a, li, span, button")) {
      if (insideHelperUI(el)) continue;
      const raw = String(el.textContent || "");
      if (raw.length > 40) continue;
      if (!tab.pattern.test(domToken(raw))) continue;
      if (!isVisibleElement(el)) continue;
      // Prefer the link itself, then the element with the fewest children.
      const score = (el.tagName === "A" ? 0 : 1000) + el.getElementsByTagName("*").length;
      if (!best || score < best.score) best = { el, score };
    }
    return best ? best.el : null;
  }
  function scanTabCount(el) {
    const m = String(el && el.textContent || "").match(/\((\d+)\)/);
    return m ? Number(m[1]) : null;
  }
  function scanClickHisTab(el) {
    const target = (el.closest && el.closest("a")) || el.querySelector("a") || el;
    try { target.scrollIntoView({ block: "nearest" }); } catch (_) {}
    const rect = target.getBoundingClientRect();
    const init = { bubbles: true, cancelable: true, view: window, button: 0, buttons: 1,
      clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
    target.dispatchEvent(new MouseEvent("mousedown", init));
    target.dispatchEvent(new MouseEvent("mouseup", { ...init, buttons: 0 }));
    target.click();
  }
  // Open each data tab of the selected patient and wait until its phiếu are all
  // opened and the data has stopped arriving.
  async function scanOpenDataTabs(info, patientCount) {
    for (const tab of SCAN_DATA_TABS) {
      if (scanStopRequested) return;
      if (!tab.enabled()) { scanVisitTabs.push(`${tab.name}: tắt`); continue; }
      const el = scanFindHisTab(tab);
      if (!el) { scanVisitTabs.push(`${tab.name}: không thấy tab`); continue; }
      const count = scanTabCount(el);
      const label = `${tab.name}${count === null ? "" : ` (${count})`}`;
      // "Xét nghiệm(0)": nothing to open.
      if (count === 0) { scanVisitTabs.push(`${label}: bỏ qua`); continue; }
      scanStatus.textContent = `Đang quét ${info.index + 1}/${patientCount}: ${info.label} · tab ${label}`;
      const eventsBefore = scanListEvents;
      scanLastDataAt = Date.now();
      scanClickHisTab(el);
      // Wait (up to 5 s) for HIS to return this tab's phiếu list before
      // waiting for the walk; a slow reply must not be skipped.
      for (let waited = 0; waited < 5000 && !scanStopRequested && !walkActive && scanListEvents === eventsBefore; waited += 100) await scanSleep(100);
      if (scanListEvents === eventsBefore) {
        await scanWaitForPatient();
        scanVisitTabs.push(`${label}: HIS không trả danh sách`);
      } else if (scanLastListEmpty && !walkActive) {
        // Empty tab (HIS shows no "(n)" when there is nothing): move on at once.
        scanVisitTabs.push(`${tab.name}: trống`);
      } else {
        await scanWaitForPatient();
        scanVisitTabs.push(label);
      }
    }
  }

  function scanRowsWithClass(container, selector) {
    return Array.from(container.querySelectorAll(selector)).map(tr =>
      Array.from(tr.children).map(td => String(td.textContent || "").trim()));
  }
  // First dd/mm/yyyy date found in the given texts (cells or timestamps).
  function scanFirstDay(...texts) {
    for (const text of texts) {
      const m = String(text || "").match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
      if (m) return `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}/${m[3]}`;
    }
    return "";
  }
  // Time ("15:00:00") that follows the first dd/mm/yyyy found in texts, so an
  // error line can show "10/09/2026 15:00:00". "" when that text has no time.
  function scanFirstTime(...texts) {
    for (const text of texts) {
      const s = String(text || "");
      if (!/\b\d{1,2}\/\d{1,2}\/\d{4}\b/.test(s)) continue;
      const m = s.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\D{0,3}?(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      return m ? `${m[1].padStart(2, "0")}:${m[2]}:${m[3] || "00"}` : "";
    }
    return "";
  }
  // ---- XÉT NGHIỆM LẶP LẠI CHƯA ĐỦ 90 ± 3 NGÀY (Bộ mỡ, HbA1C) ----
  // Theo TT 39/2024/TT-BYT: chỉ thanh toán khi chưa làm trong vòng 90 ± 3 ngày,
  // tức lần sau phải cách lần trước ít nhất 87 ngày. Xét nghiệm ngày 05/11/2026
  // thì tìm lại từ ngày 11/08/2026 (cách 86 ngày); làm ngày 10/08/2026 (cách
  // 87 ngày) thì không tính là lặp lại.
  // Một ca có xét nghiệm thuộc một nhóm dưới đây, mà trong cửa sổ đó (ca
  // khác của cùng người bệnh trong danh sách đã quét, hoặc ngày khác trong cùng
  // ca) đã có xét nghiệm cùng nhóm, thì báo lỗi ở ca sau với nhãn của nhóm.
  // Mỗi nhóm so sánh riêng: Bộ mỡ không tính trùng với HbA1C.
  // Tests are reported only from (today - 3 months) on, like the visits.
  const SCAN_REPEAT_LOOKBACK_MONTHS = 3;
  // A repeat is allowed once at least this many days have passed (90 - 3).
  const SCAN_REPEAT_MIN_GAP_DAYS = 87;
  const SCAN_DAY_MS = 24 * 60 * 60 * 1000;
  // Whole days from `from` to `to` (both local midnight dates).
  function scanDaysBetween(from, to) {
    return Math.round((to - from) / SCAN_DAY_MS);
  }
  // Earliest day that is still a repeat of a test done on `date`.
  function scanRepeatWindowStart(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() - (SCAN_REPEAT_MIN_GAP_DAYS - 1));
  }
  const SCAN_REPEAT_TEST_RULES = [
    {
      module: "Bộ mỡ", testText: "xét nghiệm mỡ máu", title: "Xét nghiệm mỡ máu",
      // Mỡ máu (gói/dịch vụ tên "mỡ máu") / Cholesterol toàn phần / HDL-C /
      // Triglycerid (LDL-C không tính).
      match: token => token.includes("MOMAU") ? "Mỡ máu" :
        (token.includes("CHOLESTEROLTOANPHAN") ? "Cholesterol toàn phần" :
        (token.includes("HDL") ? "HDL-C" :
        (token.includes("TRIGLYCERID") ? "Triglycerid" : "")))
    },
    {
      module: "HbA1C", testText: "xét nghiệm HbA1c", title: "Xét nghiệm HbA1c",
      match: token => token.includes("HBA1C") ? "HbA1c" : ""
    }
  ];
  function scanRepeatTestMatch(name) {
    const token = domToken(name);
    if (!token) return null;
    for (const rule of SCAN_REPEAT_TEST_RULES) {
      const label = rule.match(token);
      if (label) return { module: rule.module, label };
    }
    return null;
  }
  function scanParseDay(text) {
    const m = String(text || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
  }
  // Same day `months` months before `date` (window start, inclusive):
  // 05/11/2026 with 3 -> 05/08/2026. A day missing in the target month is
  // clamped to its last day: 31/05/2026 -> 28/02/2026.
  function scanLookbackStart(date, months) {
    const lastDay = new Date(date.getFullYear(), date.getMonth() - months + 1, 0).getDate();
    return new Date(date.getFullYear(), date.getMonth() - months, Math.min(date.getDate(), lastDay));
  }
  function scanFormatDay(date) {
    const pad = n => String(n).padStart(2, "0");
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  }
  // Watched tests of the selected visit, each with its rule and order day. If
  // HIS gave no order time for a test, fall back to the visit's admission day.
  // Tests are only reported from (today - SCAN_REPEAT_LOOKBACK_MONTHS months,
  // same day) on, but each of those looks back SCAN_REPEAT_MIN_GAP_DAYS more,
  // so keep tests from that far back for the comparison.
  function scanReportCutoff() {
    const now = new Date();
    return scanLookbackStart(new Date(now.getFullYear(), now.getMonth(), now.getDate()), SCAN_REPEAT_LOOKBACK_MONTHS);
  }
  // Patients (admission day) and XN rows dated before (today - 3 months,
  // same day) are skipped: not scanned, not listed, not reported.
  const SCAN_SKIP_OLDER_MONTHS = 3;
  function scanSkipCutoff() {
    const now = new Date();
    return scanLookbackStart(new Date(now.getFullYear(), now.getMonth(), now.getDate()), SCAN_SKIP_OLDER_MONTHS);
  }
  // True when `day` (dd/mm/yyyy) is known and older than the skip cutoff.
  function scanIsTooOld(day, cutoff = scanSkipCutoff()) {
    const date = scanParseDay(day);
    return !!date && date < cutoff;
  }
  function scanCollectRepeatTests(fallbackDay) {
    const tests = new Map();
    const cutoff = scanRepeatWindowStart(scanReportCutoff());
    // time: "HH:mm:ss" of the source value, "" when HIS gave only a date.
    const timeOf = value => (auditDateTimeText(value).split(" ")[1] || "");
    const add = (code, name, day, time = "") => {
      const hit = scanRepeatTestMatch(name);
      if (!hit) return;
      const finalDay = day || fallbackDay || "";
      if (!finalDay) return;
      const date = scanParseDay(finalDay);
      if (date && date < cutoff) return;
      const key = `${hit.label}|${finalDay}`;
      const finalTime = day ? time : "";
      const existing = tests.get(key);
      if (!existing) tests.set(key, { module: hit.module, label: hit.label, code: auditText(code), name: auditText(name), day: finalDay, time: finalTime, dateFromVisit: !day });
      else if (finalTime && (!existing.time || finalTime < existing.time)) existing.time = finalTime;
    };
    for (const row of auditState.dvktRows.values()) {
      const orderPoint = Array.isArray(row.timePoints) ? row.timePoints.find(p => p && p.kind === "Y lệnh" && p.value) : null;
      const source = row.orderDate || (orderPoint && orderPoint.value) || "";
      add(row.hisCode || row.bhytCode, row.name, auditDateOnly(source), timeOf(source));
    }
    // The timing list's start may be a performed time rather than the order time,
    // so use it only for a test the DVKT capture did not see at all; otherwise a
    // test ordered one day and performed the next would look like a repeat.
    const seenLabels = new Set([...tests.values()].map(t => t.label));
    for (const row of currentRows) {
      const hit = scanRepeatTestMatch(row.serviceName);
      if (!hit || seenLabels.has(hit.label)) continue;
      add(row.serviceCode, row.serviceName, auditDateOnly(row.start || ""), timeOf(row.start || ""));
    }
    return [...tests.values()];
  }
  // Short names of the tests actually done: "Cholesterol toàn phần, Triglycerid".
  function scanTestLabels(tests) {
    return [...new Set(tests.map(t => t.label).filter(Boolean))].join(", ");
  }
  function scanTestListText(tests) {
    return [...new Set(tests.map(t => `${t.code ? t.code + " " : ""}${t.name || t.label}`))].join("; ");
  }
  // Recompute repeat-test errors across every scanned visit. Run after each
  // patient so the result does not depend on the order of rows in the HIS list.
  function scanApplyRepeatTestRules() {
    const repeatErrors = new Map(scanResults.map(result => [result, []]));
    // Watched tests done once (no repeat in the lookback window): shown in
    // yellow as information, not counted as errors.
    const repeatInfos = new Map(scanResults.map(result => [result, []]));
    const reportCutoff = scanReportCutoff();
    // One date range per visit for every group: the 3 months up to the visit's
    // latest watched test (Bộ mỡ or HbA1c), e.g. 06/08/2026 – 06/11/2026.
    const visitRangeEnd = new Map();
    for (const result of scanResults) {
      let end = null;
      for (const test of result.repeatTests || []) {
        const date = scanParseDay(test.day);
        if (date && date >= reportCutoff && (!end || date > end)) end = date;
      }
      if (end) visitRangeEnd.set(result, end);
    }
    for (const rule of SCAN_REPEAT_TEST_RULES) {
      const occurrences = [];
      for (const result of scanResults) {
        const byDay = new Map();
        for (const test of result.repeatTests || []) {
          if (test.module !== rule.module) continue;
          if (!byDay.has(test.day)) byDay.set(test.day, []);
          byDay.get(test.day).push(test);
        }
        for (const [day, tests] of byDay) {
          const date = scanParseDay(day);
          const time = tests.map(x => x.time).filter(Boolean).sort()[0] || "";
          if (date) occurrences.push({ result, day, date, time, tests });
        }
      }
      // One entry per visit and group, listing every test of the person in the
      // 3 months up to the visit's latest test, newest first:
      //   Xét nghiệm mỡ máu: Ghi nhận 3 lần xét nghiệm trong khoảng thời gian từ
      //   ngày 06/08/2026 đến 06/11/2026.
      //     06/11/2026 07:46:32: Triglycerid.
      //     04/11/2026 13:57:00: Cholesterol toàn phần, HDL-C, Triglycerid.
      // It is an error (red) when one of this visit's tests was done again
      // within 90 ± 3 days of an earlier one; otherwise information (yellow).
      const withTime = (day, time) => time ? `${day} ${time}` : day;
      const samePerson = (o, result) => o.result === result || (!!result.patientKey && o.result.patientKey === result.patientKey);
      for (const result of scanResults) {
        const own = occurrences.filter(o => o.result === result && o.date >= reportCutoff);
        if (!own.length) continue;
        const repeats = own.map(current => {
          const limit = scanRepeatWindowStart(current.date);
          const earlier = occurrences.filter(o => samePerson(o, result) && o.date < current.date && o.date >= limit)
            .sort((x, y) => y.date - x.date);
          return earlier.length ? { current, previous: earlier[0] } : null;
        }).filter(Boolean);
        const latest = own.reduce((x, y) => (y.date > x.date || (+y.date === +x.date && y.time > x.time)) ? y : x);
        const end = visitRangeEnd.get(result) || latest.date;
        const from = scanLookbackStart(end, SCAN_REPEAT_LOOKBACK_MONTHS);
        const listed = occurrences.filter(o => samePerson(o, result) && o.date >= from && o.date <= end)
          .sort((x, y) => (y.date - x.date) || String(y.time).localeCompare(String(x.time)));
        const dateFromVisit = listed.some(o => o.tests.some(t => t.dateFromVisit));
        const lines = listed.map(o => `${withTime(o.day, o.time)}: ${scanTestLabels(o.tests)}.` +
          (o.result !== result ? ` (${o.result.caseNo || o.result.label})` : "") +
          (o.tests.some(t => t.dateFromVisit) ? " (ngày vào viện, HIS không trả ngày y lệnh)" : ""));
        const detail = repeats.length
          ? repeats.map(r => `${withTime(r.current.day, r.current.time)} làm lại sau ${scanDaysBetween(r.previous.date, r.current.date)} ngày ` +
              `(chưa đủ 90 ± 3 ngày) so với ${withTime(r.previous.day, r.previous.time)}` +
              (r.previous.result !== result ? ` (${r.previous.result.caseNo || r.previous.result.label})` : "")).join("\n")
          : `Không có lần nào làm lại trong vòng ${SCAN_REPEAT_MIN_GAP_DAYS} ngày.`;
        const entry = {
          module: rule.module, date: latest.day, time: latest.time, dateFromVisit,
          item: "", detail: `${detail}\n${listed.map(o => `${o.day}: ${scanTestListText(o.tests)}`).join("\n")}`,
          title: `${rule.title}:`,
          message: `Ghi nhận ${listed.length} lần xét nghiệm trong khoảng thời gian từ ngày ${scanFormatDay(from)} đến ${scanFormatDay(end)}.`,
          lines
        };
        (repeats.length ? repeatErrors : repeatInfos).get(result).push(entry);
      }
    }
    for (const result of scanResults) {
      result.errors = [...(result.baseErrors || []), ...repeatErrors.get(result)].map(err =>
        err.date ? err : { ...err, date: result.visitDate || "", dateFromVisit: !!result.visitDate });
      result.infos = repeatInfos.get(result);
    }
  }

  // [PTTT]: the service-time rules of the timing panel (ghi điện cơ >= 30 phút,
  // thận nhân tạo >= 4 tiếng, hút đờm trong giờ thở máy, số lượng thở máy).
  // A row without start/end time is only reported by a rule that needs it.
  // Returns { errors, rows }: rows = every PTTT row (clean or not) for the
  // "PTTT" table of the scan results.
  function scanPtttFindings() {
    const errors = [];
    const rows = [];
    const ventilationRows = hthGetVentilationIntervals();
    for (const row of currentRows) {
      const seconds = elapsedSeconds(row.start, row.end);
      const actualText = seconds === null ? "chưa đủ giờ bắt đầu/kết thúc" : `thực tế ${formatDuration(seconds)}`;
      const rowErrors = [];
      if (isElectromyography(row) && seconds !== null && seconds < 30 * 60) {
        rowErrors.push(`Không đủ thời gian thực hiện: ghi điện cơ cần tối thiểu 30 phút (${actualText}).`);
      }
      if (/pt0043|thận nhân tạo thường quy/i.test(serviceText(row)) && (seconds === null || seconds < 4 * 60 * 60)) {
        rowErrors.push(`Không đủ thời gian thực hiện: thận nhân tạo cần tối thiểu 4 tiếng (${actualText}).`);
      }
      if (isSuction(row) && row.start && row.end && ventilationRows.length &&
          !ventilationRows.some(v => v !== row && containedIn(row.start, row.end, v.start, v.end))) {
        rowErrors.push("Hút đờm nằm ngoài khoảng giờ thở máy.");
      }
      if (isVentilation(row)) {
        const minutes = elapsed(row.start, row.end);
        const quantity = num(row.quantity);
        if (minutes !== null && quantity !== null) {
          const days = Math.floor(minutes / 1440);
          const hours = Math.floor((minutes % 1440) / 60);
          const converted = days === 0 ? Math.round((minutes / 60) * 100) / 100 : Math.round((days + hours / 10) * 100) / 100;
          if (Math.abs(converted - quantity) >= 0.01) rowErrors.push(`Thở máy: số lượng quy đổi ${converted} khác số lượng trên HIS ${quantity}.`);
        }
      }
      const source = [row.start, row.end].find(value => auditDateTime(value)) || "";
      const date = auditDateOnly(source);
      rows.push({ day: date || "", start: auditText(row.start), end: auditText(row.end), code: auditText(row.serviceCode),
        name: auditText(row.serviceName), quantity: auditText(row.quantity), bad: rowErrors.length > 0, note: rowErrors.join(" ") });
      if (!rowErrors.length) continue;
      const time = date ? (auditDateTimeText(source).split(" ")[1] || "") : "";
      const item = `${row.serviceCode || ""} ${row.serviceName || ""}`.trim();
      const detail = `Bắt đầu: ${row.start || "chưa có"} · Kết thúc: ${row.end || "chưa có"}`;
      for (const message of rowErrors) errors.push({ module: "PTTT", date, time, item, message, detail });
    }
    return { errors, rows };
  }

  // ---- ALBUMIN MÁU > 25 g/L ----
  // Every blood albumin result (Kết quả xét nghiệm, NT.024.2) above 25 g/L is
  // an error: "10/11/2026 10:26:00 [Albumin]: Định lượng Albumin [Máu] = 30.1 g/L (> 25 g/L)".
  const SCAN_ALBUMIN_MAX = 25;
  function scanIsBloodAlbumin(row) {
    if (auditText(row.code).toUpperCase() === "XN045") return true;
    const token = domToken(row.name);
    return token.includes("ALBUMIN") && token.includes("MAU") && !token.includes("MICRO");
  }
  function scanAlbuminFindings() {
    const errors = [];
    const key = auditState.contextKey;
    for (const row of auditState.labResults.values()) {
      if (key && row.contextKey && row.contextKey !== key) continue;
      if (!scanIsBloodAlbumin(row)) continue;
      const m = auditText(row.value).replace(/,/g, ".").match(/-?\d+(?:\.\d+)?/);
      const value = m ? Number(m[0]) : NaN;
      if (!Number.isFinite(value) || value <= SCAN_ALBUMIN_MAX) continue;
      const when = auditDateTimeText(row.resultTime || row.performedTime || "");
      const unit = auditText(row.unit) || "g/L";
      errors.push({
        module: "Albumin", date: auditDateOnly(when), time: when.split(" ")[1] || "", item: "",
        message: `${auditText(row.name) || "Albumin"} = ${auditText(row.value)} ${unit} (> ${SCAN_ALBUMIN_MAX} g/L)`,
        detail: `Trị số bình thường: ${auditText(row.normalRange) || "không rõ"}; thực hiện ${auditText(row.performedTime) || "không rõ"}; trả kết quả ${auditText(row.resultTime) || "không rõ"}.`
      });
    }
    // Results that could not be loaded: the albumin check did not run for them.
    for (const reason of auditState.labErrors) {
      errors.push({ module: "Hệ thống", item: "", message: `Không tải được kết quả xét nghiệm (kiểm tra Albumin): ${reason}` });
    }
    return errors;
  }

  // scanned: { xn, thuoc, pttt } = the "Kiểm tra" buttons when the scan started.
  // Only the rules of what was scanned are reported: Xét nghiệm -> CT,
  // Bộ mỡ, HbA1C, Albumin; Thuốc -> Thuốc, Thiếu chẩn đoán; PTTT -> PTTT.
  // The DVKT checks (outside the treatment period, contraindicated ICD, ...)
  // are not reported in QUÉT; they still show in the DVKT panel.
  function scanCollectFindings(info, scanned = { xn: true, thuoc: true, pttt: true }) {
    const errors = [];
    // The DVKT rule checks (renderDVKTPanel) are skipped: QUÉT only needs the
    // captured DVKT/XN rows themselves (Bộ mỡ, HbA1c, CT, the XN table).
    renderDrugPanel();
    if (scanned.thuoc) for (const cells of scanRowsWithClass(drugUI.body, "tr.hth-audit-drug-row-bad")) {
      errors.push({ module: "Thuốc", date: scanFirstDay(cells[3]), time: scanFirstTime(cells[3]), item: `${cells[0] || ""}${cells[3] ? ` (${cells[3]})` : ""}`, message: cells[cells.length - 1] || "" });
    }
    renderContrastPanel();
    if (scanned.xn) for (const cells of scanRowsWithClass(contrastUI.body, "tr.hth-audit-dvkt-row-bad, tr.hth-audit-drug-row-bad")) {
      errors.push({ module: "CT", date: scanFirstDay(cells[3], cells[4], cells[5]), time: scanFirstTime(cells[3], cells[4], cells[5]), item: `${cells[0] || ""} ${cells[1] || ""}`.trim(), message: cells[cells.length - 1] || "" });
    }
    // [Thiếu chẩn đoán]: a drug of drugDiagnosisRules (by mã thuốc) without a matching diagnosis.
    const drugTargets = scanned.thuoc ? auditDrugDiagnosisTargets() : [];
    if (drugTargets.length) {
      const caseIcd = auditMatchingIcdData();
      const admissionTime = auditText(caseIcd && caseIcd.admissionTime);
      const admissionDay = scanFirstDay(admissionTime) || (info && info.visitDate) || "";
      for (const { rule, rows } of drugTargets) {
        if (caseIcd && auditHasDiagnosis(caseIcd, rule.keywords)) continue;
        // One error per distinct drug name + order day.
        const seen = new Set();
        for (const row of rows) {
          const name = auditText(row.name) || rule.drug;
          const day = scanFirstDay(row.orderDate) || admissionDay;
          const key = `${domToken(name)}|${day}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const orderText = auditText(row.orderDate) || day || "chưa rõ ngày";
          // Shown: "10/09/2026 15:00:00 [Thiếu chẩn đoán]: Thuốc Kavasdin 5".
          // Order / admission times and the no-ICD case are kept for the hover.
          const detail = caseIcd
            ? `Y lệnh ${orderText}; vào viện ${admissionTime || admissionDay || "chưa rõ"}: thiếu chẩn đoán phù hợp.`
            : `Y lệnh ${orderText}: chưa đọc được chẩn đoán (NT.005.HSBA) nên không kiểm tra được.`;
          // No order date: the error falls on the admission day, so show its time.
          const time = scanFirstDay(row.orderDate) ? (auditDateTimeText(row.orderDate).split(" ")[1] || "")
            : (auditDateTimeText(admissionTime).split(" ")[1] || "");
          errors.push({ module: "Thiếu chẩn đoán", date: day, time, item: "", message: `Thuốc ${name}`, detail });
        }
      }
    }
    const pttt = scanned.pttt ? scanPtttFindings() : { errors: [], rows: [] };
    errors.push(...pttt.errors);
    if (scanned.xn) errors.push(...scanAlbuminFindings());
    const fallbackDay = (info && info.visitDate) || auditDateOnly(auditState.context && auditState.context.admissionDate || "");
    // Every XN/DVKT row captured for the visit, for the "Xét nghiệm / DVKT"
    // table (order day/time, else the first performed/result time). No row is
    // marked red: the DVKT checks are not part of QUÉT.
    const cutoff = scanSkipCutoff();
    const xnRows = scanned.xn ? Array.from(auditState.dvktRows.values())
      .map(row => {
        const source = rowOrderSource(row, Array.isArray(row.timePoints) ? row.timePoints : []);
        return { day: auditDateOnly(source), dateTime: auditDateTimeText(source),
          code: auditText(row.bhytCode || row.hisCode || row.serviceCode), name: auditText(row.name),
          quantity: auditText(row.quantity), status: "", bad: false };
      })
      .filter(row => !scanIsTooOld(row.day, cutoff)) : [];
    // Every PTTT row (clean or not), for the "PTTT" table.
    const ptttRows = pttt.rows.filter(row => !scanIsTooOld(row.day, cutoff));
    // Rows dated more than SCAN_SKIP_OLDER_MONTHS ago are skipped, their errors too.
    const xnModules = new Set(["DVKT", "CT", "PTTT", "Albumin"]);
    return {
      errors: errors.filter(err => !(xnModules.has(err.module) && scanIsTooOld(err.date, cutoff))),
      xnRows,
      ptttRows,
      repeatTests: scanned.xn ? scanCollectRepeatTests(fallbackDay) : [],
      counts: { dvkt: auditState.dvktRows.size, drug: auditState.medicineRows.size, services: currentRows.length }
    };
  }

  function scanRenderResults() {
    scanResultsEl.replaceChildren();
    if (scanLookup) scanResultsEl.appendChild(scanLookupBox(scanLookup));
    const onlyErrors = scanFilter.checked;
    for (const result of scanResults) {
      const visibleErrors = scanVisibleErrors(result);
      const hasError = visibleErrors.length > 0;
      const noData = !result.counts.dvkt && !result.counts.drug && !result.counts.services;
      const infos = Array.isArray(result.infos) ? result.infos : [];
      // Every scanned patient stays listed; "Chỉ hiện lỗi" only hides clean XN rows.
      const box = auditElement("div", `sc-patient${hasError ? " sc-has-error" : ""}`);
      const head = auditElement("div", "sc-phead");
      head.appendChild(auditElement("span", "sc-pname", `${result.index + 1}. ${result.label}`));
      const right = auditElement("span", "sc-head-actions");
      right.appendChild(auditElement("span",
        `sc-badge ${hasError ? "sc-badge-bad" : (noData ? "sc-badge-none" : "sc-badge-good")}`,
        hasError ? `${visibleErrors.length} lỗi` : (noData ? "Không có dữ liệu" : "Không lỗi")));
      const selectBtn = auditElement("button", "", "Chọn ca"); selectBtn.type = "button";
      selectBtn.dataset.scanSelect = String(result.index);
      right.appendChild(selectBtn);
      head.appendChild(right); box.appendChild(head);
      if (hasError || infos.length) {
        const list = auditElement("ul", "sc-errors");
        for (const err of [...visibleErrors, ...infos.map(info => ({ ...info, isInfo: true }))]) {
          const li = document.createElement("li");
          if (err.isInfo) li.className = "sc-info";
          if (err.detail) li.title = err.detail;
          if (err.lines) {
            // Bộ mỡ / HbA1c: title + count line, then one line per test day.
            li.append(auditElement("b", "", `${err.title} `), document.createTextNode(err.message));
            const sub = auditElement("ul", "sc-repeat-lines");
            for (const line of err.lines) sub.appendChild(auditElement("li", "", line));
            li.appendChild(sub);
            list.appendChild(li);
            continue;
          }
          if (err.headline) {
            // Bộ mỡ / HbA1C: "2 LẦN XÉT NGHIỆM MỠ MÁU - 05/11/2026 08:15:00: ..."
            const when = err.date ? `${err.date}${err.time ? " " + err.time : ""}` : "--/--/----";
            const head = auditElement("b", "", `${err.headline} - ${when}: `);
            if (err.dateFromVisit) head.title = "Ngày vào viện của ca (không có ngày y lệnh riêng)";
            li.append(head, document.createTextNode(err.message));
            list.appendChild(li);
            continue;
          }
          const dateEl = auditElement("b", "", `${err.date || "--/--/----"}${err.date && err.time ? " " + err.time : ""} `);
          if (err.dateFromVisit) dateEl.title = "Ngày vào viện của ca (không có ngày y lệnh riêng)";
          else if (!err.date) dateEl.title = "Không xác định được ngày";
          li.append(dateEl, auditElement("b", "", err.item ? `[${err.module}] ` : `[${err.module}]: `), document.createTextNode(`${err.item ? err.item + ": " : ""}${err.message}`));
          list.appendChild(li);
        }
        box.appendChild(list);
      }
      // Every scanned XN/DVKT row, with or without error.
      const xnRows = Array.isArray(result.xnRows) ? result.xnRows : [];
      if (xnRows.length && (!onlyErrors || xnRows.some(r => r.bad))) {
        const badCount = xnRows.filter(r => r.bad).length;
        const details = document.createElement("details");
        if (badCount) details.open = true;
        details.appendChild(auditElement("summary", "", `Xét nghiệm / DVKT (${xnRows.length})${badCount ? ` · ${badCount} dòng lỗi` : " · không lỗi"}`));
        const table = document.createElement("table");
        const thead = document.createElement("tr");
        for (const h of ["Ngày giờ", "Mã", "Tên", "SL"]) thead.appendChild(auditElement("th", "", h));
        table.appendChild(thead);
        for (const r of xnRows) {
          if (onlyErrors && !r.bad) continue;
          const tr = document.createElement("tr");
          tr.appendChild(auditElement("td", "", r.dateTime || r.day || "--/--/----"));
          tr.appendChild(auditElement("td", r.bad ? "sc-bad" : "", r.code));
          tr.appendChild(auditElement("td", r.bad ? "sc-bad" : "", r.name));
          tr.appendChild(auditElement("td", "", r.quantity));
          table.appendChild(tr);
        }
        details.appendChild(table); box.appendChild(details);
      }
      // Every scanned PTTT row, with or without error (hover a red row for why).
      const ptttRows = Array.isArray(result.ptttRows) ? result.ptttRows : [];
      if (ptttRows.length && (!onlyErrors || ptttRows.some(r => r.bad))) {
        const badCount = ptttRows.filter(r => r.bad).length;
        const details = document.createElement("details");
        if (badCount) details.open = true;
        details.appendChild(auditElement("summary", "", `PTTT (${ptttRows.length})${badCount ? ` · ${badCount} dòng lỗi` : " · không lỗi"}`));
        const table = document.createElement("table");
        const thead = document.createElement("tr");
        for (const h of ["Bắt đầu", "Kết thúc", "Mã", "Tên", "SL"]) thead.appendChild(auditElement("th", "", h));
        table.appendChild(thead);
        for (const r of ptttRows) {
          if (onlyErrors && !r.bad) continue;
          const tr = document.createElement("tr");
          if (r.note) tr.title = r.note;
          tr.appendChild(auditElement("td", "", r.start || "--"));
          tr.appendChild(auditElement("td", "", r.end || "--"));
          tr.appendChild(auditElement("td", r.bad ? "sc-bad" : "", r.code));
          tr.appendChild(auditElement("td", r.bad ? "sc-bad" : "", r.name));
          tr.appendChild(auditElement("td", "", r.quantity));
          table.appendChild(tr);
        }
        details.appendChild(table); box.appendChild(details);
      }
      if (result.counts.dvkt || result.counts.drug) {
        box.appendChild(auditElement("div", "hth-audit-muted", `  DVKT ${result.counts.dvkt} · Thuốc ${result.counts.drug}`));
      }
      scanResultsEl.appendChild(box);
    }
    if (!scanResultsEl.querySelector(".sc-patient") && scanResults.length) {
      scanResultsEl.appendChild(auditElement("div", "hth-empty", "Không có ca nào có lỗi."));
    }
  }

  // ---- QUÉT THEO BHYT ----
  // Mã BHYT changes every year, Mã BA changes every visit and several people
  // share a name + birth year, so one person's visits are found the way it is
  // done by hand: (1) search HIS by Mã BHYT -> name, birth year, address;
  // (2) search again by name + birth year -> every visit of everyone with them;
  // (3) keep only the visits with the same address, and scan those.
  const SCAN_SEARCH_FIELDS = ["txtMABENHNHAN", "txtMA_LK", "txtMABENHAN", "txtMA_BHYT", "txtTENBENHNHAN", "txtSDT", "txtCCCD", "txtNGAYSINH"];
  const SCAN_SEARCH_ROWS = 500;
  // Loose compare: no accents, case, spaces or punctuation ("Ấp 3, Xã X" = "ap 3 xa x").
  function scanLooseText(value) {
    return String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[đĐ]/g, "d")
      .toLowerCase().replace(/[^a-z0-9]/g, "");
  }
  function scanGridSignature() {
    const grid = document.getElementById("grdLS");
    if (!grid) return "";
    return Array.from(grid.querySelectorAll("tr.jqgrow")).map(r => `${r.id}:${(r.textContent || "").length}`).join(",");
  }
  function scanGridLoading() {
    const el = document.getElementById("load_grdLS");
    return !!el && getComputedStyle(el).display !== "none";
  }
  // Wait for #grdLS to reload after a search: done when the jqGrid loading box
  // appeared and went away, or the rows changed. If neither happens within
  // 4 s, the search returned the same rows as before.
  async function scanWaitGridReload(before) {
    const t0 = Date.now();
    let sawLoading = false;
    while (Date.now() - t0 < 20000) {
      if (scanStopRequested) return false;
      await scanSleep(150);
      if (scanGridLoading()) { sawLoading = true; continue; }
      if (sawLoading || scanGridSignature() !== before) { await scanSleep(400); return !scanGridLoading(); }
      if (Date.now() - t0 > 4000) return true;
    }
    return false;
  }
  // Fill the HIS search form (the other boxes are emptied), press "Tìm kiếm"
  // and return the rows of #grdLS. missing = rows found but not on this page.
  async function scanHisSearch(values) {
    const button = document.getElementById("btnTIMKIEM");
    if (!button) throw new Error("Không thấy nút Tìm kiếm (btnTIMKIEM). Hãy mở màn hình danh sách bệnh nhân.");
    for (const id of SCAN_SEARCH_FIELDS) {
      const el = document.getElementById(id);
      if (!el) { if (values[id]) throw new Error(`Không thấy ô tìm kiếm ${id}.`); continue; }
      el.value = values[id] || "";
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
    // All visits on one page: QUÉT only clicks rows of the current page.
    await scanMainCall({ action: "gridSetRowNum", rowNum: SCAN_SEARCH_ROWS });
    const before = scanGridSignature();
    button.click();
    if (!await scanWaitGridReload(before)) throw new Error(scanStopRequested ? "Đã dừng." : "HIS không trả kết quả tìm kiếm (quá 20 giây).");
    // HIS may keep its own page size: reload with a bigger one when rows are missing.
    let info = await scanMainCall({ action: "gridInfo" });
    if (info.ok && info.records > info.reccount) {
      const sig = scanGridSignature();
      await scanMainCall({ action: "gridSetRowNum", rowNum: Math.max(SCAN_SEARCH_ROWS, info.records), reload: true });
      await scanWaitGridReload(sig);
      info = await scanMainCall({ action: "gridInfo" });
    }
    const rows = scanPatientRows();
    return { rows, missing: info.ok && info.records > rows.length ? info.records - rows.length : 0 };
  }
  function scanLookupBox(l) {
    const box = auditElement("div", "sc-lookup");
    box.appendChild(auditElement("div", "", `Theo BHYT ${l.code}: ${l.name} · năm sinh ${l.birthYear}`));
    box.appendChild(auditElement("div", "", `Địa chỉ: ${l.addresses.join(" | ")}`));
    if (l.found !== undefined) {
      box.appendChild(auditElement("div", "", `Tìm theo họ tên + năm sinh: ${l.found} lần vào viện · cùng địa chỉ: ${l.matched}` +
        (l.missing ? ` · ${l.missing} dòng không hiện trên trang nên chưa quét` : "")));
    }
    if (l.excluded && l.excluded.length) {
      // Collapsed by default: the list can be long (click to expand).
      const details = document.createElement("details");
      details.appendChild(auditElement("summary", "", `Bỏ qua ${l.excluded.length} lần vào viện cùng họ tên, năm sinh nhưng khác địa chỉ`));
      const ul = document.createElement("ul");
      for (const x of l.excluded) ul.appendChild(auditElement("li", "", `${x.caseNo || "?"}${x.visitDate ? ` (${x.visitDate})` : ""}: ${x.address || "không có địa chỉ"}`));
      details.appendChild(ul);
      box.appendChild(details);
    }
    return box;
  }
  async function scanByBhyt(input) {
    if (scanRunning) return;
    const raw = String(input || "").replace(/\s+/g, "").toUpperCase();
    // HIS finds the patient only with the full card number (e.g.
    // LH292094139001574); the last 10 characters are kept to match rows and as
    // a fallback search when the full number returns nothing.
    const code = raw.slice(-10);
    if (code.length < 10) { scanStatus.textContent = "Nhập Mã thẻ BHYT (ít nhất 10 ký tự cuối)."; return; }
    scanStore("hthScanBhyt", raw);
    scanRunning = true; scanStopRequested = false;
    scanStartBtn.disabled = true; scanBhytBtn.disabled = true; scanStopBtn.disabled = false;
    scanResults = []; scanSummaryPrefix = ""; scanLookup = null; scanRenderResults();
    let lookup = null;
    let toScan = [];
    try {
      if (scanAnyDataTab()) {
        const listTab = scanFindHisTab(SCAN_LIST_TAB);
        if (listTab) { scanClickHisTab(listTab); await scanSleep(300); }
      }
      // (1) Mã BHYT -> name, birth year, address.
      scanStatus.textContent = `Bước 1/3: tìm theo Mã BHYT ${raw}…`;
      let first = await scanHisSearch({ txtMA_BHYT: raw });
      let cardRows = first.rows.filter(r => !r.bhyt || r.bhyt.toUpperCase().endsWith(code));
      if (!cardRows.length && raw !== code) {
        scanStatus.textContent = `Bước 1/3: tìm theo Mã BHYT ${code} (10 ký tự cuối)…`;
        first = await scanHisSearch({ txtMA_BHYT: code });
        cardRows = first.rows.filter(r => !r.bhyt || r.bhyt.toUpperCase().endsWith(code));
      }
      if (!cardRows.length) throw new Error(`Không tìm thấy bệnh nhân có Mã BHYT ${raw}.`);
      // The most recent visit gives the name and birth year searched in step 2.
      const latest = [...cardRows].sort((a, b) => (scanParseDay(b.visitDate) || 0) - (scanParseDay(a.visitDate) || 0))[0];
      const name = latest.name;
      const birthYear = latest.birthYear;
      if (!name || !birthYear) throw new Error("Không đọc được họ tên / năm sinh trong kết quả tìm theo BHYT.");
      // Every address seen with this card (all the same person).
      const addresses = new Map();
      for (const r of cardRows) if (scanLooseText(r.address)) addresses.set(scanLooseText(r.address), r.address);
      if (!addresses.size) throw new Error("Không đọc được địa chỉ (cột DIACHI) trong kết quả tìm theo BHYT.");
      lookup = { code: raw, name, birthYear, addresses: [...addresses.values()] };
      // (2) name + birth year -> everyone with them.
      scanStatus.textContent = `Bước 2/3: tìm theo họ tên ${name} + năm sinh ${birthYear}…`;
      const second = await scanHisSearch({ txtTENBENHNHAN: name, txtNGAYSINH: birthYear });
      // (3) keep the same name, birth year and address only.
      scanStatus.textContent = "Bước 3/3: lọc theo địa chỉ…";
      const nameKey = scanLooseText(name);
      const sameName = second.rows.filter(r => scanLooseText(r.name) === nameKey && r.birthYear === birthYear);
      toScan = sameName.filter(r => addresses.has(scanLooseText(r.address)));
      Object.assign(lookup, { found: sameName.length, matched: toScan.length, missing: second.missing,
        excluded: sameName.filter(r => !addresses.has(scanLooseText(r.address)))
          .map(r => ({ caseNo: r.caseNo, visitDate: r.visitDate, address: r.address })) });
      if (!toScan.length) throw new Error("Không có lần vào viện nào cùng họ tên, năm sinh và địa chỉ.");
    } catch (err) {
      scanStatus.textContent = String(err && err.message || err);
      toScan = [];
    }
    scanRunning = false;
    scanStartBtn.disabled = false; scanBhytBtn.disabled = false; scanStopBtn.disabled = true;
    if (!toScan.length) { scanLookup = lookup; scanRenderResults(); return; }
    // One person: every visit shares one identity for the Bộ mỡ / HbA1C rules.
    await scanAllPatients({ patients: toScan, personKey: `BHYT-PERSON:${code}`, lookup });
  }

  // options (QUÉT theo BHYT): patients = the rows to scan (ignores "Quét bệnh
  // nhân"), personKey = one identity for all of them (repeat-test rules),
  // lookup = the note shown above the results.
  async function scanAllPatients(options = {}) {
    if (scanRunning) return;
    scanLookup = options.lookup || null;
    const allPatients = options.patients || scanPatientRows();
    if (!allPatients.length) {
      scanStatus.textContent = "Không tìm thấy danh sách bệnh nhân (lưới #grdLS). Hãy mở màn hình danh sách bệnh nhân rồi thử lại.";
      return;
    }
    // "Chỉ quét bệnh nhân đã chọn": rows ticked (multiselect) or highlighted in the list.
    const inScope = options.patients ? allPatients
      : (scanScope() === "selected" ? allPatients.filter(p => scanIsRowSelected(p.row)) : allPatients);
    if (!inScope.length) {
      scanStatus.textContent = "Chưa chọn bệnh nhân nào trong danh sách HIS. Hãy chọn (hoặc tích) bệnh nhân cần quét, hoặc chuyển sang \"Tất cả\".";
      return;
    }
    // Patients admitted more than SCAN_SKIP_OLDER_MONTHS ago are not scanned.
    const skipCutoff = scanSkipCutoff();
    const patients = inScope.filter(p => !scanIsTooOld(p.visitDate, skipCutoff))
      .map((p, i) => ({ ...p, index: i, patientKey: options.personKey || p.patientKey }));
    const skippedOld = inScope.length - patients.length;
    const skippedText = skippedOld ? ` · bỏ qua ${skippedOld} ca vào viện trước ${scanFormatDay(skipCutoff)}` : "";
    if (!patients.length) {
      scanStatus.textContent = `Không có ca nào để quét${skippedText}.`;
      scanResults = []; scanRenderResults();
      return;
    }
    scanRunning = true; scanStopRequested = false; scanResults = []; scanSummaryPrefix = "";
    const scanned = { xn: scanTabXn.checked, thuoc: scanTabThuoc.checked, pttt: scanTabPttt.checked };
    // While scanning, also open phiếu lists whose tab is not on screen.
    scanMainCall({ action: "setScanMode", value: true, kinds: { dvkt: scanTabXn.checked || scanTabThuoc.checked || scanTabPttt.checked, drug: scanTabThuoc.checked, lab: scanTabXn.checked } });
    scanStartBtn.disabled = true; scanBhytBtn.disabled = true; scanStopBtn.disabled = false;
    scanRenderResults();
    const grid = document.getElementById("grdLS");
    const originalRow = grid && grid.querySelector("tr.jqgrow.ui-state-highlight, tr.jqgrow[aria-selected='true']");
    const originalInfo = originalRow ? scanRowInfo(originalRow, -1) : null;
    try {
      for (const info of patients) {
        if (scanStopRequested) break;
        const row = scanResolveRow(info);
        if (!row) continue;
        scanStatus.textContent = `Đang quét ${info.index + 1}/${patients.length}: ${info.label}`;
        const alreadySelected = row.classList.contains("ui-state-highlight") || row.getAttribute("aria-selected") === "true";
        const previousKey = scanHisKey();
        scanLastDataAt = 0;
        scanVisitLists = [];
        // Start each visit from empty data so nothing from the previous visit is
        // reported under this one. Keep it only when this visit is already open
        // and its data was collected for it (HIS may not reload it on re-click).
        const keepLoaded = alreadySelected && info.caseNo && currentVisibleEncounter === info.caseNo;
        if (!keepLoaded) {
          clearStoredRows();
          clearAuditData();
          currentVisibleSelection = "";
        }
        scanForcedEncounter = info.caseNo || "";
        if (info.caseNo) { currentVisibleEncounter = info.caseNo; currentCase = info.caseNo; }
        scanVisitTabs = [];
        // New visit: its phiếu lists may be opened again (once each).
        await scanMainCall({ action: "scanVisitStart" });
        // The patient list lives on the "Danh sách" tab; go back to it before
        // selecting the next patient (the previous one ended on the Thuốc tab).
        if (scanAnyDataTab()) {
          const listTab = scanFindHisTab(SCAN_LIST_TAB);
          if (listTab) { scanClickHisTab(listTab); await scanSleep(300); }
        }
        const selection = await scanSelectPatient(scanResolveRow(info) || row, info, previousKey, alreadySelected);
        if (scanStopRequested) break;
        let findings;
        if (!selection.switched) {
          findings = { errors: [{ module: "Hệ thống", item: "", message: `Không mở được ca: ${selection.error || "không rõ lý do"}` }], counts: { dvkt: 0, drug: 0, services: 0 } };
        } else {
          // HIS may not reload a visit that was already selected, so its phiếu
          // lists would never arrive and never be opened. Open the lists HIS
          // already sent for it (selecting by hand no longer auto-opens them).
          if (alreadySelected) {
            await scanMainCall({ action: "walkPhieu" });
            scanLastDataAt = Date.now();
          }
          await scanWaitForPatient();
          // HIS loads the Xét nghiệm / Thuốc phiếu lists only when their tab is
          // opened: open each tab so its phiếu are walked too.
          if (scanAnyDataTab()) await scanOpenDataTabs(info, patients.length);
          if (scanStopRequested) break;
          // NT.005.HSBA can arrive after the phiếu lists; wait up to 3 s for it
          // when the case has a drug that needs a diagnosis check.
          for (let waited = 0; auditDrugDiagnosisTargets().length && !auditMatchingIcdData() && waited < 3000 && !scanStopRequested; waited += 200) await scanSleep(200);
          if (scanStopRequested) break;
          try { findings = scanCollectFindings(info, scanned); }
          catch (err) { findings = { errors: [{ module: "Hệ thống", item: "", message: `Không kiểm tra được: ${err && err.message || err}` }], counts: { dvkt: 0, drug: 0, services: 0 } }; }
        }
        scanResults.push({ index: info.index, label: info.label, caseNo: info.caseNo, rowId: info.rowId, row: info.row,
          patientKey: info.patientKey, visitDate: info.visitDate, scanned, lists: scanVisitLists.slice(), tabs: scanVisitTabs.slice(), ...findings,
          baseErrors: findings.errors, repeatTests: findings.repeatTests || [] });
        scanApplyRepeatTestRules();
        scanRenderResults();
      }
    } finally {
      scanSummaryPrefix = `${scanStopRequested ? "Đã dừng" : "Hoàn tất"}: ${scanResults.length}/${patients.length} ca đã quét${skippedText}`;
      scanUpdateSummary();
      scanRunning = false;
      scanForcedEncounter = "";
      scanMainCall({ action: "setScanMode", value: false });
      scanStartBtn.disabled = false; scanBhytBtn.disabled = false; scanStopBtn.disabled = true;
      // Back to the patient list, then to the patient selected before the scan.
      if (scanAnyDataTab()) {
        const listTab = scanFindHisTab(SCAN_LIST_TAB);
        if (listTab) scanClickHisTab(listTab);
      }
      if (!scanStopRequested && originalInfo) {
        const back = scanResolveRow(originalInfo);
        if (back) scanClickRow(back);
      }
    }
  }

  scanButton.addEventListener("click", () => {
    scanPanel.style.display = scanPanel.style.display === "none" || !scanPanel.style.display ? "block" : "none";
  });
  scanFilter.checked = hthOnlyErrors;
  scanFilter.addEventListener("change", () => hthSetOnlyErrors(scanFilter.checked));
  scanPanel.addEventListener("click", event => {
    const select = event.target.closest("button[data-scan-select]");
    if (select) {
      const result = scanResults.find(r => String(r.index) === select.dataset.scanSelect);
      const row = result && !scanRunning ? scanResolveRow(result) : null;
      if (row) {
        scanSelectPatient(row, result, scanHisKey(), false).then(sel => {
          if (!sel.switched) showJumpToast(`Không mở được ca: ${sel.error || ""}`, true);
        });
      } else if (!scanRunning) showJumpToast("Không tìm thấy dòng bệnh nhân này trong danh sách HIS.", true);
      return;
    }
    const button = event.target.closest("button[data-scan-act]");
    if (!button) return;
    const act = button.dataset.scanAct;
    if (act === "start") scanAllPatients();
    else if (act === "bhyt") scanByBhyt(scanBhytInput.value);
    else if (act === "stop") { scanStopRequested = true; scanStatus.textContent = "Đang dừng..."; }
    else if (act === "close") scanPanel.style.display = "none";
  });
})();
