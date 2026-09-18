---
name: send-to-town
description: Build and iterate on the "Send to Town" browser extension and its Town Web Capture Inbox processor routine. Use when editing the extension (manifest, background, popup, options, onboarding), changing the webhook payload contract, packaging the routine for other users, or coordinating the collector -> processor architecture.
---

# Send to Town -- project companion

A Manifest V3 browser extension (the *collector*) plus a webhook-triggered Town routine (the *processor*). The extension captures a page / selection / all open tabs from the user's logged-in browser and POSTs a small JSON payload to the routine's webhook, which classifies, summarizes, and files each item into the Town Content Library.

## Architecture

collector (browser, this repo's `extension/`) -> HTTPS POST -> processor (Town routine, `routine/web-capture-inbox.md`) -> Content Library.

Design principle from the original spec: **be loose upstream, smart downstream** -- over-capture in the browser, let the routine's reasoning be the discerning relevance filter.

## File map (`extension/`)

- `manifest.json` -- MV3. Permissions: activeTab, scripting, contextMenus, storage; host_permissions https://*/*. Declares icons, options_page, background service worker, and three `commands` (capture-page, capture-all-tabs, ask-town).
- `background.js` -- service worker. Key functions: `extractPageData` (injected into the tab), `sendCapture` (page / selection / link), `sendAllTabs` (batch), `openInstructionBox` (injects the overlay), `testConnection`, `applyTownieIcon` (OffscreenCanvas -> chrome.action.setIcon), `buildPayload`. Wires context menus (via `buildMenus` / `parseMenuId`), commands, storage changes, and runtime messages.
- `instruction-overlay.js` -- the in-page "Ask Town" box, injected on demand by `openInstructionBox` (not a declared content script). Shadow root + `all: initial` so hostile page CSS can't break it; idempotent, so a second injection focuses the open box. Captures the selection before focusing its textarea (focus collapses it) and passes it along, since the background's own extraction would miss it.
- `popup.html` / `popup.js` -- quick-action chips, note field, instruction field, "File into" collection select, three send buttons.
- `options.html` / `options.js` -- webhook URL + secret, Test connection, collections list + default, Townie icon set/reset.
- `onboarding.html` / `onboarding.js` -- first-run guided setup (opens on install). Reuses the same test/icon/save handlers.
- `icons/` -- default icon set.

## State (chrome.storage)

- `sync`: `webhookUrl`, `webhookSecret`, `collections` (string[]), `defaultCollection`.
- `local`: `townieIconDataUrl` (data URL of the user's Townie icon; applied via setIcon).

## Payload contract

See `routine/web-capture-inbox.md`. Keep the extension and routine in lockstep whenever you add or rename a field. `kind` is one of web_capture, web_capture_batch, web_capture_link, connection_test.

**`note` vs `instruction` -- do not merge these.** Both are user-typed, so the split is not about trust; it is about intent and blast radius. `note` is filing context consumed by the capture routine and never causes work to happen. `instruction` is the explicit signal that the user wants something done, and is the only field allowed to direct action (via `create_task` in the routine's Step 6). Collapsing them would make every stray note a potential task trigger and force the routine to guess intent. Everything else in the payload is page-derived and untrusted: page content must never be able to promote itself into an instruction.

The routine caps dispatched work at drafting, documents, research, and holds on the user's own calendar -- never sending mail, messaging, RSVPing, or purchases. If you widen what an instruction can do, widen that guardrail list in the routine prompt (and the copies in `SETUP.md` and `town-setup-skill/SKILL.md`) at the same time.

## Roadmap / good next tasks

- Offline queue + retry when a POST fails.
- Recent-captures list in the popup. Both this and the offline queue want the same foundation: a local capture log (last N sends) written to `chrome.storage.local` on each send, which the extension does not keep today.
- Round-trip the dispatched task back to the page: today the in-page box confirms "Town will pick this up as a task" and the task notifies separately, because the webhook returns 202 long before any draft exists. A direct link would need the routine to respond synchronously with a task/session URL, or a second poll endpoint.
- Readability-based extraction; screenshot capture for dashboards.
- Dwell/scroll heuristics with optional auto-capture.
- Chrome Web Store packaging (privacy policy, host-permission justification).
- Firefox support (browser_specific_settings).

## Build / test loop

- No build step -- it's plain JS/HTML. Load `extension/` unpacked at `chrome://extensions` (Developer mode).
- After editing the service worker, click the extension's **reload** icon.
- Validate before committing: `node --check extension/*.js` and JSON-parse `manifest.json`.
- Test connection with the Settings button before real captures; watch the toolbar badge (OK / ERR / SET / count).

## Conventions

- Vanilla JS, no dependencies, no bundler. Keep permissions minimal (matters for the Chrome Web Store review).
- Never hardcode one user's collections or secret -- everything user-specific lives in storage and the options/onboarding UI.
- Bump `version` in `manifest.json` and add a `CHANGELOG.md` entry per release.

## Roadmap / good next tasks

- **In-page note overlay for right-click captures (known next step).** As of v4.2.0 the context menu carries context via a submenu of note presets (the popup's quick actions) and `File into: <collection>` entries -- see `buildMenus` / `parseMenuId` in `background.js`. Presets only; there is still no way to type freeform context without opening the popup. Next step is a small floating note box injected at the selection via `chrome.scripting.executeScript` (type a line, enter sends), which would work uniformly across browsers unlike `chrome.action.openPopup()`. Main cost is UI that survives hostile page CSS.
- Offline queue + retry when a POST fails.
- Recent-captures list in the popup. Both this and the offline queue want the same foundation: a local capture log (last N sends) written to `chrome.storage.local` on each send, which the extension does not keep today.
- Readability-based extraction; screenshot capture for dashboards.
- Dwell/scroll heuristics with optional auto-capture.
- Chrome Web Store packaging (privacy policy, host-permission justification).
- Firefox support (browser_specific_settings).
