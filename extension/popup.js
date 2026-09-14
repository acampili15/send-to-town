const statusEl = document.getElementById("status");
const selectedTags = new Set();
function setStatus(t, c) { statusEl.textContent = t; statusEl.className = c || ""; }

function composedNote() {
  const free = document.getElementById("note").value.trim();
  const tags = Array.from(selectedTags);
  return [tags.join("; "), free].filter(Boolean).join(" - ");
}

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const tag = chip.dataset.tag;
    if (selectedTags.has(tag)) { selectedTags.delete(tag); chip.classList.remove("on"); }
    else { selectedTags.add(tag); chip.classList.add("on"); }
  });
});

async function loadCollections() {
  const sel = document.getElementById("collection");
  const cfg = await chrome.storage.sync.get(["collections", "defaultCollection"]);
  const list = (Array.isArray(cfg.collections) && cfg.collections.length) ? cfg.collections : ["reading", "captures", "social", "personal"];
  const opts = ['<option value="">Auto - let Star sort</option>'].concat(list.map((c) => '<option value="' + c + '">' + c + '</option>'));
  sel.innerHTML = opts.join("");
  if (cfg.defaultCollection) sel.value = cfg.defaultCollection;
}

async function capture(kind) {
  const note = composedNote();
  const collection = document.getElementById("collection").value;
  setStatus(kind === "all" ? "Sending your open tabs..." : "Sending...", "");
  let resp;
  if (kind === "all") resp = await chrome.runtime.sendMessage({ type: "captureAll", note, collection });
  else resp = await chrome.runtime.sendMessage({ type: "capture", selectionOnly: kind === "selection", note, collection });
  if (resp && resp.ok) {
    if (kind === "all") setStatus("Sent " + (resp.sent || 0) + " of " + (resp.total || 0) + " tabs to Star.", "ok");
    else setStatus("Sent to Star.", "ok");
  } else {
    setStatus((resp && resp.error) || "Something went wrong.", "err");
  }
}

document.getElementById("send-page").addEventListener("click", () => capture("page"));
document.getElementById("send-selection").addEventListener("click", () => capture("selection"));
document.getElementById("send-all").addEventListener("click", () => capture("all"));
document.getElementById("open-options").addEventListener("click", (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); });
document.getElementById("open-onboarding").addEventListener("click", (e) => { e.preventDefault(); chrome.tabs.create({ url: chrome.runtime.getURL("onboarding.html") }); });

loadCollections();
