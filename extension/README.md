# Send to Town -- browser extension (v4)

Capture the current page, your highlighted text, or every open tab and POST it to your Town **Web Capture Inbox** routine, which classifies, summarizes, and files it into your Content Library.

## One-time setup

1. **Turn on the routine's webhook.** In Town, open the **Web Capture Inbox** routine -> **Config** -> **Webhook** -> pick your account -> **Enable**. Copy the **webhook URL** and the **secret** (shown once).
2. **Load the extension.** Go to `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select this `extension/` folder. A setup guide opens automatically.
3. **Finish setup.** In the guide (or Settings), paste the **URL** and **secret**, click **Test connection**, set your **collections**, and optionally your **Townie icon**.

## Using it

- **Popup:** click the toolbar button. Tap quick-action chips, add a note, choose a collection, then **Send this page**, **Send highlighted text only**, or **Send all open tabs**.
- **Right-click:** on a selection -> *Send selection to Town*; on a page -> *Send page to Town*; on a link -> *Send this link to Town*.
- **Keyboard:** Ctrl/Cmd+Shift+S sends the page; Ctrl/Cmd+Shift+E sends all open tabs. Remap at `chrome://extensions/shortcuts`.

A green **OK** badge means it went through; a red **ERR** (or **SET** if unconfigured) means it didn't -- open the popup for the reason.

## Settings

- **Webhook URL / Secret** -- from the routine. **Test connection** fires a harmless ping.
- **Collections** -- comma-separated list shown in the popup's "File into" menu. A default selection is optional.
- **Your Townie icon** -- the extension ships with a neutral default icon. To use your own: open your [Town assistant settings](https://www.town.com/settings/assistant/personality), save your Townie's image, and upload it here (or paste its URL). **Reset to default** restores the neutral icon.

## Security note

The secret is stored in your browser's extension storage (synced across your Chrome profile). Keep this folder private. If the secret is ever exposed, rotate it in the routine's Webhook settings and update it here.
