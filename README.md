# Send to Town

> New here? Start with **[SETUP.md](SETUP.md)** -- the full step-by-step (routine + extension), including the copy-paste routine prompt.

A tiny browser extension that captures what you're reading -- a page, a highlight, or every open tab -- and sends it to your **Town** assistant, which classifies it, summarizes it, and files it into your Content Library. Capture happens in your logged-in browser session, so it works on content a server-side fetch can't reach (LinkedIn posts, gated articles).

This is the *collector* half of a collector -> processor design. The *processor* half is a webhook-triggered Town routine (the **Web Capture Inbox**). The extension is generic: it just POSTs a small JSON payload to your routine's webhook.

## Repo layout

```
SETUP.md            Start here: full setup guide (routine prompt + extension steps)
extension/          The unpacked browser extension -- load THIS folder in Chrome/Edge.
  manifest.json     MV3 manifest (icons, keyboard shortcuts, options, background worker)
  background.js     Service worker: page extraction, single/selection/all-tabs capture, Townie icon
  popup.html/js     Toolbar popup: quick-action chips, note, collection routing, send buttons
  options.html/js   Settings: webhook URL + secret, Test connection, collections, Townie icon
  onboarding.html/js First-run setup guide (opens automatically on install)
  icons/            Neutral default icon set (16/32/48/128 + 512 master)
routine/            Spec + contract for the Town-side Web Capture Inbox processor routine
dev-skill/          Claude skill companion for iterating on the code with a coding agent
town-setup-skill/   Town setup skill: import it and your Townie creates the routine + guides setup
```

## Quick start (for yourself)

1. In Town, install/open the **Web Capture Inbox** routine, enable its webhook, and copy the URL + secret.
2. Go to `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and pick the `extension/` folder.
3. The setup guide opens automatically. Paste your webhook URL + secret, hit **Test connection**, pick your collections, and optionally set your Townie icon.

## What's new in v4

- **Send all open tabs** -- sweep an entire window to Town in one action (or with a keyboard shortcut).
- **Collection routing** -- steer a capture into a specific Content Library collection, or leave it on Auto.
- **Quick-action chips** -- one tap for Summarize / Read later / Add todo / Reference instead of typing.
- **Keyboard shortcuts** -- Ctrl/Cmd+Shift+S (page), Ctrl/Cmd+Shift+E (all tabs); editable at chrome://extensions/shortcuts.
- **Test connection** -- verify your webhook right from Settings.
- **Neutral default icon, personalized to your Townie** -- ships with a generic save mark; each installer sets their own Townie as the toolbar button.
- **Guided onboarding** -- a first-run wizard so anyone can set it up, not just the person who built it.
- Richer metadata (author, publish date, canonical URL) and right-click **Send this link to Town**.
- **Right-click submenus (v4.2)** -- highlight, right-click, and add context without the popup: **Send now**, the same quick actions as the chips, or **File into: &lt;collection&gt;**. *Known next step:* an in-page note box at the selection, for typing freeform context instead of picking a preset -- not built yet; use the popup when you need to type a real note.

## Sharing it with other Town users

The extension is the same for everyone; each person needs their own processor routine + webhook secret. Package the Web Capture Inbox as a Town **Installable Routine** so others can install it in a click, then point them at this extension. See `routine/web-capture-inbox.md`. No team? Share the setup skill in `town-setup-skill/` instead: a Town user imports it and their own assistant creates the routine and walks them through the rest.

## License

MIT -- see `LICENSE`.
