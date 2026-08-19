# Agent guide

Notes for automated agents working in this repo. Human-facing docs live in
`domainbook/` and `README`-style files; this file is about the tooling agents
lean on.

## Fast-forward to a match: `scripts/prepare-match.mjs`

Validating a decklist by hand means clicking: new deck → paste → save → open →
play → match setup. This script automates that whole path and stops at **match
setup — the screen one click before a game starts** — so you can confirm a deck
survives authoring and setup in seconds instead of driving the UI yourself.

It always starts from a blank slate: **any existing saved decks are removed
first**, then it creates a throwaway opponent (the built-in example) and the
player deck under test, and drives through to match setup.

### One-time setup

The browser automation uses [Playwright](https://playwright.dev). It's a dev
dependency of *this project* (nothing is installed globally), and the browser
binary is pinned **inside `node_modules`** — `rm -rf node_modules` removes
everything, and no machine-wide cache is touched.

```bash
npm install                 # installs the playwright dev dependency
npm run prepare-match:install   # downloads Chromium into node_modules (~95 MB)
```

### Usage

Needs the app running. Either start it yourself first:

```bash
npm run dev                 # in one terminal, then:
npm run prepare-match       # validates the built-in example deck
```

…or let the script start and stop its own server with `--serve`:

```bash
npm run prepare-match -- --serve --deck path/to/decklist.txt
```

`--deck <file>` is a Moxfield/Archidekt-style decklist (the same text the deck
editor accepts, `Commander` / `Deck` sections and all). Without it, the built-in
example deck is used for both seats.

### Flags

| Flag | Effect |
| --- | --- |
| `--deck <file>` | Decklist file to load as the player deck (default: built-in example). |
| `--serve` | Start `npm run dev`, use the URL it prints, and stop it on exit. |
| `--headed` | Show the browser instead of running headless. |
| `--keep-open` | Leave the browser open at match setup for hands-on takeover (implies `--headed`). |
| `--screenshot <path>` | Where to write the final screenshot (default `scripts/.artifacts/pre-game.png`). |

`BASE_URL` (env) overrides the app URL when not using `--serve` (default
`http://localhost:5173`).

### Output

- **Success**: prints `READY`, the deck names, the enabled Start button label,
  and writes a screenshot of the match-setup screen. Exit code `0`.
- **Failure**: prints `FAILED: <reason>` and writes a screenshot of where it got
  stuck. Exit code `1`. A deck that can't be saved reports the exact editor
  error — e.g. a short deck yields
  *"…is not saveable (99 cards): A Commander deck needs exactly 100 cards…"*.

The exit code makes it usable as a check: a valid, engine-ready deck reaches
match setup and exits `0`; anything that breaks authoring or setup exits `1`.
