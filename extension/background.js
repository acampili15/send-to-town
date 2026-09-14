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
    const data = buildPayload(Object.assign({}, EMPTY_PAGE, { url: options.linkUrl }), { note: options.note, collection: options.collection });
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

// ---- wiring ----
chrome.runtime.onInstalled.addListener((details) => {
  chrome.contextMenus.create({ id: "town-send-selection", title: "Send selection to Town", contexts: ["selection"] });
  chrome.contextMenus.create({ id: "town-send-page", title: "Send page to Town", contexts: ["page"] });
  chrome.contextMenus.create({ id: "town-send-link", title: "Send this link to Town", contexts: ["link"] });
  applyTownieIcon();
  if (details && details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("onboarding.html") });
  }
});
chrome.runtime.onStartup.addListener(() => applyTownieIcon());

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === "town-send-selection") sendCapture({ selectionOnly: true, selectionText: info.selectionText || "" });
  else if (info.menuItemId === "town-send-page") sendCapture({ selectionOnly: false });
  else if (info.menuItemId === "town-send-link") sendCapture({ linkUrl: info.linkUrl || "" });
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "capture-page") sendCapture({ selectionOnly: false });
  else if (command === "capture-all-tabs") sendAllTabs({});
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.townieIconDataUrl) applyTownieIcon();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg) return;
  if (msg.type === "capture") {
    sendCapture({ selectionOnly: msg.selectionOnly, note: msg.note, selectionText: msg.selectionText || "", collection: msg.collection || "" }).then(sendResponse);
    return true;
  }
  if (msg.type === "captureAll") {
    sendAllTabs({ note: msg.note, collection: msg.collection || "" }).then(sendResponse);
    return true;
  }
  if (msg.type === "test") { testConnection(msg).then(sendResponse); return true; }
  if (msg.type === "applyIcon") { applyTownieIcon().then(() => sendResponse({ ok: true })); return true; }
  if (msg.type === "resetIcon") { resetIcon().then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false })); return true; }
});
