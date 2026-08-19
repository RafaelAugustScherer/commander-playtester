# Deck import proxy

The playtester imports decks from Moxfield and Archidekt URLs. Because it's a
static site, the browser can't call those deck APIs directly — Moxfield and
Archidekt only send permissive CORS headers to their own front-ends, so a
cross-origin `fetch` from the app is blocked. This tiny [Cloudflare Worker][cf]
forwards one allowlisted request and adds the CORS headers the browser needs.

By default the app tries a chain of public proxies (`api.allorigins.win`,
`api.codetabs.com`) in turn, taking the first that answers. Each is
rate-limited and intermittently down, so trying several is more reliable than
one — but none is dependable, and reaching Moxfield needs an approved
User-Agent (see below) that public proxies don't send. Deploy this worker for
reliable imports.

## Deploy

```bash
npm install -g wrangler   # or: npx wrangler ...
cd deck-proxy
wrangler deploy
```

Then build the app pointing at your worker:

```bash
VITE_DECK_PROXY="https://<your-worker>.workers.dev/?url=" npm run build
```

(Locally, put that line in a `.env.local` at the repo root.) Set
`VITE_DECK_PROXY=""` to fetch directly instead — only useful if you run the app
from a browser extension or another context where CORS doesn't apply.

## Moxfield

Moxfield sits behind Cloudflare bot protection and answers automated requests
only when they carry a **User-Agent it has approved**. Email
`support@moxfield.com` to request one, then store it as a secret:

```bash
wrangler secret put MOXFIELD_USER_AGENT
```

Without an approved User-Agent, Moxfield imports return a network error (their
edge replies 403). Archidekt imports work with no extra setup.

## Ligamagic

Ligamagic isn't supported for automatic import: its deck contents load through a
page session with a per-request token, so there's no stable URL a proxy can
fetch. Open the deck on Ligamagic, use its export, and paste the list into the
editor instead.

[cf]: https://developers.cloudflare.com/workers/
