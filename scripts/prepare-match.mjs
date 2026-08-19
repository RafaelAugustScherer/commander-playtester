#!/usr/bin/env node
// Drive the app from a blank slate to the match-setup screen — the point just
// before a game starts — so agents can validate the authoring + setup path fast.
//
// Usage: node scripts/prepare-match.mjs [--deck <file>] [--serve]
//                                       [--headed] [--keep-open]
//                                       [--screenshot <path>]
// See AGENTS.md for the full contract.

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, basename, extname, resolve } from "node:path";

const DECKS_KEY = "commander-playtester/decks/v1";
const LANG_KEY = "commander-playtester/lang/v1";

function parseArgs(argv) {
  const opts = {
    deck: null,
    serve: false,
    headed: false,
    keepOpen: false,
    screenshot: "scripts/.artifacts/pre-game.png",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--deck") opts.deck = argv[++i];
    else if (a === "--screenshot") opts.screenshot = argv[++i];
    else if (a === "--serve") opts.serve = true;
    else if (a === "--headed") opts.headed = true;
    else if (a === "--keep-open") opts.keepOpen = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (opts.keepOpen) opts.headed = true;
  return opts;
}

function startDevServer() {
  return new Promise((resolveUrl, reject) => {
    const child = spawn("npm", ["run", "dev"], { stdio: ["ignore", "pipe", "pipe"] });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("dev server did not report a URL within 60s"));
    }, 60_000);
    const onData = (buf) => {
      const m = String(buf).match(/Local:\s+(http:\/\/\S+)/);
      if (m) {
        clearTimeout(timer);
        child.stdout.off("data", onData);
        resolveUrl({ url: m[1].replace(/\/$/, ""), child });
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", () => {});
    child.on("exit", (code) => reject(new Error(`dev server exited early (code ${code})`)));
  });
}

async function shot(page, path) {
  mkdirSync(dirname(resolve(path)), { recursive: true });
  await page.screenshot({ path: resolve(path), fullPage: true });
}

async function createDeck(page, { name, deckText }) {
  await page.getByRole("button", { name: "+ New deck" }).click();
  await page.getByPlaceholder("e.g. Atraxa Superfriends").fill(name);
  if (deckText === null) {
    await page.getByRole("button", { name: "Load example" }).click();
  } else {
    await page.locator("textarea.import__textarea").fill(deckText);
  }
  const count = (await page.locator(".chip", { hasText: /cards/ }).first().textContent())?.trim();
  const save = page.getByRole("button", { name: "Save deck" });
  if (await save.isDisabled()) {
    const err = (await page.locator(".error").first().textContent())?.trim() ?? "save is disabled";
    throw new Error(`deck "${name}" is not saveable (${count}): ${err}`);
  }
  await save.click();
  await page.locator(".deck-list__info", { hasText: name }).waitFor();
  return count;
}

async function run(opts) {
  let baseUrl = process.env.BASE_URL ?? "http://localhost:5173";
  let devServer = null;
  if (opts.serve) {
    devServer = await startDevServer();
    baseUrl = devServer.url;
  }

  const playerText = opts.deck ? readFileSync(resolve(opts.deck), "utf8") : null;
  const playerName = opts.deck
    ? basename(opts.deck, extname(opts.deck))
    : "Sample Player";

  const browser = await chromium.launch({ headless: !opts.headed });
  const context = await browser.newContext({ locale: "en-US" });
  await context.addInitScript(
    ([key, lang]) => localStorage.setItem(key, lang),
    [LANG_KEY, "en"],
  );
  const page = await context.newPage();

  try {
    try {
      await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 15_000 });
    } catch {
      throw new Error(
        `could not reach ${baseUrl} — start the dev server (npm run dev) or pass --serve`,
      );
    }

    await page.evaluate((key) => localStorage.removeItem(key), DECKS_KEY);
    await page.reload({ waitUntil: "domcontentloaded" });

    await createDeck(page, { name: "Sample Opponent", deckText: null });
    const playerCount = await createDeck(page, { name: playerName, deckText: playerText });

    await page.locator(".deck-list__info", { hasText: playerName }).click();
    await page.getByRole("button", { name: "Test in a match →" }).click();
    await page.getByRole("heading", { name: "Match setup" }).waitFor();

    const start = page.getByRole("button", { name: /^Start/ });
    await start.waitFor();
    if (await start.isDisabled()) {
      throw new Error("reached match setup but the Start button is disabled");
    }
    const startLabel = (await start.textContent())?.trim();

    await shot(page, opts.screenshot);

    console.log("READY — at match setup, one click before the game starts.");
    console.log(`  player deck : ${playerName} (${playerCount})`);
    console.log(`  opponent    : Sample Opponent`);
    console.log(`  start button: "${startLabel}" (enabled)`);
    console.log(`  screenshot  : ${opts.screenshot}`);

    if (opts.keepOpen) {
      console.log("\n--keep-open: browser left at match setup. Press Ctrl+C to exit.");
      await new Promise(() => {});
    }
  } catch (err) {
    await shot(page, opts.screenshot).catch(() => {});
    console.error(`  screenshot of failure: ${opts.screenshot}`);
    throw err;
  } finally {
    if (!opts.keepOpen) await browser.close();
    if (devServer) devServer.child.kill();
  }
}

try {
  await run(parseArgs(process.argv.slice(2)));
} catch (err) {
  console.error(`FAILED: ${err.message}`);
  process.exit(1);
}
