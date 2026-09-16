# Changelog

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
