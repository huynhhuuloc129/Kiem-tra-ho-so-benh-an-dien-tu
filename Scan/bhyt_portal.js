(() => {
  if (window.__hisTimeHelperBHYTPortalV32) return;
  window.__hisTimeHelperBHYTPortalV32 = true;

  const normalize = value => String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]/g, "");

  let activeLookupTimer = null;
  let lookupSequence = 0;

  // QUÉT runs lookups while this portal tab sits in the background, where
  // Chrome slows setInterval to once a minute after 5 minutes. Timers inside a
  // Worker are not throttled, so poll through one (setInterval as fallback).
  // Returns a handle for clearPoll(). If the page blocks the Worker (CSP), the
  // running polls move to setInterval.
  let pollWorker = null;
  let pollSeq = 0;
  const activePolls = new Map();
  function pollFallback(handle) {
    if (handle.interval === undefined) handle.interval = setInterval(handle.fn, handle.ms);
  }
  try {
    const src = "const t={};onmessage=e=>{const d=e.data;if(d.stop){clearInterval(t[d.id]);delete t[d.id];}else{t[d.id]=setInterval(()=>postMessage(d.id),d.ms);}}";
    pollWorker = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
    pollWorker.onmessage = e => { const h = activePolls.get(e.data); if (h && h.interval === undefined) h.fn(); };
    pollWorker.onerror = () => { pollWorker = null; for (const h of activePolls.values()) pollFallback(h); };
  } catch (_) { pollWorker = null; }
  function startPoll(fn, ms) {
    const handle = { id: ++pollSeq, fn, ms, interval: undefined };
    activePolls.set(handle.id, handle);
    let posted = false;
    if (pollWorker) {
      try { pollWorker.postMessage({ id: handle.id, ms }); posted = true; } catch (_) {}
    }
    if (!posted) pollFallback(handle);
    return handle;
  }
  function clearPoll(handle) {
    if (!handle) return;
    activePolls.delete(handle.id);
    if (handle.interval !== undefined) clearInterval(handle.interval);
    try { pollWorker && pollWorker.postMessage({ id: handle.id, stop: true }); } catch (_) {}
  }

  function dateOnly(value) {
    const s = String(value || "").trim();
    let m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
    if (m) return `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}/${m[3]}`;
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return `${String(m[3]).padStart(2, "0")}/${String(m[2]).padStart(2, "0")}/${m[1]}`;
    return s.split(/[ T]/)[0];
  }

  function visible(el) {
    if (!el || !el.getClientRects().length) return false;
    const s = getComputedStyle(el);
    return s.display !== "none" && s.visibility !== "hidden" && s.opacity !== "0";
  }

  function isEditable(el) {
    if (!el || !visible(el) || el.disabled || el.readOnly) return false;
    const type = String(el.type || "text").toLowerCase();
    return ["text", "search", "", "tel", "date"].includes(type);
  }

  function textOf(el) {
    return String(el && (el.innerText || el.textContent) || "").replace(/\s+/g, " ").trim();
  }

  function allTextFields() {
    return Array.from(document.querySelectorAll("input, textarea")).filter(isEditable);
  }

  function fieldByAttributes(pattern) {
    return allTextFields().find(el => pattern.test(normalize([
      el.id, el.name, el.placeholder, el.getAttribute("aria-label"), el.title
    ].join(" "))));
  }

  function fieldNearLabel(pattern) {
    const candidates = Array.from(document.querySelectorAll("label, td, th, span, div, p"))
      .filter(el => visible(el) && el.children.length <= 2 && pattern.test(normalize(textOf(el))) && textOf(el).length < 55)
      .sort((a, b) => textOf(a).length - textOf(b).length);
    for (const label of candidates) {
      let parent = label;
      for (let depth = 0; depth < 5 && parent; depth++, parent = parent.parentElement) {
        const fields = Array.from(parent.querySelectorAll("input, textarea")).filter(isEditable);
        if (fields.length === 1) return fields[0];
      }
    }
    return null;
  }

  function findFields() {
    const all = allTextFields();
    const qr = fieldByAttributes(/maqr|qr/);
    const card = fieldByAttributes(/mathe|cccd|bhyt|thebhyt/) || fieldNearLabel(/mathe|cccd/);
    const name = fieldByAttributes(/hoten|tenbenhnhan|tenbn|fullname/) || fieldNearLabel(/hoten/);
    const dob = fieldByAttributes(/ngaysinh|dob|birth/) || fieldNearLabel(/ngaysinh/);

    // The currently deployed portal lays the fields out in this order:
    // Mã QR, Mã thẻ/CCCD, Họ tên, Ngày sinh.
    // Positional fallback is restricted to the visible editable inputs of this page.
    const fallback = all.length >= 4 ? { qr: all[0], card: all[1], name: all[2], dob: all[3] } : {};
    return { qr: qr || fallback.qr, card: card || fallback.card, name: name || fallback.name, dob: dob || fallback.dob };
  }

  function setValue(el, value) {
    if (!el) return false;
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set;
    if (setter) setter.call(el, String(value || ""));
    else el.value = String(value || "");
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
    return true;
  }

  function findSearchButton() {
    // Prefer a real button/control when the portal exposes one.
    const clickableSelector = "button, input[type='button'], input[type='submit'], input[type='image'], [role='button'], a, .btn, [onclick], [tabindex]";
    const controls = Array.from(document.querySelectorAll(clickableSelector)).filter(visible);
    const isSearchAction = el => {
      const vals = [el.value, textOf(el), el.getAttribute("aria-label"), el.title, el.id, el.name].map(normalize);
      return vals.some(v => ["tracuu", "btntracuu", "tracuubtn", "tracuukcb"].includes(v));
    };
    const exact = controls.filter(isSearchAction);
    if (exact.length) {
      exact.sort((a, b) => {
        const score = el => (normalize(textOf(el)) === "tracuu" ? 0 : 10)
          + (el.matches("button, input, a, .btn, [role='button'], [onclick]") ? 0 : 2)
          + (el.disabled ? 100 : 0);
        return score(a) - score(b);
      });
      if (!exact[0].disabled) return exact[0];
    }

    // Some portal releases bind click handlers with addEventListener on a
    // wrapper that has no onclick attribute and no standard button class.
    const labels = Array.from(document.querySelectorAll("body *"))
      .filter(el => visible(el) && normalize(textOf(el)) === "tracuu")
      .sort((a, b) => a.children.length - b.children.length || textOf(a).length - textOf(b).length);
    for (const node of labels) {
      let cur = node;
      for (let depth = 0; depth < 10 && cur; depth++, cur = cur.parentElement) {
        if (!visible(cur)) continue;
        const style = getComputedStyle(cur);
        const classId = normalize([cur.className, cur.id, cur.getAttribute("role"), cur.getAttribute("aria-label")].join(" "));
        const looksClickable = cur.matches(clickableSelector)
          || style.cursor === "pointer"
          || /button|btn|tracuu|search|timkiem/.test(classId);
        if (looksClickable && !cur.disabled) return cur;
      }
    }

    // Clicking the exact visible label also bubbles to a parent listener
    // when the portal uses a custom div/span instead of a native button.
    return labels.find(el => !el.closest("#his-time-helper, #his-bhyt-result")) || null;
  }

  function extractCanonicalNotice(sourceText, requestedCardNorm) {
    const source = String(sourceText || "").normalize("NFC").replace(/\s+/g, " ").trim();
    if (!source || !requestedCardNorm) return "";
    const starts = [];
    const noticeStart = /thông\s*báo\s*:/ig;
    let match;
    while ((match = noticeStart.exec(source)) !== null) starts.push(match.index);
    if (!starts.length) return "";

    const sectionStops = [
      /lịch\s*sử\s*khám\s*chữa\s*bệnh/i,
      /thông\s*tin\s*cùng\s*chi\s*trả/i,
      /thông\s*tin\s*kiểm\s*tra\s*thẻ/i,
      /đang\s*lấy\s*thông\s*tin/i,
      /quản\s*lý\s*thông\s*tuyến/i
    ];
    const statusPattern = /thẻ\s+còn\s+giá\s+trị\s+sử\s+dụng|thẻ\s+(?:đã\s+)?hết\s+(?:giá\s+trị|hạn)|không\s+tìm\s+thấy\s+thẻ|không\s+tồn\s+tại|chủ\s+thẻ\s+đã\s+được\s+cấp\s+mã\s+thẻ\s+mới/i;
    const valid = [];
    for (const offset of starts) {
      let segment = source.slice(offset);
      let endAt = segment.length;
      for (const stop of sectionStops) {
        const sm = stop.exec(segment);
        if (sm && sm.index > 24 && sm.index < endAt) endAt = sm.index;
      }
      // A second independent notice in page history must not be merged into the
      // notice for the current query.
      const nextNotice = /thông\s*báo\s*:/ig;
      nextNotice.lastIndex = 1;
      const nm = nextNotice.exec(segment);
      if (nm && nm.index > 40 && nm.index < endAt) endAt = nm.index;
      segment = segment.slice(0, endAt).trim();
      if (!segment || segment.length > 1900) continue;
      const norm = normalize(segment);
      if (!norm.includes(requestedCardNorm) || !statusPattern.test(segment)) continue;
      // Avoid accepting portal chrome such as "Họ tên: Ngày sinh: Thời gian:"
      // as the result. The canonical segment must explicitly report the queried card.
      if (!/(?:mã\s*thẻ|ma\s*the)\s*[:：]?\s*[A-Z0-9]{8,20}/i.test(segment)) continue;
      valid.push({ text: segment, sourceLength: source.length, offset });
    }
    valid.sort((a, b) => a.text.length - b.text.length || a.offset - b.offset);
    return valid.length ? valid[0].text : "";
  }

  function getNotification(requestedPatient) {
    // Read only the actual visible notification box when possible. Do not choose
    // document.body or a container that also includes search-form labels/history,
    // because that caused "Họ tên cổng" to become "Ngày sinh/Thời gian..." and
    // could leak an old KV/K value into a fresh lookup.
    const targetCardNorm = normalize(requestedPatient && requestedPatient.card || "");
    if (!targetCardNorm) return "";
    // This runs every poll while the portal is answering. innerText and style
    // checks force a layout on the portal's own thread and slow its reply, so
    // first check the cheap textContent for the card number: until it is on the
    // page (or in an element), there is nothing to read there.
    const mentionsCard = el => String(el && el.textContent || "").toLowerCase().replace(/[^a-z0-9]/g, "").includes(targetCardNorm);
    if (!mentionsCard(document.body)) return "";
    const helperSelector = "#his-time-helper, #his-bhyt-result, #his-bhyt-helper-trigger";
    const isVisible = el => {
      if (!el || !el.getClientRects().length) return false;
      const style = getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
    };
    const cleanCandidate = el => {
      if (!mentionsCard(el) || !isVisible(el) || el.closest(helperSelector)) return null;
      const txt = String(el.innerText || el.textContent || "").normalize("NFC").replace(/\s+/g, " ").trim();
      if (!txt || txt.length > 9000) return null;
      const notice = extractCanonicalNotice(txt, targetCardNorm);
      if (!notice) return null;
      return { notice, sourceLength: txt.length, tag: el.tagName || "" };
    };

    // The portal renders the blue THÔNG BÁO box as a fieldset in the current UI.
    // Check these small, semantic containers first. This is both more accurate and
    // lighter than scanning every element on the page on every polling tick.
    const primarySelector = "fieldset, [role='alert'], .alert, [id*='thongbao' i], [class*='thongbao' i], [id*='notification' i], [class*='notification' i]";
    const primary = [];
    for (const el of document.querySelectorAll(primarySelector)) {
      const candidate = cleanCandidate(el);
      if (candidate) primary.push(candidate);
    }
    if (primary.length) {
      primary.sort((a, b) => a.sourceLength - b.sourceLength || a.notice.length - b.notice.length);
      return primary[0].notice;
    }

    // Fallback for older portal layouts without a semantic fieldset/alert.
    // Exclude body and form/table containers to prevent mixed page/history text.
    const fallback = [];
    for (const el of document.querySelectorAll("div, p, span")) {
      if (!mentionsCard(el) || el.closest("form, table, #his-time-helper, #his-bhyt-result, #his-bhyt-helper-trigger")) continue;
      const txt = String(el.innerText || "").trim();
      if (txt.length < 35 || txt.length > 2200) continue;
      const candidate = cleanCandidate(el);
      if (candidate) fallback.push(candidate);
    }
    fallback.sort((a, b) => a.sourceLength - b.sourceLength || a.notice.length - b.notice.length);
    return fallback.length ? fallback[0].notice : "";
  }

  function parseCardValidity(text) {
    const raw = String(text || "");
    const m = raw.match(/(?:hạn\s*thẻ|han\s*the|thời\s*hạn\s*thẻ|thoi\s*han\s*the)\s*[:：]?\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})\s*(?:-|–|—|đến|den)\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})/i);
    const parse = value => {
      const dm = String(value || "").match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
      if (!dm) return null;
      const d = new Date(Number(dm[3]), Number(dm[2]) - 1, Number(dm[1]));
      return Number.isNaN(d.getTime()) ? null : d;
    };
    const format = d => d ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}` : "";
    if (m) {
      const endDate = parse(m[2]);
      const startDate = parse(m[1]);
      if (endDate) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const endDay = new Date(endDate); endDay.setHours(0, 0, 0, 0);
        const daysRemaining = Math.round((endDay.getTime() - today.getTime()) / 86400000);
        let expiryStatus = "Còn hạn";
        let expiryMessage = `Còn hạn — còn ${daysRemaining} ngày`;
        if (daysRemaining < 0) {
          expiryStatus = "expired";
          expiryMessage = `ĐÃ HẾT HẠN ${Math.abs(daysRemaining)} NGÀY — CẦN KIỂM TRA GIA HẠN`;
        } else if (daysRemaining === 0) {
          expiryStatus = "today";
          expiryMessage = "HẠN THẺ ĐẾN HÔM NAY — CẦN KIỂM TRA GIA HẠN";
        } else if (daysRemaining <= 30) {
          expiryStatus = "soon";
          expiryMessage = `SẮP HẾT HẠN — CÒN ${daysRemaining} NGÀY (TRONG 30 NGÀY TỚI)`;
        }
        return { cardStart: format(startDate), cardExpiry: format(endDate), daysRemaining, expiryStatus, expiryMessage };
      }
    }
    const n = normalize(raw);
    if (/thehetgiatri|thehethan|dah het han/.test(n)) {
      return { cardStart: "", cardExpiry: "", daysRemaining: null, expiryStatus: "expired", expiryMessage: "CỔNG BÁO THẺ HẾT GIÁ TRỊ — CẦN KIỂM TRA GIA HẠN" };
    }
    if (/thesaphethan|saphethan/.test(n)) {
      return { cardStart: "", cardExpiry: "", daysRemaining: null, expiryStatus: "soon", expiryMessage: "CỔNG BÁO THẺ SẮP HẾT HẠN — KIỂM TRA THỜI HẠN/GIA HẠN" };
    }
    return { cardStart: "", cardExpiry: "", daysRemaining: null, expiryStatus: "unknown", expiryMessage: "Chưa đọc được ngày hết hạn từ thông báo cổng" };
  }

  function resultSnapshot(requestedPatient) {
    // Parse fields only from the notification that belongs to the requested card.
    // Do not append document.body: hidden/stale text can contain a previous patient's KV.
    const notification = getNotification(requestedPatient);
    const allResultText = String(notification || "").normalize("NFC").replace(/\s+/g, " ").trim();
    const kvMatch = allResultText.match(/\bKV(?:\s*\/\s*K)?\s*[:：]\s*([A-Z0-9-]{1,12})/i);
    // The portal may provide a full DOB or only the birth year. Capture both
    // without confusing a year-only value with a missing date.
    const dobMatch = allResultText.match(/(?:ngày\s*sinh|ngay\s*sinh|năm\s*sinh|nam\s*sinh)\s*[:：]\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{4}|\d{4}-\d{1,2}-\d{1,2}|\d{4})(?!\d)/i);
    // Capture the name up to the next comma/semicolon. Some portal versions insert
    // Unicode combining marks in labels; NFC normalization above makes both forms match.
    const nameMatch = allResultText.match(/(?:họ\s*tên|ho\s*ten)\s*[:：]\s*(.+?)(?=\s*(?:,|;|!|\(|$))/i);
    let parsedName = nameMatch ? nameMatch[1].trim() : "";
    if (parsedName.length > 80 || /ngày\s*sinh|năm\s*sinh|thời\s*gian|tra\s*cứu|lịch\s*sử|quản\s*lý\s*thông\s*tuyến/i.test(parsedName)) parsedName = "";
    const genderMatch = allResultText.match(/(?:giới\s*tính|gioi\s*tinh)\s*[:：]\s*([^,;!()]+?)(?=[,;!)]|$)/i);
    const facilityMatch = allResultText.match(/(?:nơi\s*KCBBĐ|nơi\s*KCB\s*ban\s*đầu|nơi\s*đăng\s*ký\s*KCB\s*ban\s*đầu|noi\s*KCBBD|noi\s*dang\s*ky\s*KCB\s*ban\s*dau)\s*[:：]\s*([^,;!()]+)/i);

    // The portal may display TWO different cards in one notice: the queried/previous
    // card and a newly issued card. Prefer the page body as the canonical source because
    // the notification text may be repeated when appended. Split at the explicit marker
    // so the validity periods remain attached to their corresponding cards.
    const newCardMarker = /chủ\s*thẻ\s*đã\s*được\s*cấp\s*mã\s*thẻ\s*mới/i;
    const cardNoticeText = [notification].find(t => t && newCardMarker.test(t)) || allResultText;
    const newCardMarkerMatch = newCardMarker.exec(cardNoticeText);
    const mainCardText = newCardMarkerMatch ? cardNoticeText.slice(0, newCardMarkerMatch.index) : cardNoticeText;
    const newCardText = newCardMarkerMatch
      ? cardNoticeText.slice(newCardMarkerMatch.index, newCardMarkerMatch.index + 1200)
      : "";
    const mainCardMatch = mainCardText.match(/(?:mã\s*thẻ(?:\s*bhyt)?|ma\s*the(?:\s*bhyt)?)\s*[:：]\s*([A-Z0-9]{8,20})/i);
    const mainCardCode = mainCardMatch ? mainCardMatch[1].trim().toUpperCase() : "";
    const mainValidity = parseCardValidity(mainCardText);
    const newCardMatch = newCardText.match(/mã\s*thẻ\s*mới\s*[:：]?\s*([A-Z]{1,3}\d{8,18})/i);
    const newCardValidityMatch = newCardText.match(/hạn\s*thẻ\s*từ\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})\s*(?:đến|den|[-–—])\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i);
    const newCardFacilityCodeMatch = newCardText.match(/mã\s*cơ\s*sở\s*KCB\s*ban\s*đầu\s*[:：]?\s*([A-Z0-9]{3,12})/i);
    const newCardFacilityNameMatch = newCardText.match(/tên\s*cơ\s*sở\s*KCB\s*ban\s*đầu\s*[:：]?\s*([^.;)\n]+)/i);
    const newCard = newCardMatch ? {
      card: newCardMatch[1].trim().toUpperCase(),
      start: newCardValidityMatch ? dateOnly(newCardValidityMatch[1]) : "",
      expiry: newCardValidityMatch ? dateOnly(newCardValidityMatch[2]) : "",
      facilityCode: newCardFacilityCodeMatch ? newCardFacilityCodeMatch[1].trim() : "",
      facilityName: newCardFacilityNameMatch ? newCardFacilityNameMatch[1].trim().replace(/[.!]+$/, "") : ""
    } : null;
    const newCardValidity = newCard && newCard.start && newCard.expiry
      ? parseCardValidity(`Hạn thẻ: ${newCard.start} – ${newCard.expiry}`)
      : null;
    const requestedCardNorm = normalize(requestedPatient && requestedPatient.card || "");
    const mainCardNorm = normalize(mainCardCode);
    const newCardNorm = normalize(newCard && newCard.card || "");
    // The code and validity used for ordinary comparison must match the card of the
    // selected HIS encounter when it appears in either part of the two-card notice.
    const selectedIsNewCard = Boolean(requestedCardNorm && newCardNorm && requestedCardNorm === newCardNorm);
    const selectedIsMainCard = Boolean(requestedCardNorm && mainCardNorm && requestedCardNorm === mainCardNorm);
    const selectedValidity = selectedIsNewCard ? newCardValidity
      : selectedIsMainCard ? mainValidity
      : (mainValidity.cardStart || mainValidity.cardExpiry ? mainValidity : parseCardValidity(cardNoticeText));
    const selectedCardCode = selectedIsNewCard ? newCard.card
      : selectedIsMainCard ? mainCardCode
      : (mainCardCode || (newCard ? newCard.card : ""));
    const validity = selectedValidity || parseCardValidity(cardNoticeText);
    return {
      notification,
      newCard,
      mainCard: mainCardCode && newCard && mainCardNorm !== newCardNorm ? {
        card: mainCardCode,
        start: mainValidity.cardStart || "",
        expiry: mainValidity.cardExpiry || ""
      } : null,
      card: selectedCardCode,
      name: parsedName,
      dob: dobMatch ? dateOnly(dobMatch[1].trim()) : "",
      gender: genderMatch ? genderMatch[1].trim() : "",
      registrationFacility: facilityMatch ? facilityMatch[1].trim() : "",
      kv: kvMatch ? kvMatch[1].trim().toUpperCase() : "",
      cardStart: validity.cardStart,
      cardExpiry: validity.cardExpiry,
      daysRemaining: validity.daysRemaining,
      expiryStatus: validity.expiryStatus,
      expiryMessage: validity.expiryMessage,
      resultFound: Boolean(notification && selectedCardCode),
      responseMatchesPatient: Boolean(requestedCardNorm && notification && (
        requestedCardNorm === mainCardNorm || requestedCardNorm === newCardNorm
      )),
      requestedPatient: requestedPatient ? {
        caseNo: String(requestedPatient.caseNo || ""),
        card: String(requestedPatient.card || ""),
        name: String(requestedPatient.name || ""),
        dob: dateOnly(requestedPatient.dob),
        gender: String(requestedPatient.gender || ""),
        registrationFacility: String(requestedPatient.registrationFacility || ""),
        kv: String(requestedPatient.kv || ""),
        cardValidityPeriod: String(requestedPatient.cardValidityPeriod || ""),
        hisCardStart: String(requestedPatient.hisCardStart || ""),
        hisCardExpiry: String(requestedPatient.hisCardExpiry || ""),
        admissionDate: dateOnly(requestedPatient.admissionDate),
        dischargeDate: dateOnly(requestedPatient.dischargeDate)
      } : null,
      // Reading the whole page is costly: done once, when the lookup gives up.
      needsCaptcha: false
    };
  }
  function pageAsksCaptcha() {
    return /captcha|ma xac nhan|ma bao mat|xac nhan robot/i.test(normalize(textOf(document.body).slice(0, 12000)));
  }

  // The portal answers within a few seconds normally, but can be much slower.
  const PORTAL_RESULT_TIMEOUT_MS = 20000;

  // What the portal's THÔNG BÁO box shows right now (any card), shortened, so a
  // failed lookup can say why: an old patient's notice (no answer yet), an
  // error message, or a notice the reader could not parse.
  function visibleNoticeText() {
    const helperSelector = "#his-time-helper, #his-bhyt-result, #his-bhyt-helper-trigger";
    const found = [];
    for (const el of document.querySelectorAll("fieldset, [role='alert'], .alert, [id*='thongbao' i], [class*='thongbao' i]")) {
      if (!visible(el) || el.closest(helperSelector)) continue;
      const txt = textOf(el);
      if (txt && /thongbao/.test(normalize(txt.slice(0, 60)))) found.push(txt);
    }
    found.sort((a, b) => a.length - b.length);
    return found.length ? found[0].slice(0, 400) : "";
  }

  // The portal's answer for this card when it is not a card status the reader
  // knows (e.g. wrong birth date / name for this card): the smallest visible
  // notice-like box that names the card, from "Thông báo" on, cut before the
  // visit-history sections. "" when the page does not name the card.
  function cardNoticeText(requestedCardNorm) {
    if (!requestedCardNorm) return "";
    const mentionsCard = el => String(el && el.textContent || "").toLowerCase().replace(/[^a-z0-9]/g, "").includes(requestedCardNorm);
    if (!mentionsCard(document.body)) return "";
    const helperSelector = "#his-time-helper, #his-bhyt-result, #his-bhyt-helper-trigger";
    const stops = /lịch\s*sử\s*khám\s*chữa\s*bệnh|thông\s*tin\s*cùng\s*chi\s*trả|thông\s*tin\s*kiểm\s*tra\s*thẻ|quản\s*lý\s*thông\s*tuyến/i;
    const found = [];
    for (const el of document.querySelectorAll("fieldset, [role='alert'], .alert, [id*='thongbao' i], [class*='thongbao' i], [id*='notification' i], [class*='notification' i], .modal-body, .toast, .swal2-content, .swal2-html-container")) {
      if (!mentionsCard(el) || !visible(el) || el.closest(helperSelector)) continue;
      let txt = String(el.innerText || el.textContent || "").normalize("NFC").replace(/\s+/g, " ").trim();
      const start = txt.search(/thông\s*báo/i);
      if (start > 0) txt = txt.slice(start);
      const stop = txt.search(stops);
      if (stop > 24) txt = txt.slice(0, stop).trim();
      if (txt && normalize(txt).includes(requestedCardNorm) && txt.length <= 1500) found.push(txt);
    }
    found.sort((a, b) => a.length - b.length);
    return found.length ? found[0].slice(0, 600) : "";
  }

  // Lookups come in a run during QUÉT: keep the page awake (portal_main.js)
  // from the first lookup until 3 minutes after the last one.
  let awakeOffTimer = null;
  function keepPortalAwake() {
    window.postMessage({ __scanPortalAwakeV1: true, on: true }, "*");
    if (awakeOffTimer) clearTimeout(awakeOffTimer);
    awakeOffTimer = setTimeout(() => {
      awakeOffTimer = null;
      window.postMessage({ __scanPortalAwakeV1: true, on: false }, "*");
    }, 180000);
  }

  function fillAndQuery(message, sendResponse) {
    keepPortalAwake();
    if (location.hostname !== "gdbhyt.baohiemxahoi.gov.vn" || !location.pathname.toLowerCase().includes("/thongtuyenlskcb/")) {
      sendResponse({ ok: false, message: "Tab đích không phải trang Thông tuyến khám chữa bệnh." });
      return;
    }
    const patient = message.patient || {};
    if (!patient.card || !patient.name || !patient.dob) {
      sendResponse({ ok: false, message: "Thiếu mã thẻ, họ tên hoặc ngày sinh của ca đang chọn. Chưa thực hiện tra cứu." });
      return;
    }
    const fields = findFields();
    if (!fields.card || !fields.name || !fields.dob) {
      sendResponse({ ok: false, message: "Không tìm thấy đủ ô Mã thẻ/CCCD, Họ tên và Ngày sinh trên cổng. Chưa thực hiện tra cứu." });
      return;
    }
    const pageText = normalize(textOf(document.body));
    if (/captcha|ma xac nhan|ma bao mat|xac nhan robot/i.test(pageText)) {
      sendResponse({ ok: false, message: "Cổng đang yêu cầu xác thực bổ sung. Em hoàn tất xác thực trên cổng rồi bấm lại nhé." });
      return;
    }

    // We deliberately leave Mã QR and the selected time range untouched.
    setValue(fields.card, patient.card);
    setValue(fields.name, patient.name);
    const dob = dateOnly(patient.dob);
    // A native date input requires ISO yyyy-MM-dd; the actual portal currently
    // uses a text field, where dd/MM/yyyy is the expected display format.
    setValue(fields.dob, String(fields.dob.type || "").toLowerCase() === "date" ? (() => {
      const m = dob.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      return m ? `${m[3]}-${m[2]}-${m[1]}` : dob;
    })() : dob);
    const button = findSearchButton();
    if (!button) {
      sendResponse({ ok: false, message: "Đã điền thông tin nhưng không tìm thấy đúng nút Tra cứu. Em kiểm tra trang rồi thử lại nhé." });
      return;
    }
    // A new click cancels a pending lookup so a delayed response from an earlier
    // patient cannot update the current HIS panel.
    if (activeLookupTimer) {
      clearPoll(activeLookupTimer);
      activeLookupTimer = null;
    }
    const currentLookupId = ++lookupSequence;
    sendResponse({ ok: true, message: "Đã điền thông tin và bấm Tra cứu. Đang chờ kết quả đúng mã thẻ…" });
    button.click();

    const started = Date.now();
    let lastValidSignature = "";
    let stableValidPolls = 0;
    let lastOtherNotice = "", otherNoticeSince = 0;
    const timer = startPoll(() => {
      if (currentLookupId !== lookupSequence) {
        clearPoll(timer);
        return;
      }
      const snapshot = resultSnapshot(patient);
      const elapsed = Date.now() - started;
      // Wait for a complete, card-specific notice to settle. Intermediate page
      // renders and the visit-history table must never be treated as a new result.
      // Name + birth date/gender confirm the notice is fully drawn. After a few
      // seconds a notice for this card is accepted even if they did not parse.
      const hasUsableIdentity = Boolean(snapshot.name && (snapshot.dob || snapshot.gender));
      const validCurrentResult = snapshot.resultFound && snapshot.responseMatchesPatient && (hasUsableIdentity || elapsed >= 4000);
      const signature = validCurrentResult ? [
        normalize(snapshot.notification), normalize(snapshot.card), normalize(snapshot.name),
        normalize(snapshot.dob), normalize(snapshot.gender), normalize(snapshot.cardStart),
        normalize(snapshot.cardExpiry), normalize(snapshot.registrationFacility), normalize(snapshot.kv)
      ].join("|") : "";
      if (validCurrentResult && signature && signature === lastValidSignature) stableValidPolls++;
      else stableValidPolls = validCurrentResult && signature ? 1 : 0;
      lastValidSignature = signature;
      // The portal answered for this card, but not with a card status the
      // reader parses (an error such as a wrong birth date): once that text
      // has stayed the same for 2 s, report it instead of timing out and
      // retrying (the answer would be the same).
      if (!validCurrentResult && elapsed >= 4000) {
        const other = cardNoticeText(normalize(patient.card));
        if (other && other === lastOtherNotice) {
          if (!otherNoticeSince) otherNoticeSince = Date.now();
        } else otherNoticeSince = 0;
        lastOtherNotice = other;
        if (other && otherNoticeSince && Date.now() - otherNoticeSince >= 2000) {
          clearPoll(timer);
          if (activeLookupTimer === timer) activeLookupTimer = null;
          chrome.runtime.sendMessage({
            type: "BHYT_RESULT",
            sourceTabId: message.sourceTabId,
            requestedPatient: patient,
            result: {
              notification: other,
              newCard: null, mainCard: null, card: "", name: "", dob: "", gender: "",
              registrationFacility: "", kv: "", cardStart: "", cardExpiry: "",
              daysRemaining: null, expiryStatus: "unknown",
              expiryMessage: "Chưa xác nhận được thời hạn thẻ từ lượt tra cứu hiện tại",
              resultFound: false, responseMatchesPatient: false, staleResult: false,
              unrecognizedNotice: other, portalNotice: other,
              requestedPatient: snapshot.requestedPatient || patient,
              needsCaptcha: false
            }
          });
          return;
        }
      }
      // Same reply on 2 polls in a row (~0.3 s) is enough.
      if (elapsed >= 300 && stableValidPolls >= 2) {
        clearPoll(timer);
        if (activeLookupTimer === timer) activeLookupTimer = null;
        chrome.runtime.sendMessage({
          type: "BHYT_RESULT",
          sourceTabId: message.sourceTabId,
          requestedPatient: patient,
          result: snapshot
        });
      } else if (elapsed >= PORTAL_RESULT_TIMEOUT_MS) {
        clearPoll(timer);
        if (activeLookupTimer === timer) activeLookupTimer = null;
        const portalNotice = cardNoticeText(normalize(patient.card)) || visibleNoticeText();
        // Do not send any fields from a mismatched/previous notification.
        chrome.runtime.sendMessage({
          type: "BHYT_RESULT",
          sourceTabId: message.sourceTabId,
          requestedPatient: patient,
          result: {
            notification: "Cổng chưa trả về thông báo khớp mã thẻ đang tra. Không sử dụng KV/K của lượt trước; em kiểm tra kết quả trực tiếp trên cổng nhé.",
            newCard: null, mainCard: null, card: "", name: "", dob: "", gender: "",
            registrationFacility: "", kv: "", cardStart: "", cardExpiry: "",
            daysRemaining: null, expiryStatus: "unknown",
            expiryMessage: "Chưa xác nhận được thời hạn thẻ từ lượt tra cứu hiện tại",
            resultFound: false, responseMatchesPatient: false, staleResult: true, portalNotice,
            requestedPatient: snapshot.requestedPatient || patient,
            needsCaptcha: pageAsksCaptcha()
          }
        });
      }
    }, 150);
    activeLookupTimer = timer;
  }

  function findCardHistoryButton() {
    const selectors = "button, input[type='button'], input[type='submit'], a, [role='button'], .btn, [onclick], [tabindex]";
    const controls = Array.from(document.querySelectorAll(selectors)).filter(visible);
    const score = el => {
      const label = normalize([textOf(el), el.value, el.title, el.getAttribute("aria-label"), el.id, el.name].join(" "));
      if (label === "lsthebhyt") return 0;
      if (label.includes("lsthebhyt")) return 1;
      if (label.includes("lichsu") && label.includes("thebhyt")) return 2;
      return 99;
    };
    return controls.map(el => ({ el, score: score(el) })).filter(x => x.score < 99 && !x.el.disabled)
      .sort((a, b) => a.score - b.score)[0]?.el || null;
  }

  function collectCardHistory(beforeText) {
    const beforeNorm = normalize(beforeText);
    const candidates = [];
    const modalSelectors = [
      '[role="dialog"]', '.modal.show', '.modal.in', '.modal-dialog', '.ui-dialog',
      '.bootbox', '.sweet-alert', '[id*="modal"]', '[class*="modal"]',
      '[id*="history"]', '[id*="History"]', '[id*="lichsu"]', '[class*="lichsu"]'
    ];
    for (const selector of modalSelectors) {
      for (const el of document.querySelectorAll(selector)) {
        if (!visible(el)) continue;
        const txt = textOf(el);
        const n = normalize(txt);
        // Ignore an already-visible container that was present before the click;
        // otherwise the existing visit-history table could be mistaken for card-renewal history.
        if (txt.length >= 10 && txt.length <= 10000 && !beforeNorm.includes(n) &&
            (/thebhyt|lichsu|giahan|giatri|tungay|denngay|ngayhieuluc|thoihan/.test(n) || el.querySelector("table"))) {
          candidates.push({ text: txt, score: 100 + (el.querySelectorAll("tr").length * 5) + Math.min(txt.length, 300) / 100 });
        }
      }
    }
    // If the portal draws history inline instead of a modal, inspect visible tables
    // whose contents changed after the user's requested history action.
    for (const table of document.querySelectorAll("table, [role='grid']")) {
      if (!visible(table)) continue;
      const txt = textOf(table);
      if (txt.length < 10 || txt.length > 8000) continue;
      const n = normalize(txt);
      // The visible KCB-visit table existed before the click; only accept tables whose text is newly rendered.
      if (!beforeNorm.includes(n) && (/giahan|lichsu|giatri|tungay|denngay|ngayhieuluc|thebhyt/.test(n) || table.querySelectorAll("tr").length >= 2)) {
        candidates.push({ text: txt, score: 50 + table.querySelectorAll("tr").length * 5 + Math.min(txt.length, 300) / 100 });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    if (candidates.length) {
      const chosen = candidates[0].text.trim();
      if (normalize(chosen) !== beforeNorm && chosen.length > 12) return chosen.slice(0, 8000);
    }
    const nowText = textOf(document.body).slice(0, 16000);
    if (nowText === beforeText) return "";
    const oldLines = new Set(String(beforeText || "").split(/\n+/).map(x => x.trim()).filter(Boolean));
    const delta = nowText.split(/\n+/).map(x => x.trim()).filter(x => x && !oldLines.has(x));
    const deltaText = delta.join("\n").trim();
    if (deltaText.length > 12) return deltaText.slice(0, 8000);
    return "";
  }

  function readCardHistory(message, sendResponse) {
    if (location.hostname !== "gdbhyt.baohiemxahoi.gov.vn" || !location.pathname.toLowerCase().includes("/thongtuyenlskcb/")) {
      sendResponse({ ok: false, message: "Tab đích không phải trang Thông tuyến khám chữa bệnh." });
      return;
    }
    const button = findCardHistoryButton();
    if (!button) {
      sendResponse({ ok: false, message: "Không tìm thấy nút LS Thẻ BHYT trên cổng. Em mở đúng trang Thông tuyến rồi thử lại nhé." });
      return;
    }
    const beforeText = textOf(document.body).slice(0, 16000);
    sendResponse({ ok: true, message: "Đã yêu cầu cổng mở Lịch sử thẻ BHYT. Đang chờ dữ liệu…" });
    button.click();
    const started = Date.now();
    let lastSnapshot = "";
    let lastChangeAt = 0;
    const timer = startPoll(() => {
      const snapshot = collectCardHistory(beforeText);
      if (snapshot && snapshot !== lastSnapshot) {
        lastSnapshot = snapshot;
        lastChangeAt = Date.now();
      }
      const elapsed = Date.now() - started;
      if (lastSnapshot && elapsed >= 1400 && Date.now() - lastChangeAt >= 850) {
        clearPoll(timer);
        chrome.runtime.sendMessage({
          type: "BHYT_CARD_HISTORY_RESULT",
          sourceTabId: message.sourceTabId,
          requestedPatient: message.patient || null,
          result: { ok: true, historyText: lastSnapshot }
        });
      } else if (elapsed >= 12000) {
        clearPoll(timer);
        chrome.runtime.sendMessage({
          type: "BHYT_CARD_HISTORY_RESULT",
          sourceTabId: message.sourceTabId,
          requestedPatient: message.patient || null,
          result: { ok: false, message: "Cổng đã nhận thao tác nhưng tiện ích chưa đọc được bảng lịch sử thẻ. Em xem kết quả trực tiếp trên cổng nhé." }
        });
      }
    }, 350);
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message) return;
    if (message.type === "BHYT_FILL_AND_QUERY") {
      fillAndQuery(message, sendResponse);
      return true;
    }
    if (message.type === "BHYT_READ_CARD_HISTORY") {
      readCardHistory(message, sendResponse);
      return true;
    }
  });
})();
