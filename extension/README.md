# Send to Town -- browser extension (v4)

Capture the current page, your highlighted text, or every open tab and POST it to your Town **Web Capture Inbox** routine, which classifies, summarizes, and files it into your Content Library.

## One-time setup

1. **Turn on the routine's webhook.** In Town, open the **Web Capture Inbox** routine -> **Config** -> **Webhook** -> pick your account -> **Enable**. Copy the **webhook URL** and the **secret** (shown once).
2. **Load the extension.** Go to `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select this `extension/` folder. A setup guide opens automatically.
3. **Finish setup.** In the guide (or Settings), paste the **URL** and **secret**, click **Test connection**, set your **collections**, and optionally your **Townie icon**.

## Using it

- **Popup:** click the toolbar button. Tap quick-action chips, add a note, optionally type an instruction under "Ask Town to do something", choose a collection, then **Send this page**, **Send highlighted text only**, or **Send all open tabs**.
- **Right-click:** on a selection -> *Send selection to Town*; on a page -> *Send page to Town*; on a link -> *Send this link to Town*. Each opens a submenu so the capture can carry context without the popup: **Send now**, **Ask Town to do something...** (selection and page only), the same quick actions as the chips (Summarize / Read later / Add todo / Reference), and **File into: &lt;collection&gt;**. Send now and the quick actions use your default collection; an explicit *File into* overrides it.
- **Ask Town (in-page box):** Ctrl/Cmd+Shift+K, or the right-click entry, opens a small box at your selection. Type a freeform instruction, Enter to send, Esc to close. See "Notes vs instructions" below.
- **Keyboard:** Ctrl/Cmd+Shift+S sends the page; Ctrl/Cmd+Shift+E sends all open tabs; Ctrl/Cmd+Shift+K opens the instruction box. Remap at `chrome://extensions/shortcuts`.

## Notes vs instructions

Both are typed by you, and the payload keeps them in separate fields on purpose.

- `note` is **filing context** -- why you saved it, how to file it. The quick-action chips are note presets. A note never causes work to happen.
- `instruction` **asks Town to do something** with the capture. The routine files the item as usual, then hands the instruction to a separate assistant task that lands on your Town tasks page and notifies you when it's done.

That separation is the safety boundary. Page text is untrusted and can never become an instruction; only what you type in the instruction field directs any action. The task can draft emails, write documents, research, and hold time on your own calendar -- it cannot send email, message anyone, or take any action visible outside your account. Instructions are skipped on all-tabs sweeps (one task per tab would be a mess) and logged in your `capture-log` instead.

A green **OK** badge means it went through; a red **ERR** (or **SET** if unconfigured) means it didn't -- open the popup for the reason.

## Settings

- **Webhook URL / Secret** -- from the routine. **Test connection** fires a harmless ping.
- **Collections** -- comma-separated list shown in the popup's "File into" menu. A default selection is optional.
- **Your Townie icon** -- the extension ships with a neutral default icon. To use your own: open your [Town assistant settings](https://www.town.com/settings/assistant/personality), save your Townie's image, and upload it here (or paste its URL). **Reset to default** restores the neutral icon.

## Security note

The secret is stored in your browser's extension storage (synced across your Chrome profile). Keep this folder private. If the secret is ever exposed, rotate it in the routine's Webhook settings and update it here.
