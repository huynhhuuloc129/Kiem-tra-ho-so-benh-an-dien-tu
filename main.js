(() => {
  if (window.__hisTimeHelperHookedV31) return;
  window.__hisTimeHelperHookedV31 = true;

  const normalizeKey = key => String(key || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const startAliases = [
    "NGAYPHAUTHUATTHUTHUAT", "NGAYBATDAU", "NGAYBD", "THOIGIANBATDAU",
    "THOIGIANBD", "TGBATDAU", "NGAYCHIDINH", "NGAY_CHI_DINH", "TGCHIDINH",
    "THOIGIANCHIDINH", "NGAYYL", "NGAY_YL", "NGAYTHUCHIEN", "TGTHUCHIEN",
    "START", "STARTTIME", "STARTDATE", "STARTDATETIME", "NGAYYEUCAU",
    "THOIGIANBATDAUTHUCHIEN", "TGBD"
  ].map(normalizeKey);
  // Contrast panel must show the clinician's order/prescription time, not the
  // performed time (TGTHUCHIEN) or result time. The exact order timestamp may
  // arrive on the phiếu-header/list response and is indexed by MAUBENHPHAMID.
  const orderDateAliases = [
    "NGAY_YL", "NGAYYL", "NGAYCHIDINH", "NGAY_CHI_DINH",
    "THOIGIANCHIDINH", "THOIGIAN_CHIDINH", "TGCHIDINH", "TG_CHIDINH",
    "NGAYYLENH", "NGAY_Y_LENH", "THOIGIANYL", "THOIGIAN_YL",
    "NGAYMAUBENHPHAM", "NGAYPHIEU"
  ].map(normalizeKey);
  const performedTimeAliases = [
    "TGTHUCHIEN", "NGAY_TH_YL", "NGAYTHYL", "NGAYTHUCHIEN",
    "THOIGIANTHUCHIEN", "THOIGIAN_THUCHIEN", "THOIGIANBATDAUTHUCHIEN",
    "NGAYPHAUTHUATTHUTHUAT", "NGAYBATDAU", "NGAYBD", "THOIGIANBATDAU",
    "THOIGIANBD", "TGBATDAU", "STARTTIME", "STARTDATETIME"
  ].map(normalizeKey);
  const resultTimeAliases = [
    "THOIGIANTRAKETQUA", "THOIGIANTRAKETQUA1", "THOIGIANTRAKETQUA2",
    "NGAY_KQ", "NGAYKQ", "NGAYTRAKQ", "THOIGIANTRAKQ", "TGTRAKQ",
    "THOIGIANTRAKETQUA_CLS"
  ].map(normalizeKey);
  const admissionDateAliases = [
    "NGAY_VAO_DT", "NGAYVAODT", "NGAYVAOVIEN", "NGAY_VAO_VIEN",
    "THOIGIANVAOVIEN", "THOIGIAN_VAO_VIEN", "NGAYVAO", "NGAY_VAO",
    "NGAYNHAPVIEN", "NGAY_NHAP_VIEN"
  ].map(normalizeKey);
  const dischargeDateAliases = [
    "NGAY_RA_DT", "NGAYRADT", "NGAYHOSORAVIEN", "NGAY_HOSO_RA_VIEN",
    "NGAYRAVIEN", "NGAY_RA_VIEN", "THOIGIANRAVIEN", "THOIGIAN_RA_VIEN",
    "NGAYRA", "NGAY_RA", "NGAYXUATVIEN", "NGAY_XUAT_VIEN"
  ].map(normalizeKey);
  const endAliases = [
    "KETTHUCPTTT", "NGAYKETTHUC", "NGAYKT", "THOIGIANKETTHUC",
    "THOIGIANKT", "TGKETTHUC", "TGKT", "KETTHUC", "END", "ENDTIME",
    "ENDDATE", "ENDDATETIME", "NGAYHOANTHANH", "THOIGIANKETTHUCP TTT",
    "THOIGIANTRAKETQUA1", "THOIGIANTRAKETQUA2", "THOIGIANTRAKETQUA",
    "NGAYKQ", "NGAYTRAKQ", "THOIGIANTRAKQ", "TGTRAKQ", "NGAYKETTHUCTHUCHIEN",
    "TGTRA KQ", "TG_TRA_KQ", "THOIGIANTRAKETQUA_CLS"
  ].map(normalizeKey);
  const codeAliases = [
    "MADICHVU", "MA_DICH_VU", "MADV", "MA_DV", "MACP", "MA_CP",
    "SERVICECODE", "CODE", "MAKT", "MA_XN", "MAHA", "MA_DVKT"
  ].map(normalizeKey);
  const nameAliases = [
    "TENDICHVU", "TEN_DICH_VU", "TENDV", "TEN_DV", "TENCP", "TEN_CP",
    "SERVICENAME", "NAME", "TEN", "TENKT", "TEN_DVKT"
  ].map(normalizeKey);
  const quantityAliases = ["SOLUONG", "SO_LUONG", "QUANTITY", "SL"].map(normalizeKey);
  const expectedAliases = ["SOPHUTTHUCHIEN", "THOIGIANTHUCHIEN", "DURATIONMINUTES", "THOIGIANDUKIEN"].map(normalizeKey);
  const timingAliasSet = new Set([
    ...startAliases, ...endAliases,
    "THOIGIANTHUCHIEN", "THOIGIANTHUCHIEN1", "NGAYTHUCHIEN",
    "THOIGIANKETTHUC", "THOIGIANKETTHUC1", "NGAYKETTHUC",
    "THOIGIANBATDAUTHUCHIEN", "TGBDTHUCHIEN"
  ].map(normalizeKey));
  const caseAliases = [
    "MABENHANID", "HOSOBENHANID", "MA_HO_SO_BENH_AN", "MAHOSOBENHAN",
    "MA_BA", "MABENHAN", "MA_BN", "MABENHNHANID", "BENHNHANID",
    "MA_LK", "MALANKHAM", "LANKHAMID", "DOTDIEUTRIID", "HOSOBENHNHANID",
    "BENHANID", "MA_HS", "SO_BENH_AN"
  ].map(normalizeKey);
  const groupAliases = ["MAUBENHPHAMID", "MAUBENHPHAM", "PHIEUDIEUTRI", "SOPHIEU"].map(normalizeKey);
  const rowAliases = ["DICHVUKHAMBENHID", "PHAUTHUATTHUTHUATID", "MACT", "ID"].map(normalizeKey);
  const contrastServiceCodes = new Set([
    "18.0167.0042", "18.0192.0041", "18.0168.0042", "18.0169.0042",
    "18.0206.0042", "18.0207.0042", "18.0220.0041", "18.0223.0041",
    "18.0224.0041", "18.0242.0042", "18.0256.0041", "18.0260.0041",
    "18.0280.0042", "18.0281.0042", "18.0150.0041", "18.0156.0041",
    "18.0219.0041", "18.0222.0041", "18.0258.0041", "18.0133.0019"
  ]);
  // These two DVKT codes are mutually exclusive on the same order date.
  // Keep them separate from the contrast-radiology counter and medicine matching.
  const sameDayExclusiveServiceCodes = new Set(["24.0001.1714", "24.0004.1716"]);
  // These two DVKT codes must not coexist anywhere in the same treatment episode,
  // even when their order dates differ. Capture them even if the detail payload
  // does not provide a service-row identifier.
  const episodeExclusiveDvktCodes = new Set(["02.0440.0054", "02.0101.0054"]);
  // HIS medicine codes mapped from the user's DSTHUOCVT catalog (MABYT).
  // 40.644 is accepted directly from HIS/XML when present; it is not in the supplied catalog.
  const contrastDrugMap = {
    "XEN021": "40.642", "XEN019": "40.642", "XEN0001": "40.642",
    "XEN020": "40.642", "N24003_NT": "40.642", "XEN022_30": "40.642",
    "XEN0004": "40.642", "XEN022": "40.642", "XEN023": "40.642",
    "XEN025": "40.642", "1097T01.292": "40.642", "XEN024": "40.642"
  };
  // HIS local medicine codes mapped to the BHYT codes selected for the
  // once-daily frequency rule. Source: hospital DSTHUOCVT catalog supplied by user.
  // Keep this map separate from the contrast-drug rule to avoid changing CT matching.
  const frequencyRuleDrugMap = {
    "VIN0018": "40.666", "VIN079": "40.666", "VIN080_30": "40.666", "VIN083_MS": "40.666",
    "1097T04.428": "40.677", "ATI0002": "40.677", "ATI0005": "40.677", "ATI012_MS": "40.677",
    "KAG0001": "40.677", "KAG0002": "40.677", "KAG001_30": "40.677", "KAG001_MS": "40.677",
    "OME001": "40.677", "T240025": "40.677", "T240040": "40.677",
    "123T04.220": "40.678", "154NT05.003": "40.678", "978BDG1.06": "40.678", "978BDG1.07": "40.678",
    "ESO0003": "40.678", "ESO0004": "40.678", "ESO001": "40.678", "ESO001_30": "40.678", "ESO001_MS": "40.678",
    "EST001": "40.678", "NEX001": "40.678", "NEX002": "40.678", "SAM001": "40.678", "SOL001": "40.678",
    "T240057": "40.678", "T240072": "40.678", "T240247": "40.678", "T240248": "40.678",
    "VIN0017": "40.678", "VIN075_30": "40.678", "VIN081": "40.678", "VIN082_MS": "40.678",
    "OZZ0001": "40.679", "PAN013": "40.679", "PAN014": "40.679",
    "1097T04.358": "40.671", "154NT04.070": "40.671", "154NT04.071": "40.671", "ANT002": "40.671",
    "API001": "40.671", "AQU0002": "40.671", "AQU001": "40.671", "AQU001_30": "40.671", "AQU001_MS": "40.671",
    "GUM0001": "40.671", "VIL0002": "40.671", "VIL0003": "40.671", "VIL001": "40.671", "VIL001_30": "40.671", "VIL001_MS": "40.671",
    "123T04.030": "40.662", "A.T028": "40.662", "GEL0002": "40.662", "GEL001_30": "40.662",
    "123T04.034": "40.491", "API0001": "40.491", "KAV0002": "40.491", "KAV0003": "40.491",
    "KAV001_30": "40.491", "KAV003": "40.491", "KAV004": "40.491", "KAV005": "40.491",
    "KAV005_MS": "40.491", "KAV006_MS": "40.491", "T240016": "40.491",
    // Fexofenadine products in DSTHUOCVT.xlsx mapped to BHYT 40.87.
    "123T04.237": "40.87", "T240160": "40.87", "FEX0003": "40.87", "FEX0002": "40.87",
    "FEF001_30": "40.87", "FEF002_MS": "40.87", "FEF002_30": "40.87", "FEF001_MS": "40.87",
    "FEF001": "40.87", "FEF002": "40.87", "T240117": "40.87"
  };
  // HIS-local codes mapped from DSTHUOCVT.xlsx for the under-18 medicine audit.
  const under18DrugMap = {
    // BHYT 40.228 - Levofloxacin 750mg/150ml; Bivelox IV 500mg/100ml.
    "LEV0004": "40.228", "LEV001_MS": "40.228", "LEV001_30": "40.228", "LEV002": "40.228",
    "LEV0005": "40.228", "BIV0003": "40.228", "BIV001": "40.228",
    // BHYT 40.229 - Levofloxacin 500mg and other catalog preparations.
    "MED0004": "40.229", "N.MED0004": "40.229", "LEV001": "40.229", "LES001": "40.229",
    "LET0001": "40.229", "T240202": "40.229", "LET001_30": "40.229", "LET001_MS": "40.229",
    "KAF0002": "40.229", "T240115": "40.229", "EYE0002": "40.229", "EYE009_30": "40.229",
    "EYE010_MS": "40.229", "EYE010": "40.229", "T240199": "40.229", "CRA0001": "40.229",
    "CRA001_30": "40.229", "CRA001_MS": "40.229", "123T01.337": "40.229",
    // BHYT 40.231 - Moxifloxacin 400mg/250ml.
    "BIV0002": "40.231", "MOX002": "40.231", "MOX0003": "40.231",
    // BHYT 40.232 - Moxifloxacin 0.5% and Bluemoxi 400mg.
    "MOX001_30": "40.232", "MOX001_MS": "40.232", "MOX001": "40.232", "MOX0002": "40.232",
    "N.MOX0002": "40.232", "BLU001_30": "40.232", "BLU001_MS": "40.232", "BLU0001": "40.232",
    "N.BLU001_30": "40.232"
  };
  const auditDrugBhytMap = { ...frequencyRuleDrugMap, ...contrastDrugMap, ...under18DrugMap };
  // OXY is a hospital-local medicine code in DSTHUOCVT (MA_THUOC_BV = OXY).
  // The XML/Access check uses the corresponding oxygen item MA_THUOC = 40.17;
  // do not add this as a general BHYT map because DSTHUOCVT has an empty MABYT.
  const oxyLocalMedicineCodes = new Set(["OXY"]);
  const oxyBHYTMedicineCodes = new Set(["40.17"]);
  // These are the two XML3 service codes used by the Access overlap query.
  // Detect them explicitly in any service-code field, and allow capture even
  // when this HIS endpoint omits DICHVUKHAMBENHID / another row identifier.
  const ventilationServiceCodes = new Set(["01.0128.0209", "01.0132.0209"]);
  // HIS PTTT can show the local service code PT0032 while XML3 carries the
  // corresponding BHYT ventilation codes. Also recognize the explicit service
  // name shown in the PTTT detail grid; do not rely on the BHYT code being present.
  const ventilationHisServiceCodes = new Set(["PT0032", "PT0034"]);
  // Mandatory companion DVKT group: any one of the three procedure codes
  // must be accompanied by 25.0030.1751 on the same order date, and the
  // companion code must in turn have at least one of the three codes that day.
  const requiredCompanionDvktCodes = new Set([
    "02.0304.0134", "02.0309.0138", "02.0262.0136", "25.0030.1751",
    // Second two-way mandatory companion rule (same order date):
    // any of the six trigger procedures requires at least one of the two
    // companion procedures, and either companion requires one trigger.
    "03.1858.1012", "16.0050.1015", "16.0050.1014", "16.0050.1013",
    "16.0050.1012", "16.0051.1014", "18.0081.2001", "18.0081.0028"
  ]);
  const ventilationCodeFieldNames = new Set([
    "MADMBYT", "MA_DVKT_BHYT", "MA_DICH_VU_BHYT", "MA_DICH_VU",
    "MADICHVU", "MA_DVKT", "MAKT", "MA_CP", "MACP", "MA_DV", "MADV",
    "SERVICECODE", "CODE"
  ].map(normalizeKey));
  let activeContrastContextKey = "";
  const contrastOrderDateByTicket = new Map();
  // MAUBENHPHAMIDs of đơn thuốc/vật tư phiếu, learned from the prescription
  // list (NT.024.DSTHUOCVT). Rows belonging to these phiếu are medicines even
  // when the detail payload lacks NHAPXUATCTID/route fields.
  const medicinePhieuIds = new Set();
  // Name of the HIS query (postData params[0], e.g. "NT.024.DSTHUOCVT").
  function hisQueryName(url, body) {
    let text = String(url || "") + " " + String(body || "");
    try { text = decodeURIComponent(text.replace(/\+/g, " ")); } catch (_) {}
    const m = text.match(/"params"\s*:\s*\[\s*"([^"]+)"/);
    return m ? m[1] : "";
  }
  function isMedicineQuery(queryName) {
    return /THUOC|VATTU/i.test(String(queryName || "")) && !/PHANUNG/i.test(String(queryName || ""));
  }
  function isMedicinePhieuRecord(record, queryName) {
    if (isMedicineQuery(queryName)) return true;
    const ticketId = String(pickField(record, ["MAUBENHPHAMID", "MAUBENHPHAM"].map(normalizeKey)) || "").trim();
    return !!ticketId && medicinePhieuIds.has(ticketId);
  }

  function readHISContext() {
    const read = id => {
      const el = document.getElementById(id);
      return el && "value" in el ? String(el.value || "").trim() : "";
    };
    const context = {
      tiepNhanId: read("hidTIEPNHANID"),
      hoSoBenhAnId: read("hidHOSOBENHANID"),
      benhNhanId: read("hidBENHNHANID"),
      khamBenhId: read("hidKHAMBENHID"),
      maBenhNhan: read("hidMABENHNHAN"),
      admissionDate: "",
      dischargeDate: "",
      dateOfBirth: ""
    };
    // The selected patient grid already contains the admission/discharge values.
    // Read them without changing HIS state; hidden ID inputs remain the encounter key.
    try {
      const jq = window.jQuery || window.$;
      if (jq && jq.fn && jq.fn.jqGrid) {
        const grid = jq("#grdLS");
        const selected = grid.jqGrid("getGridParam", "selrow");
        if (selected) {
          const row = grid.jqGrid("getRowData", selected) || {};
          const find = aliases => {
            const keys = Object.keys(row);
            for (const alias of aliases) {
              const wanted = normalizeKey(alias);
              const key = keys.find(k => normalizeKey(k) === wanted);
              if (key && row[key] !== undefined && String(row[key]).trim()) return String(row[key]).trim();
            }
            return "";
          };
          context.admissionDate = find(["NGAYVAOVIEN", "NGAY_VAO_VIEN", "NGAY_VAO_DT", "THOIGIANVAOVIEN"]);
          context.dischargeDate = find(["NGAYHOSORAVIEN", "NGAYRAVIEN", "NGAY_RA_DT", "THOIGIANRAVIEN"]);
          context.dateOfBirth = find(["NGAYSINH", "NGAY_SINH", "NGAYSINHBN", "NGAY_SINH_BN", "NAMSINH", "NAM_SINH", "NAMSINHBN", "NAMSINH_BN"]);
        }
      }
    } catch (_) {}
    const parts = [context.tiepNhanId, context.hoSoBenhAnId, context.benhNhanId].filter(Boolean);
    context.key = parts.length ? parts.join("|") : "";
    return context;
  }

  // Only materialize objects that can actually contribute patient or service data.
  // HIS RestService payloads often contain deeply nested metadata/config objects;
  // traversing them into a record array caused avoidable allocations on long-stay cases.
  const candidateRecordFields = new Set([
    ...startAliases, ...endAliases, ...codeAliases, ...nameAliases,
    ...quantityAliases, ...expectedAliases, ...caseAliases, ...groupAliases, ...rowAliases,
    "MABENHNHAN", "MABHYT", "MABYT", "TENBENHNHAN", "NGAYSINH", "NGAYSINHBN", "NGAYSINH_BN", "NAMSINH", "NAM_SINH", "NAMSINHBN", "NAMSINH_BN", "GIOITINH",
    "DT_SINHSONG", "MA_DKBD", "THOIGIAN", "THOIGIANVAOVIEN", "THOIGIANRAVIEN",
    "NGAYVAOVIEN", "NGAYRAVIEN", "NGAYHOSORAVIEN", "NGAYVAODT", "NGAYRADT",
    "NGAY_VAO_DT", "NGAY_RA_DT", "MADMBYT", "MA_DVKT_BHYT", "MA_DICH_VU_BHYT", "MA_THUOC", "MA_THUOC_BHYT", "MATHUOCBHYT",
    "NHAPXUATCTID", "DICHVUTHUCHIENID", "KETQUACLSID", "NDHL", "DUONGDUNG",
    "MADUONGDUNG", "TENKHOAHOC", "LOAIDOITUONG", "HUONGDANSUDUNG", "NGAYMAUBENHPHAM",
    "MA_THUOC_BV", "MATHUOCBV", "TEN_THUOC", "TENTHUOC", "TENBYT"
  ].map(normalizeKey));

  // Cache normalized field names per object. The older path rebuilt Object.entries()
  // and normalized every key for every requested field, which was expensive on long-stay
  // responses containing many nested service records.
  const fieldCache = new WeakMap();
  function fieldMap(obj) {
    if (!obj || typeof obj !== "object") return new Map();
    let cached = fieldCache.get(obj);
    if (cached) return cached;
    cached = new Map();
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (value !== null && value !== undefined && String(value).trim() !== "") {
        const norm = normalizeKey(key);
        if (!cached.has(norm)) cached.set(norm, value);
      }
    }
    fieldCache.set(obj, cached);
    return cached;
  }
  function pickField(obj, aliases) {
    const fields = fieldMap(obj);
    for (const alias of aliases) if (fields.has(alias)) return fields.get(alias);
    return "";
  }

  // BHYT portal accepts the date only; HIS can return the DOB as
  // "dd/MM/yyyy 00:00:00" or ISO datetime. Do not copy the time component.
  function normalizeBirthDate(value) {
    if (value === null || value === undefined || value === "") return "";
    const s = String(value).trim();
    let m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
    if (m) return `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}/${m[3]}`;
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return `${String(m[3]).padStart(2, "0")}/${String(m[2]).padStart(2, "0")}/${m[1]}`;
    m = s.match(/^\/Date\((-?\d+)(?:[+-]\d+)?\)\/$/);
    if (m) {
      const d = new Date(Number(m[1]));
      if (!Number.isNaN(d.getTime())) {
        const pad = n => String(n).padStart(2, "0");
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
      }
    }
    return s.split(/[ T]/)[0];
  }

  // The HIS patient-detail response exposes the insurance/card validity range
  // in THOIGIAN, e.g. "01/02/2026-31/10/2026". Preserve the raw range and
  // parse it as Vietnamese dd/MM/yyyy dates for comparison with the BHYT portal.
  function parseCardValidityPeriod(value) {
    const s = String(value || "").trim();
    const m = s.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})\s*(?:-|–|—|đến|den|to)\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})/i);
    if (!m) return { raw: s, start: "", end: "" };
    const dateOnly = v => {
      const d = String(v || "").match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
      return d ? `${d[1].padStart(2, "0")}/${d[2].padStart(2, "0")}/${d[3]}` : "";
    };
    return { raw: s, start: dateOnly(m[1]), end: dateOnly(m[2]) };
  }

  // Normalize admission/discharge values from HIS detail responses to dd/MM/yyyy.
  // The source fields may carry a time component or be returned in ISO format.
  function normalizeDateOnly(value) {
    if (value === null || value === undefined || value === "") return "";
    const normalized = normalizeDateTime(value);
    const m = String(normalized || "").trim().match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
    return m ? `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}/${m[3]}` : normalizeBirthDate(value);
  }

  function extractPatient(records, url) {
    if (url && !String(url).toLowerCase().includes("restservice")) return;
    if (!Array.isArray(records) || !records.length) return;

    for (const r of records) {
      const caseNo = String(pickField(r, ["MAHOSOBENHAN", "MA_BA", "MAHOSOBENAN", "SO_BENH_AN"].map(normalizeKey)) || "").trim();
      const patientId = String(pickField(r, ["MABENHNHAN", "MA_BN", "MABENHNHANID"].map(normalizeKey)) || "").trim();
      const card = String(pickField(r, ["MABHYT", "MA_THE_BHYT", "MATHẺ", "MATHEBHYT"].map(normalizeKey)) || "").trim();
      const name = String(pickField(r, ["TENBENHNHAN", "HO_TEN", "HOTEN", "TEN_BENH_NHAN"].map(normalizeKey)) || "").trim();
      const dob = normalizeBirthDate(pickField(r, ["NGAYSINH", "NGAY_SINH", "NGAYSINHBN"].map(normalizeKey)));
      const kv = String(pickField(r, ["DT_SINHSONG", "KV", "MAKV", "KHU_VUC", "DANTOC_KV"].map(normalizeKey)) || "").trim();
      const gender = String(pickField(r, ["GIOITINH", "GIOI_TINH", "PHAI", "GENDER", "SEX"].map(normalizeKey)) || "").trim();
      const registrationFacility = String(pickField(r, ["MA_DKBD", "MADKBD", "NOIKCBBD", "NOI_DANG_KY_KCB_BAN_DAU", "MA_CSKCB_BD", "MACSKCBBD", "NOIDANGKYKCBBD", "TENNOIDKBD", "TEN_CSKCB_DKBD"].map(normalizeKey)) || "").trim();
      const cardValidity = parseCardValidityPeriod(pickField(r, ["THOIGIAN", "THOI_GIAN", "THOIGIANTHE", "THOIHANBHYT", "THOIGIANBHYT"].map(normalizeKey)));
      const admissionDate = normalizeDateOnly(pickField(r, ["THOIGIANVAOVIEN", "THOIGIAN_VAO_VIEN", "NGAYVAOVIEN", "NGAY_VAO_VIEN", "NGAYVAO", "NGAY_VAO", "NGAYNHAPVIEN", "NGAY_NHAP_VIEN"].map(normalizeKey)));
      const dischargeDate = normalizeDateOnly(pickField(r, ["THOIGIANRAVIEN", "THOIGIAN_RA_VIEN", "NGAYRAVIEN", "NGAY_RA_VIEN", "NGAYRA", "NGAY_RA", "NGAYXUATVIEN", "NGAY_XUAT_VIEN"].map(normalizeKey)));
      if (!card || !name || !dob || (!caseNo && !patientId)) continue;
      window.postMessage({
        __hisTimeHelperV31: true,
        type: "PATIENT",
        patient: {
          caseNo, patientId, card, name, dob, kv, gender, registrationFacility,
          cardValidityPeriod: cardValidity.raw,
          hisCardStart: cardValidity.start,
          hisCardExpiry: cardValidity.end,
          admissionDate,
          dischargeDate
        }
      }, "*");
      break;
    }
  }

  function normalizeDateTime(value) {
    if (value === null || value === undefined || value === "") return "";
    const s = String(value).trim();
    // XML dates may be compact YYYYMMDD, YYYYMMDDHHmm or YYYYMMDDHHmmss.
    // Parse these before numeric epoch values so a 14-digit calendar timestamp
    // is never mistaken for milliseconds since 1970.
    const compact = s.match(/^(\d{4})(\d{2})(\d{2})(?:(\d{2})(\d{2})(\d{2})?)?$/);
    if (compact) {
      const year = Number(compact[1]), month = Number(compact[2]), day = Number(compact[3]);
      const hour = Number(compact[4] || "0"), minute = Number(compact[5] || "0"), second = Number(compact[6] || "0");
      const d = new Date(year, month - 1, day, hour, minute, second);
      if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day &&
          d.getHours() === hour && d.getMinutes() === minute && d.getSeconds() === second) return formatDate(d);
    }
    if (typeof value === "number" || /^\d{10,13}$/.test(s)) {
      const n = Number(value);
      if (Number.isFinite(n)) {
        const ms = String(Math.trunc(n)).length <= 10 ? n * 1000 : n;
        const d = new Date(ms);
        if (!Number.isNaN(d.getTime())) return formatDate(d);
      }
    }
    const dotnet = s.match(/^\/Date\((-?\d+)(?:[+-]\d+)?\)\/$/);
    if (dotnet) {
      const d = new Date(Number(dotnet[1]));
      if (!Number.isNaN(d.getTime())) return formatDate(d);
    }
    const local = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (local) {
      return `${local[1].padStart(2, "0")}/${local[2].padStart(2, "0")}/${local[3]} ${String(local[4] || "00").padStart(2, "0")}:${local[5] || "00"}:${local[6] || "00"}`;
    }
    const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (iso) {
      return `${String(iso[3]).padStart(2, "0")}/${String(iso[2]).padStart(2, "0")}/${iso[1]} ${String(iso[4] || "00").padStart(2, "0")}:${iso[5] || "00"}:${iso[6] || "00"}`;
    }
    return s;
  }

  function formatDate(d) {
    const pad = n => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  const jsonWrapperKeys = new Set(["RESULT", "DATA", "OUT_VAR"]);
  function collectObjects(value, out = [], seen = new Set(), depth = 0, parentKey = "") {
    if (value === null || value === undefined || depth > 7) return out;
    if (typeof value === "string") {
      const key = normalizeKey(parentKey);
      const text = value.trim();
      if (jsonWrapperKeys.has(key) && text.length > 1 && (text[0] === "[" || text[0] === "{")) {
        try { collectObjects(JSON.parse(text), out, seen, depth + 1, ""); } catch (_) {}
      }
      return out;
    }
    if (typeof value !== "object" || seen.has(value)) return out;
    seen.add(value);
    if (Array.isArray(value)) {
      for (const item of value) collectObjects(item, out, seen, depth + 1, "");
      return out;
    }
    const keys = Object.keys(value);
    let isCandidate = false;
    for (const key of keys) {
      if (candidateRecordFields.has(normalizeKey(key))) { isCandidate = true; break; }
    }
    if (isCandidate) out.push(value);
    // Avoid Object.entries() allocation for every nested metadata object.
    for (const key of keys) {
      const child = value[key];
      if (child && typeof child === "object") collectObjects(child, out, seen, depth + 1, key);
      else if (typeof child === "string" && jsonWrapperKeys.has(normalizeKey(key))) {
        collectObjects(child, out, seen, depth + 1, key);
      }
    }
    return out;
  }

  // Fast raw-text filter prevents JSON.parse + recursive traversal for RestService calls
  // that clearly do not contain patient, service, or timing data.
  const relevantJsonKey = /"(?:MAHOSOBENHAN|MA_BA|MABENHNHAN|MABHYT|TENBENHNHAN|NGAYSINH|NAMSINH|NAM_SINH|NAMSINHBN|NAMSINH_BN|THOIGIANVAOVIEN|THOIGIANRAVIEN|NGAYVAOVIEN|NGAYRAVIEN|NGAYHOSORAVIEN|NGAYVAODT|NGAYRADT|NGAY_VAO_DT|NGAY_RA_DT|MADICHVU|MA_DICH_VU|MADV|MA_DV|MACP|MA_CP|MA_DVKT|MA_XN|MAHA|MAKT|DICHVUKHAMBENHID|PHAUTHUATTHUTHUATID|SERVICECODE|TENDICHVU|TEN_DICH_VU|TENDV|TEN_DV|TENCP|TEN_CP|TEN_DVKT|SERVICENAME|SOPHIEU|MAUBENHPHAMID|MAUBENHPHAM|PHIEUDIEUTRI|NGAYPHAUTHUATTHUTHUAT|NGAYBATDAU|NGAYBD|THOIGIANBATDAU|THOIGIANBD|TGBATDAU|NGAYCHIDINH|TGCHIDINH|THOIGIANCHIDINH|NGAYYL|NGAYTHUCHIEN|TGTHUCHIEN|STARTTIME|STARTDATE|STARTDATETIME|NGAYYEUCAU|THOIGIANBATDAUTHUCHIEN|TGBD|KETTHUCPTTT|NGAYKETTHUC|NGAYKT|THOIGIANKETTHUC|THOIGIANKT|TGKETTHUC|TGKT|KETTHUC|ENDTIME|ENDDATE|ENDDATETIME|NGAYHOANTHANH|NGAYKQ|NGAYTRAKQ|THOIGIANTRAKQ|TGTRAKQ|SOLUONG|SO_LUONG|QUANTITY|SOPHUTTHUCHIEN|THOIGIANDUKIEN|MADMBYT|MA_DVKT_BHYT|MA_DICH_VU_BHYT|MABYT|MA_THUOC|MA_THUOC_BHYT|MATHUOCBHYT|NHAPXUATCTID|DICHVUTHUCHIENID|KETQUACLSID|NDHL|DUONGDUNG|MADUONGDUNG|TENKHOAHOC|NGAYMAUBENHPHAM|HUONGDANSUDUNG|NGAY_YL|NGAY_TH_YL|THOIGIANTRAKETQUA1|THOIGIANTRAKETQUA2|NGAY_KQ)\\?"\s*:/i;
  // A validity period is sometimes returned under the generic THOIGIAN key.
  // Match its date-range shape specifically, rather than parsing every response
  // merely because it contains an unrelated field named THOIGIAN.
  const cardValidityRangePattern = /"THOIGIAN"\s*:\s*"\d{1,2}[\/-]\d{1,2}[\/-]\d{4}\s*[-–—]\s*\d{1,2}[\/-]\d{1,2}[\/-]\d{4}"/i;
  function processResponseText(rawText, url, requestContext, queryName) {
    if (!rawText) return;
    try { extract(JSON.parse(rawText), url, requestContext, queryName); } catch (_) {}
  }

  // Queue response parsing into idle periods instead of parsing every RestService
  // response immediately on the main UI thread. Long-stay encounters can return
  // many large payloads in a burst; yielding between payloads keeps Edge responsive.
  const pendingResponseTexts = [];
  let responseQueueScheduled = false;
  function scheduleResponseQueue() {
    if (responseQueueScheduled || !pendingResponseTexts.length) return;
    responseQueueScheduled = true;
    const run = deadline => {
      responseQueueScheduled = false;
      // Process up to four payloads per idle period, yielding as soon as the
      // browser's idle budget is used up. Patient-detail responses are prioritized
      // in the queue so the BHYT workflow does not wait behind service responses.
      let processed = 0;
      while (pendingResponseTexts.length && processed < 4) {
        if (processed > 0 && deadline && typeof deadline.timeRemaining === "function" && deadline.timeRemaining() < 8 && !deadline.didTimeout) break;
        const item = pendingResponseTexts.shift();
        if (item) processResponseText(item.text, item.url, item.requestContext, item.queryName);
        processed++;
      }
      if (pendingResponseTexts.length) scheduleResponseQueue();
    };
    if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(run, { timeout: 80 });
    else window.setTimeout(() => run(null), 30);
  }
  function queueResponseText(rawText, url, requestContext, queryName = "") {
    if (!rawText) return;
    // Keep the fast filter for ordinary payloads, but always inspect payloads that
    // mention the two service codes needed by the suction-versus-ventilation rule.
    const airwayServicePayload = /PT0022|PT0034|01\.0128\.0209|01\.0132\.0209|h[uú]t đờm|thông khí nhân tạo/i.test(rawText);
    if (!relevantJsonKey.test(rawText) && !cardValidityRangePattern.test(rawText) && !airwayServicePayload) return;

    const patientPriority = /"(?:MABHYT|MABENHNHAN|MAHOSOBENHAN|TENBENHNHAN|NGAYSINH|NAMSINH|NAM_SINH|NAMSINHBN|NAMSINH_BN|THOIGIANVAOVIEN|THOIGIANRAVIEN)\\?"\s*:/i.test(rawText);
    const importance = patientPriority ? 3 : (airwayServicePayload ? 2 : 1);
    const item = { text: rawText, url, requestContext: requestContext || null, queryName, priority: patientPriority, importance };
    // Process patient detail first, then PT0022/PT0034 records, retaining arrival
    // order within each priority group.
    const insertAt = pendingResponseTexts.findIndex(entry => (entry.importance || (entry.priority ? 3 : 1)) < importance);
    if (insertAt < 0) pendingResponseTexts.push(item);
    else pendingResponseTexts.splice(insertAt, 0, item);

    // Keep a strict memory bound and drop the oldest least-important payload first.
    // This prevents ordinary RestService bursts from evicting key suction/ventilation data.
    if (pendingResponseTexts.length > 24) {
      let lowest = Infinity;
      for (const entry of pendingResponseTexts) lowest = Math.min(lowest, entry.importance || (entry.priority ? 3 : 1));
      const dropIndex = pendingResponseTexts.findIndex(entry => (entry.importance || (entry.priority ? 3 : 1)) === lowest);
      pendingResponseTexts.splice(dropIndex >= 0 ? dropIndex : 0, 1);
    }
    scheduleResponseQueue();
  }

  function extractAuditData(records, context, queryName = "") {
    if (!context || !context.key || !Array.isArray(records) || !records.length) return;
    // A slow response from the previous patient must not be attributed to the new selection.
    const visibleContext = readHISContext();
    if (!visibleContext.key || visibleContext.key !== context.key) return;
    if (activeContrastContextKey && activeContrastContextKey !== context.key) {
      contrastOrderDateByTicket.clear();
    }
    activeContrastContextKey = context.key;

    let admissionDate = String(context.admissionDate || visibleContext.admissionDate || "").trim();
    let dischargeDate = String(context.dischargeDate || visibleContext.dischargeDate || "").trim();
    let dateOfBirth = String(context.dateOfBirth || visibleContext.dateOfBirth || "").trim();

    // Index order time by phiếu so detail rows that omit NGAY_YL can use the
    // actual phiếu/order timestamp shown by HIS. Never substitute performed/result time.
    for (const r of records) {
      const ticketId = String(pickField(r, ["MAUBENHPHAMID", "MAUBENHPHAM"].map(normalizeKey)) || "").trim();
      const ticketDate = String(pickField(r, orderDateAliases) || "").trim();
      if (ticketId && ticketDate) contrastOrderDateByTicket.set(ticketId, normalizeDateTime(ticketDate));
      if (!admissionDate) admissionDate = String(pickField(r, admissionDateAliases) || "").trim();
      if (!dischargeDate) dischargeDate = String(pickField(r, dischargeDateAliases) || "").trim();
      if (!dateOfBirth) dateOfBirth = String(pickField(r, ["NGAYSINH", "NGAY_SINH", "NGAYSINHBN", "NGAYSINH_BN", "NAMSINH", "NAM_SINH", "NAMSINHBN", "NAMSINH_BN"].map(normalizeKey)) || "").trim();
    }
    while (contrastOrderDateByTicket.size > 600) {
      const first = contrastOrderDateByTicket.keys().next().value;
      contrastOrderDateByTicket.delete(first);
    }

    const dvktRows = [];
    const medicineRows = [];
    const contrastServices = [];
    const contrastMedicines = [];
    const seenDvkt = new Set();
    const seenMedicines = new Set();
    const seenContrastServices = new Set();
    const seenContrastMedicines = new Set();

    const pickAllTimePoints = (record, aliases, label) => {
      const wanted = new Set(aliases);
      const out = [];
      for (const rawKey of Object.keys(record || {})) {
        const key = normalizeKey(rawKey);
        if (!wanted.has(key)) continue;
        const value = String(record[rawKey] ?? "").trim();
        if (!value) continue;
        const normalized = normalizeDateTime(value);
        if (!normalized) continue;
        if (!out.some(item => item.value === normalized && item.field === rawKey)) {
          out.push({ kind: label, field: rawKey, value: normalized });
        }
      }
      return out;
    };

    for (const r of records) {
      const fields = fieldMap(r);
      const ticketId = String(pickField(r, ["MAUBENHPHAMID", "MAUBENHPHAM"].map(normalizeKey)) || "").trim();
      const quantity = String(pickField(r, quantityAliases) || "").trim();
      const exactOrderRaw = String(pickField(r, ["NGAY_YL", "NGAYYL"].map(normalizeKey)) || "").trim();
      const orderRaw = String(pickField(r, orderDateAliases) || contrastOrderDateByTicket.get(ticketId) || "").trim();
      const orderTime = orderRaw ? normalizeDateTime(orderRaw) : "";
      const oxyOrderTime = exactOrderRaw ? normalizeDateTime(exactOrderRaw) : orderTime;
      const oxyOrderSource = exactOrderRaw ? "NGAY_YL" : (orderTime ? "Thời gian phiếu (dùng khi HIS không trả NGAY_YL riêng)" : "");

      const directDrugCode = String(pickField(r, ["MA_THUOC", "MATHUOCBHYT", "MABYT", "MA_THUOC_BHYT"].map(normalizeKey)) || "").trim().replace(/\s+/g, "");
      // Do not assume one fixed code column: some HIS service responses expose
      // the BHYT code as MADMBYT, others as MA_DICH_VU / MADICHVU.
      const recordServiceCodes = Object.keys(r || {}).filter(rawKey => ventilationCodeFieldNames.has(normalizeKey(rawKey)))
        .map(rawKey => String(r[rawKey] ?? "").trim().replace(/\s+/g, "")).filter(Boolean);
      const ventilationCodeInRecord = recordServiceCodes.find(candidate => ventilationServiceCodes.has(candidate)) || "";
      const ventilationHisCodeInRecord = recordServiceCodes.find(candidate => ventilationHisServiceCodes.has(candidate.toUpperCase())) || "";
      const requiredCompanionCodeInRecord = recordServiceCodes.find(candidate => requiredCompanionDvktCodes.has(candidate)) || "";
      const isRequiredCompanionDvktRecord = Boolean(requiredCompanionCodeInRecord);
      const episodeExclusiveCodeInRecord = recordServiceCodes.find(candidate => episodeExclusiveDvktCodes.has(candidate)) || "";
      const isEpisodeExclusiveDvktRecord = Boolean(episodeExclusiveCodeInRecord);
      const candidateServiceNameForVent = String(pickField(r, ["TENDICHVU", "TENCHIDINH", "TENDV", "TEN_DV", "TENPTTT"].map(normalizeKey)) || "").trim();
      const normalizedVentServiceName = candidateServiceNameForVent.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      const ventilationNameInRecord = normalizedVentServiceName.includes("THONGKHINHANTAO") ||
        normalizedVentServiceName.includes("MECHANICALVENTILATION");
      const isVentilationRecord = Boolean(ventilationCodeInRecord || ventilationHisCodeInRecord || ventilationNameInRecord);
      const localDrugCodeValues = ["MADICHVU", "MA_THUOC_BV", "MATHUOCBV"]
        .map(name => String(fields.get(normalizeKey(name)) || "").trim()).filter(Boolean);
      const hisDrugCode = String(pickField(r, ["MADICHVU", "MA_THUOC_BV", "MATHUOCBV", "MATHUOC"].map(normalizeKey)) || "").trim();
      const mappedDrugCode = auditDrugBhytMap[hisDrugCode.toUpperCase()] || "";
      const directBHYTDrugCode = /^\d{2}\.\d{2,3}$/.test(directDrugCode) ? directDrugCode : "";
      const bhytDrugCode = directBHYTDrugCode || mappedDrugCode;
      const candidateDrugName = String(pickField(r, ["TENDICHVU", "TENKHOAHOC", "TEN_THUOC", "TENTHUOC", "TENBYT"].map(normalizeKey)) || "").trim();
      const normalizedHisDrugCode = normalizeKey(hisDrugCode);
      const normalizedDrugNameForOxy = normalizeKey(candidateDrugName);
      const oxyNameMatch = normalizedDrugNameForOxy === "OXY" ||
        normalizedDrugNameForOxy === "OXYGEN" ||
        normalizedDrugNameForOxy.includes("LIQUIDOXYGEN") ||
        normalizedDrugNameForOxy.includes("MEDICALOXYGEN") ||
        normalizedDrugNameForOxy.includes("OXYGENMEDICAL");
      const isOxyRecord = localDrugCodeValues.some(code => oxyLocalMedicineCodes.has(normalizeKey(code))) ||
        oxyBHYTMedicineCodes.has(directDrugCode) || oxyNameMatch;
      const hasDrugShape = !isVentilationRecord && Boolean(
        (String(pickField(r, ["NHAPXUATCTID"].map(normalizeKey)) || "").trim() &&
          (fields.has("DUONGDUNG") || fields.has("MADUONGDUNG") || fields.has("NDHL") || fields.has("TENKHOAHOC") || isOxyRecord)) ||
        (isOxyRecord && (quantity !== "" || fields.has("NHAPXUATCTID") || fields.has("DICHVUKHAMBENHID") || fields.has("MACT"))) ||
        // Detail line of a đơn thuốc/vật tư phiếu: a medicine, never a DVKT.
        (isMedicinePhieuRecord(r, queryName) && Boolean(hisDrugCode || directDrugCode || candidateDrugName))
      );
      if (hasDrugShape) {
        const drugName = candidateDrugName;
        const nhapXuatId = String(pickField(r, ["NHAPXUATCTID"].map(normalizeKey)) || "").trim();
        const rowId = String(pickField(r, ["DICHVUKHAMBENHID", "MACT", "ID"].map(normalizeKey)) || "").trim();
        const oxyFallbackKey = isOxyRecord && !nhapXuatId && !rowId ? `${orderTime}|${quantity}|${drugName}` : "";
        const key = [nhapXuatId || oxyFallbackKey, rowId, ticketId, hisDrugCode, directDrugCode].join("|");
        if (!seenMedicines.has(key)) {
          seenMedicines.add(key);
          const medicine = {
            key, ticketId, rowId, hisCode: hisDrugCode, bhytCode: bhytDrugCode,
            name: drugName || (isOxyRecord ? "Oxy" : ""), quantity,
            isOxy: !!isOxyRecord,
            oxyStartAt: isOxyRecord ? (oxyOrderTime || "") : "",
            oxyStartSource: isOxyRecord ? oxyOrderSource : "",
            oxyQuantity: isOxyRecord ? quantity : "",
            oxyCodeSource: isOxyRecord ? (oxyBHYTMedicineCodes.has(directDrugCode) ? "MA_THUOC 40.17" : (localDrugCodeValues.some(code => oxyLocalMedicineCodes.has(normalizeKey(code))) ? "Mã HIS OXY" : "Tên thuốc Oxy")) : "",
            unit: String(pickField(r, ["DVT", "DONVITINH", "DON_VI_TINH"].map(normalizeKey)) || "").trim(),
            route: String(pickField(r, ["DUONGDUNG", "TENDUONGDUNG"].map(normalizeKey)) || "").trim(),
            strength: String(pickField(r, ["NDHL", "HAMLUONG"].map(normalizeKey)) || "").trim(),
            usage: String(pickField(r, ["HUONGDANSUDUNG", "CACHDUNG", "LIEUDUNG"].map(normalizeKey)) || "").trim(),
            doseText: String(pickField(r, ["LIEUDUNG", "LIEUDUNGCHITIET", "DOSEINSTRUCTION"].map(normalizeKey)) || "").trim(),
            usageInstruction: String(pickField(r, ["HUONGDANSUDUNG", "CACHDUNG"].map(normalizeKey)) || "").trim(),
            orderDate: orderTime,
            source: directBHYTDrugCode ? "HIS-BHYT-code" : (mappedDrugCode ? "HIS-catalog-map" : "HIS-unmapped")
          };
          medicineRows.push(medicine);
          if (["40.642", "40.644"].includes(bhytDrugCode)) {
            const contrastKey = [nhapXuatId, rowId, ticketId, bhytDrugCode].join("|");
            if (!seenContrastMedicines.has(contrastKey)) {
              seenContrastMedicines.add(contrastKey);
              contrastMedicines.push(medicine);
            }
          }
        }
      }

      // General DVKT capture. Require a service-row identifier and exclude medicine
      // records so no medicine item can leak into the DVKT module or legacy timing panel.
      const serviceCode = ventilationCodeInRecord || requiredCompanionCodeInRecord || episodeExclusiveCodeInRecord || String(pickField(r, ["MADMBYT", "MA_DVKT_BHYT", "MA_DICH_VU_BHYT", "MADICHVU", "MA_DICH_VU", "MADV", "MA_DV"].map(normalizeKey)) || "").trim().replace(/\s+/g, "");
      const serviceName = String(pickField(r, ["TENDICHVU", "TENCHIDINH", "TENDV", "TEN_DV", "TENPTTT"].map(normalizeKey)) || "").trim();
      const serviceRowId = String(pickField(r, ["DICHVUKHAMBENHID", "DICHVUTHUCHIENID", "KETQUACLSID", "PHAUTHUATTHUTHUATID", "MACT", "ID"].map(normalizeKey)) || "").trim();
      // For the ventilator codes, the code + NGAY_YL + NGAY_KQ are sufficient
      // to run the exact XML3 interval test; some RestService detail payloads
      // omit a service-row ID. Other DVKT rows still require their normal ID.
      // XML3 calls the end point NGAY_KQ. HIS detail responses may expose the
      // same result timestamp under THOIGIANTRAKETQUA* / NGAYTRAKQ.
      const ventilatorEndRaw = String(pickField(r, [
        // XML3 canonical end timestamp first; then the HIS PTTT detail aliases.
        "NGAY_KQ", "NGAYKQ", "THOIGIANKETTHUC", "THOIGIANKT", "TGKETTHUC",
        "NGAYKETTHUC", "KETTHUCPTTT", "THOIGIANHOANTHANH",
        "THOIGIANTRAKETQUA", "THOIGIANTRAKETQUA1", "THOIGIANTRAKETQUA2",
        "NGAYTRAKQ", "THOIGIANTRAKQ", "TGTRAKQ"
      ].map(normalizeKey)) || "").trim();
      // A recognized ventilator code is itself enough to retain the row. If one
      // timestamp is absent, the OXY panel will list it as incomplete instead of
      // silently discarding a real ventilator service.
      const isServiceRow = !hasDrugShape && Boolean(
        (serviceRowId || isVentilationRecord || isRequiredCompanionDvktRecord || isEpisodeExclusiveDvktRecord) && (serviceCode || serviceName || candidateServiceNameForVent)
      );
      if (isServiceRow) {
        const orderTimes = pickAllTimePoints(r, orderDateAliases, "Y lệnh");
        if (!orderTimes.length && orderTime) orderTimes.push({ kind: "Y lệnh", field: "NGAYMAUBENHPHAM (phiếu)", value: orderTime });
        const performedTimes = pickAllTimePoints(r, performedTimeAliases, "Thực hiện");
        // Keep the three API result-time fields separately. The DVKT panel will
        // use the single "TG trả KQ" value actually displayed by the HIS grid as
        // its canonical result time, and only surface differing API timestamps
        // when those timestamps fall outside the admission/discharge interval.
        const resultTimes = pickAllTimePoints(r, resultTimeAliases, "Kết quả API");
        const timePoints = [...orderTimes, ...performedTimes];
        const detailIds = [
          "DICHVUKHAMBENHID", "DICHVUTHUCHIENID", "KETQUACLSID",
          "PHAUTHUATTHUTHUATID", "MACT", "ID"
        ].map(name => String(pickField(r, [normalizeKey(name)]) || "").trim()).filter(Boolean);
        const matchIds = [...detailIds,
          String(pickField(r, ["MAUBENHPHAMID", "MAUBENHPHAM"].map(normalizeKey)) || "").trim()
        ].filter(Boolean);
        const key = [serviceRowId, ticketId, serviceCode,
          ...timePoints.map(t => `${t.field}:${t.value}`),
          ...resultTimes.map(t => `${t.field}:${t.value}`)].join("|");
        if (!seenDvkt.has(key)) {
          seenDvkt.add(key);
          const service = {
            key, ticketId, rowId: serviceRowId, detailIds, matchIds,
            hisCode: String(pickField(r, ["MADICHVU", "MA_DICH_VU"].map(normalizeKey)) || ventilationHisCodeInRecord || (isRequiredCompanionDvktRecord ? requiredCompanionCodeInRecord : "") || (isEpisodeExclusiveDvktRecord ? episodeExclusiveCodeInRecord : "") || "").trim(),
            bhytCode: serviceCode, name: serviceName, quantity, orderDate: orderTime,
            performedAt: performedTimes[0]?.value || "", resultAt: "",
            // XML3's ventilator interval uses NGAY_YL -> NGAY_KQ. Preserve both
            // source values explicitly for the oxygen/ventilator overlap audit.
            ventilatorStartAt: exactOrderRaw ? normalizeDateTime(exactOrderRaw) : orderTime,
            ventilatorStartSource: exactOrderRaw ? "NGAY_YL" : (orderTime ? "Thời gian phiếu (fallback)" : ""),
            ventilatorEndAt: normalizeDateTime(ventilatorEndRaw),
            ventilatorEndSource: ventilatorEndRaw ? (String(pickField(r, ["NGAY_KQ", "NGAYKQ"].map(normalizeKey)) || "").trim() ? "NGAY_KQ" : "Thời gian trả kết quả HIS (fallback NGAY_KQ)") : "",
            apiResultTimes: resultTimes, screenResultAt: "", timePoints
          };
          dvktRows.push(service);
          if (contrastServiceCodes.has(serviceCode)) {
            const contrastKey = [serviceRowId, ticketId, serviceCode].join("|");
            if (!seenContrastServices.has(contrastKey)) {
              seenContrastServices.add(contrastKey);
              contrastServices.push(service);
            }
          }
        }
      }
    }

    const finalContext = {
      ...context,
      // Preserve whether the source supplied a date-only boundary. The UI treats
      // date-only admission as 00:00 and date-only discharge as 23:59:59.
      admissionDate: admissionDate || String(context.admissionDate || ""),
      dischargeDate: dischargeDate || String(context.dischargeDate || ""),
      dateOfBirth: dateOfBirth || String(context.dateOfBirth || "")
    };
    if (dvktRows.length || medicineRows.length || contrastServices.length || contrastMedicines.length || finalContext.admissionDate || finalContext.dischargeDate) {
      window.postMessage({
        __hisTimeHelperV31: true, type: "AUDIT_DATA",
        context: finalContext, dvktRows, medicineRows, contrastServices, contrastMedicines,
        capturedAt: Date.now()
      }, "*");
    }
  }

  function extract(data, url, requestContext, queryName = "") {
    if (url && !String(url).toLowerCase().includes("restservice")) return;
    if (!data || typeof data !== "object") return;

    // Traverse/expand nested JSON-string wrappers once, then reuse this compact record
    // list for both patient metadata and service timing extraction.
    const records = collectObjects(data);
    if (!records.length) return;
    extractPatient(records, url);
    const context = requestContext || readHISContext();
    extractAuditData(records, context, queryName);
    const rows = [];
    const dedupe = new Set();

    for (const r of records) {
      const code = String(pickField(r, codeAliases) || "").trim();
      const name = String(pickField(r, nameAliases) || "").trim();
      if (!code && !name) continue;

      const start = normalizeDateTime(pickField(r, startAliases));
      const end = normalizeDateTime(pickField(r, endAliases));
      const caseKey = String(pickField(r, caseAliases) || "");
      const groupKey = String(pickField(r, groupAliases) || "");
      const rowKey = String(pickField(r, rowAliases) || "");
      const quantity = String(pickField(r, quantityAliases) || "");
      const expected = String(pickField(r, expectedAliases) || "");
      const fields = fieldMap(r);
      // Medicine rows can share MADICHVU/TENDICHVU/SOLUONG/MAUBENHPHAMID with service rows.
      // Keep them out of the legacy timing panel; their capture is handled separately above.
      const isMedicineRow = fields.has("NHAPXUATCTID") &&
        (fields.has("DUONGDUNG") || fields.has("MADUONGDUNG") || fields.has("NDHL") || fields.has("TENKHOAHOC"));
      if (isMedicineRow || isMedicinePhieuRecord(r, queryName)) continue;
      let hasTimingField = false;
      for (const alias of timingAliasSet) {
        if (fields.has(alias)) { hasTimingField = true; break; }
      }
      const specificRowKey = String(pickField(r, rowAliases.filter(alias => alias !== "ID")) || "").trim();
      const hasServiceRowContext = Boolean(specificRowKey || groupKey || quantity !== "" || expected !== "");
      if (!start && !end && !hasTimingField && !hasServiceRowContext) continue;

      const key = [rowKey, code, name, start, end, groupKey].join("|");
      if (dedupe.has(key)) continue;
      dedupe.add(key);
      rows.push({ caseKey, groupKey, rowKey: rowKey || key, serviceName: name, serviceCode: code, start, end, expected, quantity });
    }
    // A slow response for the previous patient must not land in the newly selected
    // one (same guard as extractAuditData). Without it, a xét nghiệm of the previous
    // visit could show up as Bộ mỡ/HbA1C of the next visit during QUÉT.
    const visibleKey = readHISContext().key;
    const staleResponse = Boolean(context && context.key && visibleKey && context.key !== visibleKey);
    if (rows.length && !staleResponse) {
      // Retain all airway-related rows ahead of the ordinary recent service list. On
      // long-stay cases the ventilation records can occur earlier than the last 120
      // records; slicing the tail alone dropped them before the panel could cache them.
      const isAirway = row => {
        const text = `${row && row.serviceCode || ""} ${row && row.serviceName || ""}`
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
        return /(?:^|[^A-Z0-9])PT0022(?:$|[^A-Z0-9])/.test(text) ||
          /(?:^|[^A-Z0-9])PT0034(?:$|[^A-Z0-9])/.test(text) ||
          text.includes("01.0128.0209") || text.includes("01.0132.0209") ||
          text.includes("THONG KHI NHAN TAO") || text.includes("HUT DOM");
      };
      const airwayRows = rows.filter(isAirway).slice(-800);
      const airwayKeys = new Set(airwayRows.map(row => [row.rowKey, row.serviceCode, row.serviceName, row.start, row.end, row.groupKey].join("|")));
      const ordinaryRows = rows.filter(row => !isAirway(row)).slice(-120);
      const outputRows = [];
      const seenOutput = new Set();
      for (const row of [...airwayRows, ...ordinaryRows]) {
        const key = [row.rowKey, row.serviceCode, row.serviceName, row.start, row.end, row.groupKey].join("|");
        if (seenOutput.has(key)) continue;
        seenOutput.add(key);
        outputRows.push(row);
      }
      window.postMessage({__hisTimeHelperV31: true, type: "SERVICES", rows: outputRows}, "*");
    }
  }

  // Number of HIS RestService calls still waiting for a response; used to know
  // when HIS has finished loading after the helper opens a phiếu.
  let hthRestInFlight = 0;
  let hthRestLastActivity = 0;

  const originalFetch = window.fetch;
  const isRestServiceUrl = url => String(url || "").toLowerCase().includes("restservice");
  if (typeof originalFetch === "function") {
    window.fetch = function(...args) {
      let requestUrl = "";
      try {
        const req = args[0];
        requestUrl = req && typeof req === "object" ? req.url : req;
      } catch (_) {}
      // Preserve the native fetch path for unrelated calls and background HIS tabs.
      if (!isRestServiceUrl(requestUrl) || document.visibilityState !== "visible") {
        return originalFetch.apply(this, args);
      }
      const requestContext = readHISContext();
      const requestBody = args[1] && typeof args[1].body === "string" ? args[1].body : "";
      hthRestInFlight++;
      return originalFetch.apply(this, args).then(res => {
        try {
          // A tab may have become backgrounded while the request was in flight.
          // Do not clone/read large bodies when the user is working elsewhere.
          if (document.visibilityState !== "visible") return res;
          res.clone().text().then(text => {
            if (document.visibilityState !== "visible") return;
            hthInspectPhieuList(requestUrl, requestBody, text, requestContext);
            queueResponseText(text, requestUrl, requestContext, hisQueryName(requestUrl, requestBody));
          }).catch(() => {});
        } catch (_) {}
        return res;
      }).finally(() => { hthRestInFlight = Math.max(0, hthRestInFlight - 1); hthRestLastActivity = Date.now(); });
    };
  }

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this.__hthUrl = String(url || "");
    return originalOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function(...args) {
    const url = String(this.__hthUrl || "");
    // Do not install a load listener on every ordinary HIS XHR. Only RestService
    // calls from the visible tab are candidates for helper capture.
    if (!isRestServiceUrl(url) || document.visibilityState !== "visible") {
      return originalSend.apply(this, args);
    }
    const requestContext = readHISContext();
    const requestBody = typeof args[0] === "string" ? args[0] : "";
    hthRestInFlight++;
    this.addEventListener("loadend", () => {
      hthRestInFlight = Math.max(0, hthRestInFlight - 1);
      hthRestLastActivity = Date.now();
    }, {once: true});
    this.addEventListener("load", function() {
      try {
        if (document.visibilityState !== "visible") return;
        hthInspectPhieuList(this.__hthUrl, requestBody, this.responseText, requestContext);
        queueResponseText(this.responseText, this.__hthUrl, requestContext, hisQueryName(this.__hthUrl, requestBody));
      } catch (_) {}
    }, {once: true});
    return originalSend.apply(this, args);
  };

  // ---------------------------------------------------------------------------
  // TỰ MỞ TẤT CẢ PHIẾU. Selecting a patient only loads the phiếu list
  // (e.g. NT.024.DSPHIEUCLS); the DVKT rows load only when each phiếu is
  // clicked. When a phiếu list arrives, select every phiếu in its grid one by
  // one through jqGrid, waiting for HIS to finish loading each, so the normal
  // capture above collects DVKT/medicine data for all phiếu without clicks.
  // ---------------------------------------------------------------------------
  const hthWalkStorageKey = "hthAutoWalkPhieu";
  let hthAutoWalk = true;
  try { hthAutoWalk = window.localStorage.getItem(hthWalkStorageKey) !== "0"; } catch (_) {}
  const hthWalkQueue = [];
  const hthWalkDone = new Set();
  const hthPhieuListsByKey = new Map();
  let hthWalkRunning = null;
  let hthWalkTable = null;
  // During a QUÉT (scan all patients) run, also walk lists whose tab is hidden.
  let hthScanMode = false;
  // Phiếu lists already opened for the visit QUÉT is on. HIS sends the same list
  // again when the patient is selected, when the walk is re-requested and when
  // the tab is opened; each list must be opened only once per visit.
  const hthScanWalked = new Set();
  // Which list kinds QUÉT opens, from the scan panel's "Tự mở" buttons:
  // Xét nghiệm -> phiếu DVKT (DSPHIEU...), Thuốc -> đơn thuốc (DSTHUOC...).
  let hthScanKinds = { dvkt: true, drug: true };
  const hthScanKindOn = kind => /thuốc/i.test(String(kind || "")) ? hthScanKinds.drug : hthScanKinds.dvkt;
  function hthScanEnqueue(job) {
    if (!hthScanKindOn(job.kind)) return false;
    if (hthScanWalked.has(job.signature)) return false;
    hthScanWalked.add(job.signature);
    hthEnqueueWalk(job, true);
    return true;
  }
  let hthWalkAbort = "";
  const hthSleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const hthEmit = payload => window.postMessage({ __hthWalkEvent: true, ...payload }, "*");

  function hthRequestText(url, body) {
    let text = String(url || "") + " " + String(body || "");
    try { text = decodeURIComponent(text.replace(/\+/g, " ")); } catch (_) {}
    return text;
  }
  function hthInspectPhieuList(url, body, responseText, requestContext) {
    try {
      // Phiếu lists whose detail loads only when a row is clicked:
      // NT.024.DSPHIEUCLS (DVKT/CLS phiếu), NT.024.DSTHUOCVT (đơn thuốc/vật tư).
      if (!/DSPHIEU|DSTHUOC/i.test(hthRequestText(url, body))) return;
      const listKind = /DSTHUOC/i.test(hthRequestText(url, body)) ? "đơn thuốc" : "phiếu DVKT";
      let data = null;
      try { data = JSON.parse(responseText || "null"); } catch (_) {}
      const rows = Array.isArray(data && data.rows) ? data.rows : (Array.isArray(data) ? data : null);
      // An empty list (tab with no phiếu): tell QUÉT at once so it does not wait
      // for a list that will never come.
      if (rows && !rows.length) {
        hthEmit({ type: "list", key: (requestContext && requestContext.key) || readHISContext().key || "", kind: listKind, total: 0, empty: true });
        return;
      }
      if (!rows || !responseText || !/MAUBENHPHAMID/i.test(responseText)) return;
      const phieu = [];
      const seen = new Set();
      for (const r of rows) {
        const id = String(r && (r.MAUBENHPHAMID || r.IDPHIEU) || "").trim();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        const altId = String(r.IDPHIEU || "").trim();
        phieu.push({ id, altId: altId && altId !== id ? altId : "", soPhieu: String(r.SOPHIEU || "").trim(), barcode: String(r.BARCODE || "").trim() });
      }
      if (!phieu.length) return;
      const key = (requestContext && requestContext.key) || readHISContext().key || "";
      if (/DSTHUOC/i.test(hthRequestText(url, body))) {
        for (const p of phieu) { medicinePhieuIds.add(p.id); if (p.altId) medicinePhieuIds.add(p.altId); }
        while (medicinePhieuIds.size > 5000) medicinePhieuIds.delete(medicinePhieuIds.values().next().value);
      }
      const kind = /DSTHUOC/i.test(hthRequestText(url, body)) ? "đơn thuốc" : "phiếu DVKT";
      const job = { key, phieu, kind, signature: key + "#" + phieu.map(p => p.id).sort().join(",") };
      if (!hthPhieuListsByKey.has(key)) hthPhieuListsByKey.set(key, new Map());
      hthPhieuListsByKey.get(key).set(job.signature, job);
      while (hthPhieuListsByKey.size > 20) hthPhieuListsByKey.delete(hthPhieuListsByKey.keys().next().value);
      hthEmit({ type: "list", key, kind, total: phieu.length,
        repeat: hthScanMode && hthScanWalked.has(job.signature), skipped: hthScanMode && !hthScanKindOn(kind) });
      // Auto-open only during QUÉT; selecting a patient by hand never starts it
      // (the list is still remembered for the manual "Mở tất cả phiếu" button).
      // The scan clears each visit's data before selecting it, so a list opened
      // earlier must be opened again (force) or its DVKT/thuốc would be lost.
      // QUÉT always opens every phiếu of the tabs it opens (the scan panel picks
      // the tabs), otherwise e.g. Bộ mỡ tests in XN phiếu are never loaded.
      if (hthScanMode) hthScanEnqueue(job);
    } catch (_) {}
  }
  function hthEnqueueWalk(job, force) {
    if (!force && hthWalkDone.has(job.signature)) return;
    if (hthWalkQueue.some(j => j.signature === job.signature)) return;
    if (hthWalkRunning && hthWalkRunning.signature === job.signature) return;
    // A list for another patient makes the remaining queued/running work stale.
    for (let i = hthWalkQueue.length - 1; i >= 0; i--) if (hthWalkQueue[i].key !== job.key) hthWalkQueue.splice(i, 1);
    if (hthWalkRunning && hthWalkRunning.key && hthWalkRunning.key !== job.key) hthWalkAbort = "Đã chuyển sang bệnh nhân khác";
    hthWalkQueue.push(job);
    hthRunWalkQueue();
  }
  function hthGridVisible(table) {
    const box = table && (table.closest(".ui-jqgrid") || table);
    return !!(box && document.contains(box) && box.getClientRects().length &&
      getComputedStyle(box).visibility !== "hidden");
  }
  // Process queued lists one at a time. A list is only walked while its grid
  // is visible (the user opened that tab), except during a QUÉT scan. Hidden
  // lists wait; lists of another patient are dropped.
  async function hthRunWalkQueue() {
    if (hthWalkRunning) return;
    hthWalkRunning = { key: "", signature: "" };
    try {
      while (hthWalkQueue.length) {
        const currentKey = readHISContext().key;
        for (let i = hthWalkQueue.length - 1; i >= 0; i--) {
          if (currentKey && hthWalkQueue[i].key !== currentKey) hthWalkQueue.splice(i, 1);
        }
        let picked = -1, found = null;
        for (let i = 0; i < hthWalkQueue.length; i++) {
          const job = hthWalkQueue[i];
          const grid = hthFindPhieuGrid(job);
          if (grid) job.lastSeenAt = Date.now();
          else if (!job.firstTryAt) job.firstTryAt = Date.now();
          if (grid && (hthScanMode || hthGridVisible(grid.table))) { picked = i; found = grid; break; }
        }
        if (picked < 0) {
          // Give up on lists whose grid never appeared within 10 s.
          for (let i = hthWalkQueue.length - 1; i >= 0; i--) {
            const job = hthWalkQueue[i];
            if (!job.lastSeenAt && job.firstTryAt && Date.now() - job.firstTryAt > 10000) hthWalkQueue.splice(i, 1);
          }
          // Poll quickly while a just-received list waits for HIS to draw its grid.
          await hthSleep(hthWalkQueue.some(j => !j.lastSeenAt) ? 150 : 600);
          continue;
        }
        const job = hthWalkQueue.splice(picked, 1)[0];
        hthWalkRunning = job;
        hthWalkAbort = "";
        let walkFailed = false;
        try { await hthWalkJob(job, found); } catch (err) { walkFailed = true; hthEmit({ type: "done", key: job.key, kind: job.kind, ok: false, error: String(err && err.message || err) }); }
        // An interrupted walk may be retried when HIS sends the list again.
        if (walkFailed || hthWalkAbort) hthScanWalked.delete(job.signature);
        hthWalkTable = null;
        hthWalkDone.add(job.signature);
        if (hthWalkDone.size > 300) hthWalkDone.delete(hthWalkDone.values().next().value);
        hthWalkRunning = { key: "", signature: "" };
      }
    } finally {
      hthWalkRunning = null;
    }
  }
  // Wait until HIS has no RestService call in flight and the helper's parse
  // queue is empty for a short continuous period.
  // startDelay lets HIS issue the request(s) a click triggers before idleness is
  // tested; quietMs catches a follow-up request HIS chains after a response.
  async function hthWaitHisIdle(maxMs = 15000, startDelay = 120, quietMs = 300) {
    const t0 = Date.now();
    if (startDelay) await hthSleep(startDelay);
    let quietSince = 0;
    while (Date.now() - t0 < maxMs && !hthWalkAbort) {
      // A few queued payloads may finish parsing while the next phiếu loads; the
      // queue keeps them (it only drops data above 24 pending payloads).
      const idle = hthRestInFlight === 0 && pendingResponseTexts.length <= 2;
      if (idle) {
        if (!quietSince) quietSince = Date.now();
        if (Date.now() - quietSince >= quietMs) return;
      } else quietSince = 0;
      await hthSleep(40);
    }
  }
  // onlyTableId: look only at that grid (used while walking, so the walk stays on
  // the phiếu list it started on).
  function hthFindPhieuGrid(job, onlyTableId) {
    const jq = window.jQuery || window.$;
    if (!jq || !jq.fn || !jq.fn.jqGrid) return null;
    const ids = new Set(job.phieu.flatMap(p => [p.id, p.altId]).filter(Boolean));
    const soPhieu = new Set(job.phieu.map(p => p.soPhieu).filter(Boolean));
    // Prefer a grid whose rows match by phiếu ID; a phiếu number can also appear
    // as a reference column in another grid, so text matches only count when no
    // grid matches by ID. Score by the number of DIFFERENT phiếu matched: the
    // detail grid under the list ("Danh sách dịch vụ chỉ định") also carries
    // MAUBENHPHAMID on every line, so one opened phiếu with 9 tests must not
    // outrank the list of 7 phiếu.
    const tables = onlyTableId
      ? [document.getElementById(onlyTableId)].filter(Boolean)
      : Array.from(document.querySelectorAll("table.ui-jqgrid-btable"));
    let best = null;
    for (const table of tables) {
      if (table.id === "grdLS") continue;
      const grid = jq(table);
      const idRows = [];
      const textRows = [];
      const idPhieu = new Set();
      const textPhieu = new Set();
      for (const tr of table.querySelectorAll("tr.jqgrow")) {
        let rowData = {};
        try { rowData = grid.jqGrid("getRowData", tr.id) || {}; } catch (_) {}
        const rowIds = [tr.id, rowData.MAUBENHPHAMID, rowData.IDPHIEU].map(v => String(v || "").trim()).filter(Boolean);
        const hitId = rowIds.find(v => ids.has(v));
        if (hitId) { idRows.push(tr); idPhieu.add(hitId); continue; }
        const cellTexts = Array.from(tr.cells).map(td => String(td.textContent || "").trim());
        const hitText = cellTexts.find(t => soPhieu.has(t));
        if (hitText) { textRows.push(tr); textPhieu.add(hitText); }
      }
      const rows = idRows.length ? idRows : textRows;
      const score = idPhieu.size * 1000000 + textPhieu.size * 1000 - rows.length;
      if (rows.length && (!best || score > best.score)) best = { table, grid, rows, score };
    }
    return best;
  }
  function hthSelectGridRow(grid, tr) {
    const jq = window.jQuery || window.$;
    try { if (grid.jqGrid("getGridParam", "multiselect")) grid.jqGrid("resetSelection"); } catch (_) {}
    const cell = Array.from(tr.cells).find(td => !/_cb$|_rn$/.test(td.getAttribute("aria-describedby") || "")) || tr.cells[0];
    if (cell) jq(cell).trigger("click");
    if (String(grid.jqGrid("getGridParam", "selrow") || "") !== String(tr.id)) grid.jqGrid("setSelection", tr.id, true);
  }
  async function hthWalkJob(job, found) {
    let { grid, table } = found;
    hthWalkTable = table;
    let previous = "";
    try { previous = String(grid.jqGrid("getGridParam", "selrow") || ""); } catch (_) {}
    // HIS can redraw the phiếu grid after a phiếu is clicked, which replaces its
    // <tr> elements. Holding on to the rows found at the start then skipped every
    // row redrawn after that (e.g. 4 of 5 xét nghiệm opened). Track rows by id and
    // look the grid up again before each click, until no unopened row is left.
    const openedIds = new Set();
    let total = Math.max(found.rows.length, job.phieu.length);
    let lastId = "";
    hthEmit({ type: "start", key: job.key, kind: job.kind, total });
    for (let guard = 0; guard < 500; guard++) {
      if (hthWalkAbort) break;
      if (readHISContext().key !== job.key) { hthWalkAbort = "Đã chuyển sang bệnh nhân khác"; break; }
      // Before clicking: only wait if HIS is still busy (no fixed delay).
      await hthWaitHisIdle(4000, 0, 0);
      if (hthWalkAbort) break;
      // Stay on the phiếu list the walk started on; never drift to the detail grid.
      const current = hthFindPhieuGrid(job, table.id) || (table.id ? null : hthFindPhieuGrid(job));
      if (!current) break;
      grid = current.grid; table = current.table; hthWalkTable = table;
      total = Math.max(total, current.rows.length);
      const tr = current.rows.find(row => row.id && !openedIds.has(row.id));
      if (!tr) break;
      openedIds.add(tr.id);
      lastId = tr.id;
      hthSelectGridRow(grid, tr);
      await hthWaitHisIdle();
      hthEmit({ type: "progress", key: job.key, kind: job.kind, done: openedIds.size, total });
    }
    const opened = openedIds.size;
    // Restore the user's earlier selection only if that row is still in this list.
    if (!hthWalkAbort && previous && previous !== lastId &&
        Array.from(table.querySelectorAll("tr.jqgrow")).some(tr => tr.id === previous)) {
      try { grid.jqGrid("setSelection", previous, true); } catch (_) {}
    }
    hthEmit({ type: "done", key: job.key, kind: job.kind, ok: !hthWalkAbort, opened, total, error: hthWalkAbort });
  }
  // Stop only when the user clicks inside the very list being walked (they are
  // choosing a phiếu themselves). Tabs, search boxes and other HIS controls do
  // not interrupt; switching patient is detected through the HIS context key.
  document.addEventListener("mousedown", event => {
    if (!event.isTrusted || !hthWalkTable) return;
    const box = hthWalkTable.closest(".ui-jqgrid") || hthWalkTable;
    if (!box.contains(event.target)) return;
    hthWalkAbort = "Đã dừng vì bạn chọn phiếu trong danh sách";
  }, true);

  // Bridge for content.js (isolated world): patient selection through jqGrid,
  // phiếu walking, and the auto-walk setting.
  window.addEventListener("message", event => {
    if (event.source !== window || !event.data || event.data.__hthScanRequest !== true) return;
    const { id, action, rowId } = event.data;
    const reply = payload => window.postMessage({ __hthScanResponse: true, id, ...payload }, "*");
    try {
      if (action === "setAutoWalk") {
        hthAutoWalk = !!event.data.value;
        try { window.localStorage.setItem(hthWalkStorageKey, hthAutoWalk ? "1" : "0"); } catch (_) {}
        return reply({ ok: true, value: hthAutoWalk });
      }
      if (action === "walkPhieu") {
        const key = readHISContext().key;
        const jobs = Array.from((hthPhieuListsByKey.get(key) || new Map()).values());
        if (!jobs.length) return reply({ ok: false, error: "Chưa có danh sách phiếu của bệnh nhân đang chọn" });
        hthWalkAbort = "";
        for (const job of jobs) { if (hthScanMode) hthScanEnqueue(job); else hthEnqueueWalk(job, true); }
        return reply({ ok: true, lists: jobs.length });
      }
      if (action === "stopWalk") {
        hthWalkAbort = "Đã dừng"; hthWalkQueue.length = 0;
        return reply({ ok: true });
      }
      if (action === "scanVisitStart") {
        hthScanWalked.clear();
        return reply({ ok: true });
      }
      if (action === "setScanMode") {
        hthScanMode = !!event.data.value;
        hthScanWalked.clear();
        const kinds = event.data.kinds || {};
        hthScanKinds = { dvkt: kinds.dvkt !== false, drug: kinds.drug !== false };
        // Scan finished or stopped: do not keep opening phiếu on our own.
        if (!hthScanMode) {
          hthWalkQueue.length = 0;
          if (hthWalkRunning && hthWalkRunning.signature) hthWalkAbort = "Đã dừng quét";
        }
        return reply({ ok: true });
      }
      if (action === "walkStatus") return reply({ ok: true, running: !!hthWalkRunning, queued: hthWalkQueue.length });
      const jq = window.jQuery || window.$;
      if (!jq || !jq.fn || !jq.fn.jqGrid) return reply({ ok: false, error: "Trang HIS không có jqGrid" });
      const grid = jq("#grdLS");
      if (!grid.length) return reply({ ok: false, error: "Không thấy lưới #grdLS" });
      // QUÉT theo BHYT: how many rows the search found vs. shown on this page,
      // and a bigger page size so every visit of the person is on one page.
      if (action === "gridInfo") {
        const p = grid.jqGrid("getGridParam") || {};
        return reply({ ok: true, records: Number(p.records) || 0, reccount: Number(p.reccount) || 0,
          rowNum: Number(p.rowNum) || 0, page: Number(p.page) || 0, lastpage: Number(p.lastpage) || 0 });
      }
      if (action === "gridSetRowNum") {
        grid.jqGrid("setGridParam", { rowNum: Number(event.data.rowNum) || 500, page: 1 });
        if (event.data.reload) grid.trigger("reloadGrid");
        return reply({ ok: true });
      }
      if (action !== "select") return reply({ ok: false, error: "unknown action" });
      const tr = grid.find("tr.jqgrow").filter((_, row) => row.id === String(rowId))[0];
      if (!tr) return reply({ ok: false, error: "Không thấy dòng " + rowId });
      const cell = jq(tr).find("td[aria-describedby$='_TENBENHNHAN']")[0] ||
        jq(tr).find("td").filter((_, td) => !/_cb$|_rn$/.test(td.getAttribute("aria-describedby") || ""))[0];
      if (cell) jq(cell).trigger("click");
      if (String(grid.jqGrid("getGridParam", "selrow")) !== String(rowId)) {
        grid.jqGrid("setSelection", rowId, true);
      }
      reply({ ok: true, selrow: String(grid.jqGrid("getGridParam", "selrow") || "") });
    } catch (err) {
      reply({ ok: false, error: String(err && err.message || err) });
    }
  });
})();
