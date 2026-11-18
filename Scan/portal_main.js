// BHYT portal, page world: keep the portal working while its tab is hidden
// during QUÉT. Chrome throttles a hidden page's timers (aligned to 1 s, then to
// 1 per minute after 5 min) and may freeze the page; the portal's own code
// (jQuery, rendering the THÔNG BÁO box) can run on those timers. While
// bhyt_portal.js has a lookup going (it posts __scanPortalAwakeV1), timers set
// in the hidden page run from a Worker, whose timers are not throttled, and a
// Web Lock keeps Chrome from freezing the page. Visible tab or idle: native.
(() => {
  if (window.__scanPortalMainV1) return;
  window.__scanPortalMainV1 = true;

  let awake = false;
  const nativeSetTimeout = window.setTimeout.bind(window);
  const nativeSetInterval = window.setInterval.bind(window);
  const nativeClearTimeout = window.clearTimeout.bind(window);
  const nativeClearInterval = window.clearInterval.bind(window);
  let worker = null;
  try {
    const src = "const t={};onmessage=e=>{const d=e.data;if(d.clear){clearTimeout(t[d.id]);clearInterval(t[d.id]);delete t[d.id];return;}" +
      "t[d.id]=d.repeat?setInterval(()=>postMessage(d.id),d.ms):setTimeout(()=>{delete t[d.id];postMessage(d.id);},d.ms);}";
    worker = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
  } catch (_) { worker = null; }

  if (worker) {
    // Ids far above Chrome's native timer ids so the two never collide.
    let seq = 1500000000;
    const timers = new Map();
    worker.onmessage = e => {
      const timer = timers.get(e.data);
      if (!timer) return;
      if (!timer.repeat) timers.delete(e.data);
      try { timer.fn.apply(window, timer.args); } catch (err) { nativeSetTimeout(() => { throw err; }, 0); }
    };
    worker.onerror = () => { worker = null; };
    const useWorker = fn => worker && awake && typeof fn === "function" && document.visibilityState === "hidden";
    const schedule = (repeat, fn, ms, args) => {
      const id = ++seq;
      timers.set(id, { fn, args, repeat });
      try { worker.postMessage({ id, ms: Math.max(0, Number(ms) || 0), repeat }); }
      catch (_) { timers.delete(id); return null; }
      return id;
    };
    const clear = (id, nativeClear) => {
      if (timers.has(id)) {
        timers.delete(id);
        try { if (worker) worker.postMessage({ id, clear: true }); } catch (_) {}
        return;
      }
      nativeClear(id);
    };
    window.setTimeout = function(fn, ms, ...args) {
      if (useWorker(fn)) { const id = schedule(false, fn, ms, args); if (id !== null) return id; }
      return nativeSetTimeout(fn, ms, ...args);
    };
    window.setInterval = function(fn, ms, ...args) {
      if (useWorker(fn)) { const id = schedule(true, fn, ms, args); if (id !== null) return id; }
      return nativeSetInterval(fn, ms, ...args);
    };
    window.clearTimeout = function(id) { clear(id, nativeClearTimeout); };
    window.clearInterval = function(id) { clear(id, nativeClearInterval); };
  }

  // A page holding a Web Lock is not frozen by Chrome while it is in the background.
  let releaseLock = null, lockPending = false;
  function setAwake(on) {
    awake = !!on;
    if (on && !releaseLock && !lockPending && navigator.locks && navigator.locks.request) {
      lockPending = true;
      try {
        navigator.locks.request("scan-portal-keep-awake", () => new Promise(resolve => {
          lockPending = false;
          if (!awake) { resolve(); return; }
          releaseLock = resolve;
        })).catch(() => { lockPending = false; });
      } catch (_) { lockPending = false; }
    } else if (!on && releaseLock) {
      releaseLock();
      releaseLock = null;
    }
  }

  window.addEventListener("message", event => {
    if (event.source !== window || !event.data || event.data.__scanPortalAwakeV1 !== true) return;
    setAwake(event.data.on);
  });
})();
