(() => {
  // Additive MAIN-world capture for the current encounter's diagnosis payload.
  // This file only observes the existing NT.005.HSBA request; it does not issue
  // additional HIS requests or modify the original request/response.
  // Own guard: the older "Kiểm tra hồ sơ bệnh án điện tử" extension sets
  // __hthIcdCaptureV1 in the same page, which used to skip this whole file
  // (and with it the NT.005 / TKNOICD lookup) when both were installed.
  if (window.__scanIcdCaptureV1) return;
  window.__scanIcdCaptureV1 = true;

  const TARGET_SP = "NT.005.HSBA";
  const MARKER = "__scanIcdMsgV1";
  const normalize = value => String(value ?? "").trim().toUpperCase();

  function parseJson(value) {
    if (value && typeof value === "object") return value;
    if (typeof value !== "string") return null;
    const text = value.trim();
    if (!text || (text[0] !== "{" && text[0] !== "[")) return null;
    try { return JSON.parse(text); } catch (_) { return null; }
  }

  function rpcFromCandidate(candidate) {
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      if (candidate.func && Array.isArray(candidate.params)) return candidate;
      for (const key of ["postData", "data", "request", "payload"]) {
        const nested = parseJson(candidate[key]);
        if (nested && nested.func && Array.isArray(nested.params)) return nested;
      }
    }
    const parsed = parseJson(candidate);
    if (parsed && parsed.func && Array.isArray(parsed.params)) return parsed;
    return null;
  }

  function readRpcCall(url, body) {
    try {
      const parsedUrl = new URL(String(url || ""), location.href);
      const postData = parsedUrl.searchParams.get("postData");
      const rpc = rpcFromCandidate(postData);
      if (rpc) return rpc;
    } catch (_) {}

    if (typeof body === "string") {
      const bodyText = body.trim();
      const direct = rpcFromCandidate(bodyText);
      if (direct) return direct;
      try {
        const params = new URLSearchParams(bodyText);
        const postData = params.get("postData");
        const fromForm = rpcFromCandidate(postData);
        if (fromForm) return fromForm;
      } catch (_) {}
    } else if (body && typeof FormData !== "undefined" && body instanceof FormData) {
      const formRpc = rpcFromCandidate(body.get("postData"));
      if (formRpc) return formRpc;
    }
    return null;
  }

  // NT.005 (params [id, 0]) is the record whose TKNOICD is the HIS "Nơi KCBBĐ".
  // HIS does not call it during QUÉT, so content.js asks for it per case
  // ("TKNOICD_ASK" with the case number and the open case's ids). It is sent with
  // the token of the latest ajaxCALL_SP_O request HIS made, once per id, and only
  // a reply whose MAHOSOBENHAN is that case is accepted.
  const TKNOICD_SP = "NT.005";
  let spTemplate = null;
  function rememberSpTemplate(rpc, url, method, body, headers) {
    if (!rpc || normalize(rpc.func) !== "AJAXCALL_SP_O" || typeof body !== "string") return;
    spTemplate = { url, method: method || "POST", body, headers: Array.isArray(headers) ? headers.slice() : [] };
  }
  function getTkNoiCdId(rpc) {
    if (!rpc || normalize(rpc.func) !== "AJAXCALL_SP_O") return "";
    const params = Array.isArray(rpc.params) ? rpc.params : [];
    if (normalize(params[0]) !== TKNOICD_SP) return "";
    return String(params[1] ?? "").trim();
  }
  function readTkNoiCd(responseText) {
    const root = parseJson(responseText);
    const out = [];
    if (!root) return out;
    const seen = new Set();
    const visit = (node, depth = 0) => {
      if (node == null || depth > 9) return;
      if (typeof node === "string") { const nested = parseJson(node); if (nested) visit(nested, depth + 1); return; }
      if (typeof node !== "object" || seen.has(node)) return;
      seen.add(node);
      if (Array.isArray(node)) { for (const item of node) visit(item, depth + 1); return; }
      // Records of a case with TKNOICD empty are kept too ("" = HIS has no value).
      const tkNoiCd = pickField(node, "TKNOICD"), caseNo = pickField(node, "MAHOSOBENHAN");
      if (caseNo) out.push({ caseNo, tkNoiCd });
      for (const key of Object.keys(node)) {
        const value = node[key];
        if (value && typeof value === "object") visit(value, depth + 1);
        else if (typeof value === "string" && ["RESULT", "DATA", "OUT_VAR"].includes(normalize(key))) visit(value, depth + 1);
      }
    };
    visit(root);
    return out;
  }
  function publishTkNoiCd(responseText) {
    for (const { caseNo, tkNoiCd } of readTkNoiCd(responseText)) {
      if (!tkNoiCd) continue;
      window.postMessage({ [MARKER]: true, type: "TKNOICD", caseNo, tkNoiCd }, "*");
    }
  }
  // Same encoding as the template (JSON body, form postData or URL postData),
  // with params switched to ["NT.005", id, 0].
  function rewriteForTkNoiCd(text, id) {
    const rpc = parseJson(text);
    if (!rpc || !rpc.func || !Array.isArray(rpc.params)) return "";
    return JSON.stringify({ ...rpc, func: "ajaxCALL_SP_O", params: [TKNOICD_SP, String(id), 0] });
  }
  function buildTkNoiCdRequest(template, id) {
    let url = template.url, body = template.body, rewritten = false;
    try {
      const u = new URL(url, location.href);
      const postData = u.searchParams.get("postData");
      const next = postData !== null ? rewriteForTkNoiCd(postData, id) : "";
      if (next) { u.searchParams.set("postData", next); url = u.toString(); rewritten = true; }
    } catch (_) {}
    if (typeof body === "string" && body) {
      const direct = rewriteForTkNoiCd(body, id);
      if (direct) { body = direct; rewritten = true; }
      else {
        try {
          const form = new URLSearchParams(body);
          const next = form.get("postData") !== null ? rewriteForTkNoiCd(form.get("postData"), id) : "";
          if (next) { form.set("postData", next); body = form.toString(); rewritten = true; }
        } catch (_) {}
      }
    }
    return rewritten ? { url, method: template.method || "POST", body, headers: template.headers || [] } : null;
  }
  function sendTkNoiCdRequest(id) {
    return new Promise(resolve => {
      const req = spTemplate && buildTkNoiCdRequest(spTemplate, id);
      if (!req) return resolve({ ok: false, error: "chưa thấy yêu cầu ajaxCALL_SP_O nào của HIS để lấy token" });
      try {
        const xhr = new XMLHttpRequest();
        xhr.__hthTkNoiCdOwn = true;
        xhrOpen.call(xhr, req.method, req.url, true);
        for (const [name, value] of req.headers) { try { xhrSetRequestHeader.call(xhr, name, value); } catch (_) {} }
        xhr.timeout = 15000;
        xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300 ? { ok: true, text: xhr.responseText } : { ok: false, error: `HTTP ${xhr.status}` });
        xhr.onerror = () => resolve({ ok: false, error: "lỗi mạng" });
        xhr.ontimeout = () => resolve({ ok: false, error: "quá 15 giây" });
        xhrSend.call(xhr, /^GET$/i.test(req.method) ? null : req.body);
      } catch (err) { resolve({ ok: false, error: String(err && err.message || err) }); }
    });
  }
  const caseKeyOf = value => String(value ?? "").replace(/\s+/g, "").toUpperCase();
  window.addEventListener("message", async event => {
    const data = event.data;
    if (!data || data.__hthTkNoiCdAsk !== true) return;
    const wanted = caseKeyOf(data.caseNo);
    const ids = [...new Set((Array.isArray(data.ids) ? data.ids : []).map(id => String(id ?? "").trim()).filter(id => /^\d+$/.test(id)))];
    const tried = [];
    let lastError = "";
    for (const id of ids) {
      const res = await sendTkNoiCdRequest(id);
      if (!res.ok) { lastError = res.error; tried.push(`${id}: ${res.error}`); if (!spTemplate) break; continue; }
      const found = readTkNoiCd(res.text);
      const hits = found.filter(item => caseKeyOf(item.caseNo) === wanted);
      const hit = hits.find(item => item.tkNoiCd);
      if (hit) {
        window.postMessage({ [MARKER]: true, type: "TKNOICD", caseNo: hit.caseNo, tkNoiCd: hit.tkNoiCd }, "*");
        return;
      }
      // NT.005 answered for this case but its TKNOICD is empty: HIS has no value.
      if (hits.length) {
        window.postMessage({ [MARKER]: true, type: "TKNOICD_EMPTY", caseNo: data.caseNo }, "*");
        return;
      }
      tried.push(`${id}: ${found.length ? "trả về ca " + found.map(item => item.caseNo).join(", ") : "không có TKNOICD"}`);
    }
    window.postMessage({ [MARKER]: true, type: "TKNOICD_MISS", caseNo: data.caseNo,
      reason: ids.length ? tried.join("; ") || lastError : "không có id của ca đang mở" }, "*");
  });

  function getTargetHoSoId(rpc) {
    if (!rpc || normalize(rpc.func) !== "AJAXCALL_SP_O") return "";
    const params = Array.isArray(rpc.params) ? rpc.params : [];
    if (normalize(params[0]) !== TARGET_SP) return "";
    return String(params[1] ?? "").trim();
  }

  function parseSecondaryDiagnoses(value) {
    const text = String(value ?? "").trim();
    if (!text) return [];
    return text.split(/[;\n]/).map(part => part.trim()).filter(Boolean).map(part => {
      // "K21.0-Name", "K21.0 - Name", "K21.0 – Name", "(K21.0) Name", "K21.0: Name".
      const match = part.match(/^\(?\s*([A-Z]\d{2}(?:\.\d{1,2})?[*+]?)\s*\)?\s*[-–—:]?\s*(.*)$/i);
      if (match) return { code: match[1].toUpperCase(), name: match[2].trim(), source: "BENHPHU" };
      const separator = part.indexOf("-");
      const code = (separator >= 0 ? part.slice(0, separator) : part).trim().toUpperCase();
      const name = separator >= 0 ? part.slice(separator + 1).trim() : part;
      return code ? { code, name, source: "BENHPHU" } : null;
    }).filter(Boolean);
  }

  function findDiagnosisRecords(root) {
    const found = [];
    const seen = new Set();
    const visit = (node, depth = 0) => {
      if (node == null || depth > 9) return;
      if (typeof node === "string") {
        const nested = parseJson(node);
        if (nested) visit(nested, depth + 1);
        return;
      }
      if (typeof node !== "object" || seen.has(node)) return;
      seen.add(node);
      if (Array.isArray(node)) {
        for (const item of node) visit(item, depth + 1);
        return;
      }
      const keys = Object.keys(node);
      const normalizedKeys = new Set(keys.map(normalize));
      if (normalizedKeys.has("BENHCHINHCODE") || normalizedKeys.has("BENHPHU")) found.push(node);
      for (const key of keys) {
        const value = node[key];
        if (value && typeof value === "object") visit(value, depth + 1);
        else if (typeof value === "string" && ["RESULT", "DATA", "OUT_VAR"].includes(normalize(key))) visit(value, depth + 1);
      }
    };
    visit(root);
    return found;
  }

  function pickField(record, wanted) {
    if (!record || typeof record !== "object") return "";
    for (const key of Object.keys(record)) {
      if (normalize(key) === wanted && record[key] != null) return String(record[key]).trim();
    }
    return "";
  }

  function buildIcdPayload(responseText, hoSoBenhAnId) {
    const root = parseJson(responseText);
    if (!root) return null;
    const records = findDiagnosisRecords(root);
    if (!records.length) return null;

    const diagnoses = [];
    let mainCode = "";
    let mainName = "";
    let admissionTime = "";
    // TKNOICD: the HIS "Nơi KCBBĐ", compared with the BHYT portal in QUÉT.
    let tkNoiCd = "";
    let hasMainField = false;
    let hasSecondaryField = false;
    const rawParts = [];
    for (const record of records) {
      const keys = new Set(Object.keys(record).map(normalize));
      if (keys.has("BENHCHINHCODE")) hasMainField = true;
      if (keys.has("BENHPHU")) hasSecondaryField = true;
      const currentMainCode = pickField(record, "BENHCHINHCODE").toUpperCase();
      const currentMainName = pickField(record, "BENHCHINH");
      if (!mainCode && currentMainCode) mainCode = currentMainCode;
      if (!mainName && currentMainName) mainName = currentMainName;
      if (!admissionTime) admissionTime = pickField(record, "THOIGIANVAOVIEN");
      if (!tkNoiCd) tkNoiCd = pickField(record, "TKNOICD");
      rawParts.push(currentMainName, pickField(record, "BENHPHU"));
      if (currentMainCode) diagnoses.push({ code: currentMainCode, name: currentMainName, source: "BENHCHINHCODE" });
      diagnoses.push(...parseSecondaryDiagnoses(pickField(record, "BENHPHU")));
    }

    const deduped = [];
    const seenCodes = new Set();
    for (const diagnosis of diagnoses) {
      const code = normalize(diagnosis.code);
      if (!code) continue;
      if (seenCodes.has(code)) {
        // Keep a name found later for a code first seen without one.
        const earlier = deduped.find(item => item.code === code);
        if (earlier && !earlier.name && diagnosis.name) earlier.name = String(diagnosis.name).trim();
        continue;
      }
      seenCodes.add(code);
      deduped.push({ code, name: String(diagnosis.name || "").trim(), source: diagnosis.source || "" });
    }
    if (!hasMainField && !hasSecondaryField) return null;
    return {
      hoSoBenhAnId: String(hoSoBenhAnId || "").trim(),
      source: TARGET_SP,
      mainCode,
      mainName,
      admissionTime,
      tkNoiCd,
      rawText: rawParts.filter(Boolean).join(" ; "),
      diagnoses: deduped,
      codes: deduped.map(item => item.code),
      hasMainField,
      hasSecondaryField,
      capturedAt: Date.now()
    };
  }

  function publishDiagnosis(responseText, hoSoBenhAnId) {
    if (!hoSoBenhAnId) return;
    const icdData = buildIcdPayload(responseText, hoSoBenhAnId);
    if (!icdData) return;
    window.postMessage({ [MARKER]: true, type: "ICD_DATA", hoSoBenhAnId, icdData }, "*");
  }

  function isRestService(url) {
    return String(url || "").toLowerCase().includes("restservice");
  }

  const xhrOpen = XMLHttpRequest.prototype.open;
  const xhrSend = XMLHttpRequest.prototype.send;
  const xhrSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this.__hthIcdUrl = String(url || "");
    this.__hthIcdMethod = String(method || "GET");
    this.__hthIcdHeaders = [];
    return xhrOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
    try { if (Array.isArray(this.__hthIcdHeaders)) this.__hthIcdHeaders.push([String(name), String(value)]); } catch (_) {}
    return xhrSetRequestHeader.call(this, name, value);
  };
  XMLHttpRequest.prototype.send = function(...args) {
    const url = String(this.__hthIcdUrl || "");
    if (isRestService(url) && !this.__hthTkNoiCdOwn) {
      const rpc = readRpcCall(url, args[0]);
      const hoSoId = getTargetHoSoId(rpc);
      const tkId = getTkNoiCdId(rpc);
      const readText = xhr => {
        const responseBody = xhr.responseText || xhr.response;
        return typeof responseBody === "string" ? responseBody : JSON.stringify(responseBody);
      };
      rememberSpTemplate(rpc, url, this.__hthIcdMethod, args[0], this.__hthIcdHeaders);
      if (hoSoId) {
        this.addEventListener("load", function() {
          try { if (this.status >= 200 && this.status < 300) publishDiagnosis(readText(this), hoSoId); } catch (_) {}
        }, { once: true });
      } else if (tkId) {
        this.addEventListener("load", function() {
          try { if (this.status >= 200 && this.status < 300) publishTkNoiCd(readText(this)); } catch (_) {}
        }, { once: true });
      }
    }
    return xhrSend.apply(this, args);
  };

  const originalFetch = window.fetch;
  if (typeof originalFetch === "function") {
    window.fetch = function(...args) {
      const input = args[0];
      const init = args[1] || {};
      let url = "";
      try { url = input && typeof input === "object" ? input.url : String(input || ""); } catch (_) {}
      const rpc = readRpcCall(url, init.body);
      const hoSoId = getTargetHoSoId(rpc);
      if (!isRestService(url)) return originalFetch.apply(this, args);
      if (rpc) {
        const headers = [];
        try { new Headers(init.headers || {}).forEach((value, name) => headers.push([name, value])); } catch (_) {}
        rememberSpTemplate(rpc, url, init.method || "POST", init.body, headers);
      }
      if (hoSoId) {
        return originalFetch.apply(this, args).then(response => {
          try {
            response.clone().text().then(text => publishDiagnosis(text, hoSoId)).catch(() => {});
          } catch (_) {}
          return response;
        });
      }
      const tkId = getTkNoiCdId(rpc);
      if (tkId) {
        return originalFetch.apply(this, args).then(response => {
          try { response.clone().text().then(text => publishTkNoiCd(text)).catch(() => {}); } catch (_) {}
          return response;
        });
      }
      // Only inspect a Request object's cloned body when the URL and init.body
      // did not already identify the target. Ordinary RestService fetches retain
      // their original immediate execution path.
      if (input && typeof Request !== "undefined" && input instanceof Request) {
        return input.clone().text().catch(() => "").then(body => {
          const fallbackHoSoId = getTargetHoSoId(readRpcCall(url, body));
          return originalFetch.apply(this, args).then(response => {
            if (fallbackHoSoId) {
              try { response.clone().text().then(text => publishDiagnosis(text, fallbackHoSoId)).catch(() => {}); } catch (_) {}
            }
            return response;
          });
        });
      }
      return originalFetch.apply(this, args);
    };
  }
})();
