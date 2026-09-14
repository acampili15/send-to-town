# Web Capture Inbox -- processor routine

The Town-side half of Send to Star. A **webhook-triggered** routine that receives captures from the extension, judges relevance, summarizes, and files each item into the Content Library. It only classifies, summarizes, and files -- it never sends anything externally.

## Trigger

Webhook. Each installer enables the webhook on their own copy and gets a unique URL + secret, which they paste into the extension. Requests carry `Authorization: Bearer <secret>` and an `X-Town-Idempotency-Key` header.

## Request payload

```jsonc
POST <webhook-url>
Authorization: Bearer <secret>
Content-Type: application/json
X-Town-Idempotency-Key: <uuid>

{
  "data": {
    "source": "browser-extension",
    "kind": "web_capture" | "web_capture_batch" | "web_capture_link" | "connection_test",
    "url": "https://...",
    "title": "Page title",
    "site": "example.com",
    "selection": "highlighted text, if any",
    "description": "meta description / og:description",
    "author": "meta author, if any",
    "published": "article:published_time, if any",
    "canonical": "canonical URL, if any",
    "text": "extracted main text (empty for selection-only or link captures)",
    "note": "user note + any quick-action tags",
    "collection": "target collection slug, or \"\" for Auto",
    "capturedAt": "ISO-8601",
    "batchId": "present on web_capture_batch items"
  }
}
```

## Processing

1. **connection_test** -> acknowledge (2xx) and stop; don't file anything.
2. Otherwise: if `text` is thin and `kind` is `web_capture_link` (or auth allows), fetch the URL for fuller content.
3. Judge relevance against the user's profile/interests; drop low-signal captures.
4. Summarize: key points + why it matters + tags.
5. File into the Content Library. If `collection` is set, honor it; otherwise auto-sort (e.g. reading / captures / social / personal).
6. Maintain one running capture log. `batchId` groups an all-tabs sweep.

## Response

Return 2xx quickly (202 preferred) so the extension can show its OK badge; do the heavy lifting asynchronously. Non-2xx tells the extension something's wrong (401/403 = bad secret, 404 = wrong/disabled webhook).

## Packaging as an Installable Routine (for other Town users)

- Publish this routine as an **Installable Routine** so others install their own copy in a click.
- Each installer enables their own webhook (own URL + secret) -- never share a secret between users.
- Collections differ per user; keep auto-sort sensible and let the extension's collection list override.
- Ship the extension via this repo (dev-mode load) or the Chrome Web Store for one-click installs.
