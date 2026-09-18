// Send to Town -- in-page instruction box (injected on demand)
//
// A small floating box at the user's selection for typing a freeform
// instruction ("draft a reply to Peter asking if storage is included")
// instead of picking a note preset. The typed text travels in its own
// `instruction` payload field, kept deliberately apart from `note`:
// `note` is filing context read by the capture routine, `instruction` is a
// directive dispatched to the user's assistant. See routine/web-capture-inbox.md.
//
// Injected via chrome.scripting.executeScript, so it must be idempotent and
// must survive hostile page CSS -- hence the shadow root and `all: initial`.

(() => {
  const HOST_ID = "town-instruction-overlay";

  // Re-injection (second shortcut press) focuses the open box instead of stacking.
  const open = document.getElementById(HOST_ID);
  if (open) {
    const field = open.shadowRoot && open.shadowRoot.querySelector("textarea");
    if (field) field.focus();
    return;
  }

  // Grab the selection now: focusing the textarea below collapses it.
  const sel = window.getSelection ? window.getSelection() : null;
  const selectionText = sel ? String(sel).trim() : "";
  let anchor = null;
  if (sel && sel.rangeCount && selectionText) {
    const r = sel.getRangeAt(0).getBoundingClientRect();
    if (r && (r.width || r.height)) anchor = r;
  }

  const WIDTH = 340;
  const host = document.createElement("div");
  host.id = HOST_ID;
  const top = anchor
    ? Math.max(8, Math.min(anchor.bottom + 8, window.innerHeight - 190))
    : 16;
  const left = anchor
    ? Math.max(8, Math.min(anchor.left, window.innerWidth - WIDTH - 8))
    : Math.max(8, window.innerWidth - WIDTH - 16);
  host.setAttribute(
    "style",
    "all: initial; position: fixed; z-index: 2147483647; top: " +
      Math.round(top) + "px; left: " + Math.round(left) + "px;"
  );

  const root = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = [
    ":host { all: initial; }",
    "* { box-sizing: border-box; font-family: -apple-system, Segoe UI, Roboto, sans-serif; }",
    ".box { width: " + WIDTH + "px; background: #fff; color: #111; border: 1px solid #cbd5e1;",
    "  border-radius: 10px; box-shadow: 0 10px 30px rgba(15,23,42,.18); padding: 12px; }",
    ".hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }",
    ".hd b { font-size: 12px; font-weight: 700; letter-spacing: .02em; text-transform: uppercase; color: #475569; }",
    ".x { border: 0; background: none; cursor: pointer; font-size: 15px; line-height: 1; color: #94a3b8; padding: 2px 4px; }",
    ".ctx { font-size: 11px; color: #64748b; margin-bottom: 8px; overflow: hidden;",
    "  text-overflow: ellipsis; white-space: nowrap; }",
    "textarea { width: 100%; height: 62px; resize: vertical; border: 1px solid #cbd5e1;",
    "  border-radius: 6px; padding: 7px; font-size: 13px; line-height: 1.4; color: #111; background: #fff; }",
    "textarea:focus { outline: 2px solid #2563eb; outline-offset: -1px; }",
    ".ft { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; gap: 8px; }",
    ".hint { font-size: 10.5px; color: #94a3b8; line-height: 1.3; }",
    "button.send { border: 0; border-radius: 6px; background: #2563eb; color: #fff; font-weight: 600;",
    "  font-size: 12px; padding: 7px 12px; cursor: pointer; white-space: nowrap; }",
    "button.send[disabled] { background: #94a3b8; cursor: default; }",
    ".status { font-size: 12px; margin-top: 7px; min-height: 15px; }",
    ".ok { color: #15803d; } .err { color: #b91c1c; }"
  ].join("\n");

  const box = document.createElement("div");
  box.className = "box";
  box.innerHTML = [
    '<div class="hd"><b>Ask Town</b><button class="x" title="Close">&#10005;</button></div>',
    '<div class="ctx"></div>',
    "<textarea placeholder=\"What should Town do with this? e.g. draft a reply asking about the storage fee\"></textarea>",
    '<div class="ft">',
    '  <span class="hint">Enter to send &middot; Esc to close<br />Drafts and prep only &mdash; nothing is sent for you.</span>',
    '  <button class="send">Send</button>',
    "</div>",
    '<div class="status"></div>'
  ].join("");

  root.appendChild(style);
  root.appendChild(box);
  document.documentElement.appendChild(host);

  const ctxEl = root.querySelector(".ctx");
  const field = root.querySelector("textarea");
  const sendBtn = root.querySelector("button.send");
  const statusEl = root.querySelector(".status");

  ctxEl.textContent = selectionText
    ? "On your selection: \u201c" + selectionText.slice(0, 70) + (selectionText.length > 70 ? "\u2026" : "") + "\u201d"
    : "On this page: " + (document.title || location.hostname);

  function close() {
    window.removeEventListener("keydown", onKey, true);
    host.remove();
  }

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = "status" + (cls ? " " + cls : "");
  }

  async function send() {
    const instruction = field.value.trim();
    if (!instruction) {
      setStatus("Type what you'd like Town to do first.", "err");
      field.focus();
      return;
    }
    sendBtn.disabled = true;
    setStatus("Sending\u2026", "");
    let resp;
    try {
      resp = await chrome.runtime.sendMessage({
        type: "askTown",
        instruction,
        selectionText
      });
    } catch (e) {
      resp = { ok: false, error: "Couldn't reach the extension: " + e.message };
    }
    if (resp && resp.ok) {
      setStatus("Sent. Town will pick this up as a task.", "ok");
      setTimeout(close, 1600);
    } else {
      sendBtn.disabled = false;
      setStatus((resp && resp.error) || "Something went wrong.", "err");
    }
  }

  function onKey(e) {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
    }
  }

  // Capture phase, on window: pages that swallow keydown can't trap Esc here.
  window.addEventListener("keydown", onKey, true);
  field.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
  sendBtn.addEventListener("click", send);
  root.querySelector(".x").addEventListener("click", close);

  field.focus();
})();
