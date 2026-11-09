/* Routes a user-initiated BHYT lookup between the HIS tab and the already-open BHYT portal. */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== "object") return;

  if (message.type === "BHYT_LOOKUP") {
    if (!sender || !String(sender.url || "").startsWith("https://bvdksoctrang.vncare.vn/")) {
      sendResponse({ ok: false, message: "Chỉ nhận yêu cầu đối chiếu từ trang HIS đã được cấu hình." });
      return false;
    }
    const sourceTabId = sender && sender.tab ? sender.tab.id : null;
    if (sourceTabId == null) {
      sendResponse({ ok: false, message: "Không xác định được tab HIS để trả kết quả." });
      return false;
    }

    chrome.tabs.query({ url: "https://gdbhyt.baohiemxahoi.gov.vn/ThongTuyenLSKCB/Index*" }, tabs => {
      const portal = (tabs || []).find(t => Number.isInteger(t.id));
      if (!portal) {
        sendResponse({ ok: false, message: "Chưa thấy trang cổng giám định BHYT đang mở. Em mở trang Thông tuyến khám chữa bệnh rồi thử lại nhé." });
        return;
      }
      chrome.tabs.sendMessage(portal.id, {
        type: "BHYT_FILL_AND_QUERY",
        patient: message.patient,
        sourceTabId,
        sourceCase: message.sourceCase || ""
      }, response => {
        if (chrome.runtime.lastError) {
          sendResponse({ ok: false, message: "Chưa kết nối được với trang BHYT. Em tải lại trang BHYT và thử lại nhé." });
          return;
        }
        sendResponse(response || { ok: false, message: "Trang BHYT chưa phản hồi. Em tải lại trang BHYT rồi thử lại nhé." });
      });
    });
    return true;
  }


  if (message.type === "BHYT_CARD_HISTORY") {
    if (!sender || !String(sender.url || "").startsWith("https://bvdksoctrang.vncare.vn/")) {
      sendResponse({ ok: false, message: "Chỉ nhận yêu cầu tra lịch sử thẻ từ trang HIS đã được cấu hình." });
      return false;
    }
    const sourceTabId = sender && sender.tab ? sender.tab.id : null;
    if (sourceTabId == null) {
      sendResponse({ ok: false, message: "Không xác định được tab HIS để trả lịch sử thẻ." });
      return false;
    }
    chrome.tabs.query({ url: "https://gdbhyt.baohiemxahoi.gov.vn/ThongTuyenLSKCB/Index*" }, tabs => {
      const portal = (tabs || []).find(t => Number.isInteger(t.id));
      if (!portal) {
        sendResponse({ ok: false, message: "Chưa thấy trang cổng giám định BHYT đang mở. Em mở trang Thông tuyến rồi thử lại nhé." });
        return;
      }
      chrome.tabs.sendMessage(portal.id, {
        type: "BHYT_READ_CARD_HISTORY",
        patient: message.patient || {},
        sourceTabId
      }, response => {
        if (chrome.runtime.lastError) {
          sendResponse({ ok: false, message: "Chưa kết nối được với cổng BHYT. Em tải lại trang cổng rồi thử lại nhé." });
          return;
        }
        sendResponse(response || { ok: false, message: "Cổng BHYT chưa phản hồi yêu cầu lịch sử thẻ." });
      });
    });
    return true;
  }

  if (message.type === "BHYT_CARD_HISTORY_RESULT" && Number.isInteger(message.sourceTabId)) {
    if (!sender || !String(sender.url || "").startsWith("https://gdbhyt.baohiemxahoi.gov.vn/ThongTuyenLSKCB/Index")) return false;
    chrome.tabs.sendMessage(message.sourceTabId, {
      type: "BHYT_CARD_HISTORY_RESULT",
      requestedPatient: message.requestedPatient || null,
      result: message.result || {}
    }, () => { void chrome.runtime.lastError; });
    return false;
  }

  if (message.type === "BHYT_RESULT" && Number.isInteger(message.sourceTabId)) {
    if (!sender || !String(sender.url || "").startsWith("https://gdbhyt.baohiemxahoi.gov.vn/ThongTuyenLSKCB/Index")) return false;
    chrome.tabs.sendMessage(message.sourceTabId, {
      type: "BHYT_RESULT",
      result: message.result,
      requestedPatient: message.requestedPatient || null
    }, () => { void chrome.runtime.lastError; });
  }
});
