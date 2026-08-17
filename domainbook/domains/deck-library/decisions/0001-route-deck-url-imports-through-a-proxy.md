---
status: accepted
date: 2026-08-16
decision-makers: [RafaelAugustScherer]
authored-by: agent
---

# Route deck-URL imports through a proxy

## Context and Problem Statement

`import-from-a-url` fetches a deck from Moxfield or Archidekt and turns it into the
same decklist text the author would paste. But the app runs fully client-side as a
static site (`ADR-0003`), and every target site blocks a direct browser fetch from
our origin: Archidekt pins CORS to `localhost:3000`, Moxfield is Cloudflare
bot-gated (403 to non-approved clients), and Ligamagic loads its cards through a
per-request page session with no stable URL. How can a backend-less site fetch them?

## Considered Options

- **Direct browser fetch** to each site's API.
- **Route through a proxy** that adds the CORS/headers the browser can't.
- **Drop URL import** and keep paste-only.

## Decision Outcome

Chosen: **route the fetch through a proxy**, selected by `VITE_DECK_PROXY`
(a `?url=`-style base).

- **Owned Cloudflare Worker (`deck-proxy/`)** is the recommended path: reliable, and
  able to send an approved User-Agent.
- **A public proxy** is the zero-config default so a fresh clone isn't inert, at the
  cost of rate limits and occasional downtime.

Per site: **Archidekt** works through either proxy. **Moxfield** answers only
requests carrying a User-Agent it has approved, so it needs the owned worker;
Moxfield's ToS also prohibits unapproved scraping. **Ligamagic** is not
auto-importable — its per-request session token means no stable URL a static-site
proxy can fetch — so the URL is recognized and the author is told to export and
paste instead.

### Consequences

- Good: URL import works from a static site with no backend of our own; the owned
  worker gives a reliable, ToS-respecting path; the default keeps the feature live
  out of the box.
- Bad: a proxy is now on the fetch path (a dependency and a trust boundary); the
  public default is unreliable; Moxfield depends on holding an approved UA;
  Ligamagic stays paste-only.

## More Information

Consequence of `ADR-0003`. Open questions (public vs owned proxy, later Ligamagic
support) are tracked in the `import-from-a-url` feature spec.
