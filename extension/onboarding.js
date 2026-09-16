async function load() {
  const cfg = await chrome.storage.sync.get(["webhookUrl", "webhookSecret", "collections"]);
  if (cfg.webhookUrl) document.getElementById("url").value = cfg.webhookUrl;
  if (cfg.webhookSecret) document.getElementById("secret").value = cfg.webhookSecret;
  if (Array.isArray(cfg.collections) && cfg.collections.length) document.getElementById("collections").value = cfg.collections.join(", ");
  const local = await chrome.storage.local.get(["townieIconDataUrl"]);
  if (local.townieIconDataUrl) document.getElementById("iconPreview").src = local.townieIconDataUrl;
}
function parseCollections(v) { return (v || "").split(",").map((s) => s.trim()).filter(Boolean); }
function fileToDataUrl(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); }); }
async function urlToDataUrl(url) { const b = await (await fetch(url)).blob(); return fileToDataUrl(b); }

document.getElementById("test").addEventListener("click", async () => {
  const webhookUrl = document.getElementById("url").value.trim();
  const webhookSecret = document.getElementById("secret").value.trim();
  const t = document.getElementById("tested"); t.textContent = "Testing..."; t.className = "status";
  const resp = await chrome.runtime.sendMessage({ type: "test", webhookUrl, webhookSecret });
  if (resp && resp.ok) {
    const collections = parseCollections(document.getElementById("collections").value);
    await chrome.storage.sync.set({ webhookUrl, webhookSecret, collections });
    t.textContent = "Connected and saved."; t.className = "status ok";
  } else { t.textContent = (resp && resp.error) || "Test failed."; t.className = "status err"; }
});

document.getElementById("applyIcon").addEventListener("click", async () => {
  const t = document.getElementById("saved");
  try {
    const file = document.getElementById("iconFile").files[0];
    const url = document.getElementById("iconUrl").value.trim();
    let dataUrl = "";
    if (file) dataUrl = await fileToDataUrl(file);
    else if (url) dataUrl = await urlToDataUrl(url);
    else { t.textContent = "Add a URL or choose a file first."; t.className = "status err"; return; }
    await chrome.storage.local.set({ townieIconDataUrl: dataUrl });
    document.getElementById("iconPreview").src = dataUrl;
    await chrome.runtime.sendMessage({ type: "applyIcon" });
    t.textContent = "Icon updated."; t.className = "status ok"; setTimeout(() => (t.textContent = ""), 2000);
  } catch (e) { t.textContent = "Couldn't load that image: " + e.message; t.className = "status err"; }
});

document.getElementById("finish").addEventListener("click", async () => {
  const webhookUrl = document.getElementById("url").value.trim();
  const webhookSecret = document.getElementById("secret").value.trim();
  const collections = parseCollections(document.getElementById("collections").value);
  await chrome.storage.sync.set({ webhookUrl, webhookSecret, collections });
  const s = document.getElementById("saved"); s.textContent = "Saved. You're ready to capture."; s.className = "status ok";
});

load();
