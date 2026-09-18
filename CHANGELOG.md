# Changelog

## 4.3.0
- **Ask Town from the page.** Ctrl/Cmd+Shift+K (or right-click -> **Ask Town to do something...**) opens a small box at your selection where you can type a freeform instruction -- "draft a reply asking about the storage fee" -- instead of picking a note preset. The popup gains a matching "Ask Town to do something" field. This completes the in-page box flagged as the known next step in 4.2.0.
- **New `instruction` payload field, deliberately separate from `note`.** Both are user-typed, so the split is not about trust -- it is about intent and blast radius. `note` is filing context read by the capture routine and never causes work to happen; `instruction` is the explicit signal that the user wants something done, and is the only field that may direct action. Keeping them apart means a populated note can't trigger a task, and the routine never has to guess which one it is looking at.
- **The routine dispatches instructions instead of executing them.** Web Capture Inbox files the capture as always, then calls `create_task` once to hand the instruction to a separate assistant session (visible on the Town tasks page, which notifies when done). The capture routine itself still sends nothing externally.
- **A deliberate ceiling on dispatched work:** drafting email (drafts only), documents, notes, research, and holds on the user's own calendar. Never sending mail, messaging anyone, RSVPing, adding attendees, or purchases. An instruction asking to send something is downgraded to a draft and says so. Page content remains untrusted and can never promote itself into an instruction.
- Instructions are skipped on all-tabs sweeps (they would spawn one task per tab) and recorded in the `capture-log` "To act on" section instead.
- **Fix: right-click captures did nothing at all in 4.2.0.** `buildMenus()` created structured menu ids (`town|<target>|<kind>|<value>`) and added `parseMenuId()` to decode them, but the `onClicked` handler still compared against the old flat v4.1 ids (`town-send-selection` and friends), so no submenu item ever matched and `parseMenuId` was never called. The handler now dispatches through `parseMenuId`, which also makes the quick-action and "File into" submenus work as documented.

## 4.2.0
- Right-click captures can now carry context. Each context-menu entry (selection / page / link) is a parent with a submenu: **Send now**, the popup's quick actions (Summarize / Read later / Add todo / Reference) as note presets, and **File into: &lt;collection&gt;**. Previously a right-click sent with an empty note and Auto collection, so the only way to add context was the popup.
- Send now and the quick actions inherit the default collection (matching how the popup pre-selects it); an explicit **File into** always wins.
- The "File into" submenu rebuilds when the collections list changes in Settings, and menus are rebuilt on browser startup as well as install.
- Documented an in-page note overlay at the selection (typed context rather than presets) as the known next step for the right-click path.

## 4.1.1
- Auto-save on a successful Test: clicking Test now stores the webhook URL, secret, and collections when the ping succeeds, so a green test can no longer pass while captures use stale/empty saved values. Status now reads "Connected ... Saved."

## 4.1.0
- Documented quick actions (the popup chips) in onboarding and SETUP.md: they are note presets the routine reads as filing hints -- stackable, and equivalent to typing the instruction into the note yourself.
- Clearer collections guidance in onboarding, Settings, SETUP.md, and the setup skill: the list is a static, user-chosen set of popup shortcuts (not read from your library), Town always adds a type subfolder, and Auto files into captures/<type>.
- Setup skill: make getting the extension package (clone or download ZIP from GitHub) an explicit first step, so a new browser or new user is never assumed to already have the files.
- Renamed the developer companion skill folder `skill/` to `dev-skill/` so it is not confused with the end-user setup skill.
- Added a Town setup skill (town-setup-skill/): import it and your Townie creates the Web Capture Inbox routine, then guides you through the webhook, extension load, and test.
- Added SETUP.md: a self-serve setup guide with the copy-paste routine prompt and step-by-step for the routine + extension.
- Renamed the extension to "Send to Town" across the UI, code, and docs.
- Neutral default icon (a generic save mark) so installers no longer inherit the author's Townie.
- Onboarding now guides you to set your own Townie as the toolbar icon, including where to find your Townie image.
- Settings button now reads "Reset to default".

## 4.0.0
- Send all open tabs in the current window (button + Ctrl/Cmd+Shift+E).
- Collection routing: choose a target Content Library collection per capture, or Auto.
- Quick-action chips in the popup (Summarize / Read later / Add todo / Reference).
- Keyboard shortcuts for page capture and all-tabs capture.
- Test connection button in Settings and onboarding.
- Real packaged icon set; optional runtime "use your Townie" icon.
- Guided first-run onboarding page.
- Right-click "Send this link to Town"; richer metadata (author, published, canonical).

## 3.x
- Page + selection capture, LinkedIn/X extraction, webhook POST with bearer secret, context menus, badge feedback.
