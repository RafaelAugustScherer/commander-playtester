// Cloudflare Worker: a small same-origin CORS proxy for the deck importer.
//
// The playtester is a static site, so it can't fetch Moxfield/Archidekt deck
// APIs directly (their CORS policies block cross-origin browser requests).
// This worker forwards a single allowlisted GET and adds permissive CORS.
//
// Deploy with `wrangler deploy`, then build the app with
// VITE_DECK_PROXY="https://<your-worker>.workers.dev/?url=".
//
// Moxfield only answers requests carrying a User-Agent they have approved —
// email support@moxfield.com, then set the MOXFIELD_USER_AGENT secret/var.

const ALLOWED_HOSTS = new Set(["api.moxfield.com", "archidekt.com"]);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405, headers: CORS });
    }

    const target = new URL(request.url).searchParams.get("url");
    if (!target) {
      return new Response("Missing url", { status: 400, headers: CORS });
    }

    let upstream;
    try {
      upstream = new URL(target);
    } catch {
      return new Response("Bad url", { status: 400, headers: CORS });
    }
    if (upstream.protocol !== "https:" || !ALLOWED_HOSTS.has(upstream.hostname)) {
      return new Response("Host not allowed", { status: 403, headers: CORS });
    }

    const userAgent =
      env.MOXFIELD_USER_AGENT ||
      "Mozilla/5.0 (compatible; commander-playtester deck importer)";

    const res = await fetch(upstream.toString(), {
      headers: { Accept: "application/json", "User-Agent": userAgent },
    });

    return new Response(res.body, {
      status: res.status,
      headers: {
        ...CORS,
        "Content-Type": res.headers.get("Content-Type") || "application/json",
        "Cache-Control": "public, max-age=300",
      },
    });
  },
};
