(() => {
  // Additive MAIN-world capture for the current encounter's diagnosis payload.
  // This file only observes the existing NT.005.HSBA request; it does not issue
  // additional HIS requests or modify the original request/response.
  if (window.__hthIcdCaptureV1) return;
  window.__hthIcdCaptureV1 = true;

  const TARGET_SP = "NT.005.HSBA";
  const MARKER = "__hisTimeHelperIcdV1";
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
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this.__hthIcdUrl = String(url || "");
    return xhrOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function(...args) {
    const url = String(this.__hthIcdUrl || "");
    if (isRestService(url)) {
      const rpc = readRpcCall(url, args[0]);
      const hoSoId = getTargetHoSoId(rpc);
      if (hoSoId) {
        this.addEventListener("load", function() {
          try {
            if (this.status >= 200 && this.status < 300) {
              const responseBody = this.responseText || this.response;
              publishDiagnosis(typeof responseBody === "string" ? responseBody : JSON.stringify(responseBody), hoSoId);
            }
          } catch (_) {}
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
      if (hoSoId) {
        return originalFetch.apply(this, args).then(response => {
          try {
            response.clone().text().then(text => publishDiagnosis(text, hoSoId)).catch(() => {});
          } catch (_) {}
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
