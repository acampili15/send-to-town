// Send to Town - background service worker (MV3)

// Runs in the target tab to pull out the useful bits of the page.
function extractPageData() {
  const selection = window.getSelection ? String(window.getSelection()) : "";
  const clean = (s) => (s || "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const host = location.hostname;
  const trySel = (sel) => {
    const el = document.querySelector(sel);
    return (el && el.innerText && el.innerText.trim().length > 20) ? el : null;
  };
  let node = null;
  if (/linkedin\.com/.test(host)) {
    node = trySel(".feed-shared-update-v2__description") || trySel(".update-components-text") || trySel("article");
  } else if (/(twitter|x)\.com/.test(host)) {
    node = trySel('[data-testid="tweetText"]') || trySel("article");
  }
  if (!node) node = document.querySelector("article, main, [role=main]") || document.body;
  let text = node ? node.innerText : (document.body ? document.body.innerText : "");
  text = clean(text);
  if (text.length < 200 && document.body) {
    const bodyText = clean(document.body.innerText);
    if (bodyText.length > text.length) text = bodyText;
  }
  if (text.length > 20000) text = text.slice(0, 20000);
  const meta = (name) => {
    const el = document.querySelector('meta[name="' + name + '"], meta[property="' + name + '"]');
    return el ? (el.getAttribute("content") || "") : "";
  };
  const canon = document.querySelector('link[rel="canonical"]');
  return {
    url: location.href,
    title: document.title || "",
    site: host,
    selection: clean(selection),
    description: meta("description") || meta("og:description"),
    author: meta("author") || meta("article:author"),
    published: meta("article:published_time") || meta("date"),
    canonical: canon ? (canon.getAttribute("href") || "") : "",
    text: text
  };
}

async function flashBadge(text, color) {
  try {
    await chrome.action.setBadgeBackgroundColor({ color });
    await chrome.action.setBadgeText({ text });
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 2500);
  } catch (e) { /* no-op */ }
}

async function getConfig() {
  return chrome.storage.sync.get(["webhookUrl", "webhookSecret", "collections", "defaultCollection"]);
}

async function postToTown(cfg, data) {
  return fetch(cfg.webhookUrl, {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + cfg.webhookSecret,
      "Content-Type": "application/json",
      "X-Town-Idempotency-Key": (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + "-" + Math.random())
    },
    body: JSON.stringify({ data })
  });
}

// `note` and `instruction` are both user-authored, but they are NOT the same
// thing and must stay in separate fields. `note` is filing context the capture
// routine reads; `instruction` is a directive the routine hands to the user's
// assistant as a task. Merging them would make a populated note enough to
// trigger real work, and would force the routine to guess intent. Everything
// else here is page-derived and must never be treated as direction.
function buildPayload(page, extra) {
  const e = extra || {};
  const selection = (e.selectionText || page.selection || "").trim();
  return {
    source: "browser-extension",
    kind: "web_capture",
    url: page.url,
    title: page.title,
    site: page.site,
    selection: selection,
    description: page.description,
    author: page.author,
    published: page.published,
    canonical: page.canonical,
    text: (e.selectionOnly && selection) ? "" : page.text,
    note: e.note || "",
    instruction: e.instruction || "",
    collection: e.collection || "",
    capturedAt: new Date().toISOString()
  };
}

async function readTab(tabId) {
  const res = await chrome.scripting.executeScript({ target: { tabId }, func: extractPageData });
  return (res && res[0] && res[0].result) ? res[0].result : null;
}

const EMPTY_PAGE = { url: "", title: "", site: "", selection: "", description: "", author: "", published: "", canonical: "", text: "" };

// Single capture: current page, current selection, or a right-clicked link.
async function sendCapture(opts) {
  const options = opts || {};
  const cfg = await getConfig();
  if (!cfg.webhookUrl || !cfg.webhookSecret) {
    await flashBadge("SET", "#b45309");
    return { ok: false, error: "Not set up yet. Open the extension options and add your webhook URL and secret." };
  }

  // Right-clicked link: send just the URL for Town to fetch server-side.
  if (options.linkUrl) {
    const data = buildPayload(Object.assign({}, EMPTY_PAGE, { url: options.linkUrl }), { note: options.note, instruction: options.instruction, collection: options.collection });
    data.kind = "web_capture_link";
    try {
      const resp = await postToTown(cfg, data);
      if (resp.status === 202 || resp.ok) { await flashBadge("OK", "#15803d"); return { ok: true }; }
      await flashBadge("ERR", "#b91c1c");
      return { ok: false, error: "Town returned " + resp.status + "." };
    } catch (e) { await flashBadge("ERR", "#b91c1c"); return { ok: false, error: "Network error: " + e.message }; }
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id || !/^https?:/.test(tab.url || "")) {
    await flashBadge("ERR", "#b91c1c");
    return { ok: false, error: "This page can't be captured (not a normal web page)." };
  }
  let page = Object.assign({}, EMPTY_PAGE, { url: tab.url || "", title: tab.title || "" });
  try {
    const read = await readTab(tab.id);
    if (read) page = read;
  } catch (e) {
    if (!options.selectionText) {
      await flashBadge("ERR", "#b91c1c");
      return { ok: false, error: "Couldn't read the page: " + e.message };
    }
  }
  const data = buildPayload(page, options);
  try {
    const resp = await postToTown(cfg, data);
    if (resp.status === 202 || resp.ok) { await flashBadge("OK", "#15803d"); return { ok: true }; }
    await flashBadge("ERR", "#b91c1c");
    return { ok: false, error: "Town returned " + resp.status + " (a 404 usually means a wrong or disabled secret)." };
  } catch (e) {
    await flashBadge("ERR", "#b91c1c");
    return { ok: false, error: "Network error: " + e.message };
  }
}

// Send every normal web page open in the current window.
async function sendAllTabs(opts) {
  const options = opts || {};
  const cfg = await getConfig();
  if (!cfg.webhookUrl || !cfg.webhookSecret) {
    await flashBadge("SET", "#b45309");
    return { ok: false, error: "Not set up yet. Open the extension options and add your webhook URL and secret." };
  }
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const web = tabs.filter((t) => t.id && /^https?:/.test(t.url || ""));
  if (!web.length) { await flashBadge("0", "#b45309"); return { ok: false, error: "No normal web pages open to capture." }; }
  let sent = 0, failed = 0;
  const batchId = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
  for (const t of web) {
    let page = Object.assign({}, EMPTY_PAGE, { url: t.url, title: t.title || "" });
    try { const read = await readTab(t.id); if (read) page = read; } catch (e) { /* keep url/title */ }
    const data = buildPayload(page, { note: options.note, collection: options.collection });
    data.kind = "web_capture_batch";
    data.batchId = batchId;
    try {
      const resp = await postToTown(cfg, data);
      if (resp.status === 202 || resp.ok) sent++; else failed++;
    } catch (e) { failed++; }
    try { await chrome.action.setBadgeText({ text: String(sent) }); } catch (e) {}
  }
  await flashBadge(failed ? (sent + "!") : "OK", failed ? "#b45309" : "#15803d");
  return { ok: failed === 0, sent, failed, total: web.length };
}

// Fire a test ping so setup errors surface immediately.
async function testConnection(msg) {
  const url = (msg && msg.webhookUrl) || "";
  const secret = (msg && msg.webhookSecret) || "";
  if (!url || !secret) return { ok: false, error: "Add both a webhook URL and a secret first." };
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Authorization": "Bearer " + secret, "Content-Type": "application/json", "X-Town-Idempotency-Key": "test-" + Date.now() },
      body: JSON.stringify({ data: { source: "browser-extension", kind: "connection_test", note: "Test ping from the Send to Town extension.", capturedAt: new Date().toISOString() } })
    });
    if (resp.status === 202 || resp.ok) return { ok: true, status: resp.status };
    return { ok: false, status: resp.status, error: "Town returned " + resp.status + " (401/403 means the secret didn't match; 404 usually means a wrong or disabled secret)." };
  } catch (e) {
    return { ok: false, error: "Network error: " + e.message };
  }
}

// Runtime Townie icon: draw the user's Townie image onto the toolbar button.
async function applyTownieIcon() {
  try {
    const { townieIconDataUrl } = await chrome.storage.local.get(["townieIconDataUrl"]);
    if (!townieIconDataUrl) return;
    const blob = await (await fetch(townieIconDataUrl)).blob();
    const bitmap = await createImageBitmap(blob);
    const imageData = {};
    for (const size of [16, 32, 48, 128]) {
      const canvas = new OffscreenCanvas(size, size);
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, size, size);
      const scale = Math.min(size / bitmap.width, size / bitmap.height);
      const dw = bitmap.width * scale, dh = bitmap.height * scale;
      ctx.drawImage(bitmap, (size - dw) / 2, (size - dh) / 2, dw, dh);
      imageData[size] = ctx.getImageData(0, 0, size, size);
    }
    await chrome.action.setIcon({ imageData });
  } catch (e) { /* fall back to the packaged default icon */ }
}

function resetIcon() {
  return chrome.action.setIcon({ path: { 16: "icons/icon-16.png", 32: "icons/icon-32.png", 48: "icons/icon-48.png", 128: "icons/icon-128.png" } });
}

// ---- context menus ----
// Each capture target is a parent menu with a submenu of quick actions and
// collections, so a right-click can carry context without opening the popup.
// Note presets mirror the popup's quick-action chips (see popup.html data-tag).
const QUICK_ACTIONS = [
  { id: "summarize", label: "Summarize", note: "summarize" },
  { id: "read-later", label: "Read later", note: "read later" },
  { id: "todo", label: "Add todo", note: "add a todo" },
  { id: "reference", label: "Reference", note: "save as reference" }
];

// `ask` opens the in-page instruction box instead of sending immediately, so
// it only makes sense where there is a page to act on (not on a bare link).
const MENU_TARGETS = [
  { id: "selection", title: "Send selection to Town", contexts: ["selection"], ask: true },
  { id: "page", title: "Send page to Town", contexts: ["page"], ask: true },
  { id: "link", title: "Send this link to Town", contexts: ["link"], ask: false }
];

const DEFAULT_COLLECTIONS = ["reading", "captures", "social", "personal"];

// Ids look like town|<target>|<kind>|<value>; a collection name may itself
// contain "|", so the value is everything after the third separator.
function menuId(target, kind, value) {
  return ["town", target, kind, value].join("|");
}

function parseMenuId(rawId) {
  const parts = String(rawId || "").split("|");
  if (parts[0] !== "town" || parts.length < 4) return null;
  return { target: parts[1], kind: parts[2], value: parts.slice(3).join("|") };
}

async function buildMenus() {
  const cfg = await chrome.storage.sync.get(["collections"]);
  const collections = (Array.isArray(cfg.collections) && cfg.collections.length) ? cfg.collections : DEFAULT_COLLECTIONS;
  await chrome.contextMenus.removeAll();
  for (const target of MENU_TARGETS) {
    const contexts = target.contexts;
    const parentId = menuId(target.id, "parent", "");
    chrome.contextMenus.create({ id: parentId, title: target.title, contexts });
    chrome.contextMenus.create({ id: menuId(target.id, "send", ""), parentId, title: "Send now", contexts });
    if (target.ask) {
      chrome.contextMenus.create({ id: menuId(target.id, "ask", ""), parentId, title: "Ask Town to do something\u2026", contexts });
    }
    chrome.contextMenus.create({ id: menuId(target.id, "sep", "actions"), parentId, type: "separator", contexts });
    for (const action of QUICK_ACTIONS) {
      chrome.contextMenus.create({ id: menuId(target.id, "action", action.id), parentId, title: action.label, contexts });
    }
    chrome.contextMenus.create({ id: menuId(target.id, "sep", "collections"), parentId, type: "separator", contexts });
    for (const collection of collections) {
      chrome.contextMenus.create({ id: menuId(target.id, "collection", collection), parentId, title: "File into: " + collection, contexts });
    }
  }
}

// Inject the instruction box into a tab. Idempotent on the page side: a second
// injection focuses the box already open rather than stacking another one.
async function openInstructionBox(tab) {
  let target = tab;
  if (!target || !target.id) {
    const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
    target = active;
  }
  if (!target || !target.id || !/^https?:/.test(target.url || "")) {
    await flashBadge("ERR", "#b91c1c");
    return { ok: false, error: "This page can't be captured (not a normal web page)." };
  }
  try {
    await chrome.scripting.executeScript({ target: { tabId: target.id }, files: ["instruction-overlay.js"] });
    return { ok: true };
  } catch (e) {
    await flashBadge("ERR", "#b91c1c");
    return { ok: false, error: "Couldn't open the instruction box here: " + e.message };
  }
}

// ---- wiring ----
chrome.runtime.onInstalled.addListener((details) => {
  buildMenus();
  applyTownieIcon();
  if (details && details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("onboarding.html") });
  }
});
chrome.runtime.onStartup.addListener(() => applyTownieIcon());

// v4.2 built structured menu ids (town|<target>|<kind>|<value>) but kept the
// v4.1 flat-id handler, so no submenu item ever matched and every right-click
// capture silently did nothing. Dispatch through parseMenuId instead.
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const parsed = parseMenuId(info.menuItemId);
  if (!parsed) return;
  const { target, kind, value } = parsed;
  if (kind === "parent" || kind === "sep") return;

  if (kind === "ask") { await openInstructionBox(tab); return; }

  // Send now and the quick actions inherit the default collection; an
  // explicit "File into" always wins.
  const cfg = await chrome.storage.sync.get(["defaultCollection"]);
  const opts = { collection: cfg.defaultCollection || "" };
  if (kind === "collection") opts.collection = value;
  if (kind === "action") {
    const action = QUICK_ACTIONS.find((a) => a.id === value);
    if (action) opts.note = action.note;
  }

  if (target === "selection") {
    opts.selectionOnly = true;
    opts.selectionText = info.selectionText || "";
  } else if (target === "link") {
    opts.linkUrl = info.linkUrl || "";
  } else {
    opts.selectionOnly = false;
  }
  await sendCapture(opts);
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "capture-page") sendCapture({ selectionOnly: false });
  else if (command === "capture-all-tabs") sendAllTabs({});
  else if (command === "ask-town") openInstructionBox();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.townieIconDataUrl) applyTownieIcon();
  // Keep the "File into" submenu in step with the collections list in Settings.
  if (area === "sync" && changes.collections) buildMenus();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg) return;
  if (msg.type === "capture") {
    sendCapture({ selectionOnly: msg.selectionOnly, note: msg.note, instruction: msg.instruction || "", selectionText: msg.selectionText || "", collection: msg.collection || "" }).then(sendResponse);
    return true;
  }
  if (msg.type === "captureAll") {
    sendAllTabs({ note: msg.note, instruction: msg.instruction || "", collection: msg.collection || "" }).then(sendResponse);
    return true;
  }
  // From the in-page instruction box. The page it was opened on is the
  // capture, so it inherits the default collection like any other quick send.
  if (msg.type === "askTown") {
    (async () => {
      const cfg = await chrome.storage.sync.get(["defaultCollection"]);
      return sendCapture({
        selectionOnly: false,
        instruction: msg.instruction || "",
        selectionText: msg.selectionText || "",
        collection: cfg.defaultCollection || ""
      });
    })().then(sendResponse);
    return true;
  }
  if (msg.type === "openInstructionBox") { openInstructionBox().then(sendResponse); return true; }
  if (msg.type === "test") { testConnection(msg).then(sendResponse); return true; }
  if (msg.type === "applyIcon") { applyTownieIcon().then(() => sendResponse({ ok: true })); return true; }
  if (msg.type === "resetIcon") { resetIcon().then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false })); return true; }
});
