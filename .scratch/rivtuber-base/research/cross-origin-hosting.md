# Static hosts that can set COOP + COEP (ticket 01)

Status: research notes. Ticket `issues/01-cross-origin-hosting.md` is not modified.
Read date for all sources: 2026-10-21.

## Question

Which static hosts can set both `Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: require-corp` on a SvelteKit `adapter-static`
build, and what does each cost for an open-source app with no backend?

## Required headers (MDN)

- COOP `same-origin` plus COEP `require-corp` (or `credentialless`) is needed
  for `crossOriginIsolated`, and therefore `SharedArrayBuffer`.
  Source: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Embedder-Policy
  and https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy
- Under `require-corp`, a cross-origin subresource loaded in `no-cors` mode
  (for example `<img src>` or a `<script>` without `crossorigin`) is blocked
  unless it sends `Cross-Origin-Resource-Policy` that allows the embedder.
  Resources requested in `cors` mode (`crossorigin` attribute or
  `fetch(..., {mode: "cors"})`) are not blocked by COEP, but still must pass CORS.
  Source: same COEP page.

## Hosts

### Cloudflare Pages (candidate, recommended)

- **Custom headers for static sites:** Supported. Applies to static assets only.
  Pages Functions responses do not get `_headers` values.
  Source: https://developers.cloudflare.com/pages/configuration/headers/
- **Config mechanism:** A plain-text file named `_headers` (no extension) in the
  build output directory. For SvelteKit adapter-static, place it in `static/`
  so it is copied into the output. Example rule:
  ```
  /*
    Cross-Origin-Opener-Policy: same-origin
    Cross-Origin-Embedder-Policy: require-corp
  ```
  Source: same page. No dashboard setting was found for this.
- **Limits (Free):** 100 header rules per `_headers` file; 2,000 characters per
  line. Source: https://developers.cloudflare.com/pages/platform/limits/ (same
  numbers also on the headers page).
- **Other Free limits (same limits page):** 500 builds/month, 1 concurrent build,
  20-minute build timeout, 20,000 files per site, 25 MiB max file size, 100
  projects per account, 100 custom domains per project.
- **Bandwidth and requests:** The limits page does not state a bandwidth cap.
  The Pages Functions pricing page says: "On both free paid plans, requests
  static assets free unlimited." (Source:
  https://developers.cloudflare.com/pages/functions/pricing/). That page does not
  mention bandwidth, so the bandwidth question is only partly answered.
  The Functions daily request limit (100,000/day, resets midnight UTC) does not
  apply to a site with no Functions.
- **Caveat:** The `_headers` file cannot set headers on Functions responses.
  This app has no Functions, so this does not bite.

### Netlify (candidate, works, but credit-based plan)

- **Custom headers for static sites:** Supported. Applies to files Netlify serves
  from its own store; does not apply to proxied content or Functions/SSR.
  Source: https://docs.netlify.com/manage/routing/headers/
- **Config mechanism:** Either a `_headers` file in the publish directory, or a
  `netlify.toml` `[[headers]]` table with `for = "/*"` and `[headers.values]`.
  Example:
  ```
  /*
    Cross-Origin-Opener-Policy: same-origin
    Cross-Origin-Embedder-Policy: require-corp
  ```
  Source: same page.
- **Free-tier limits: unresolved conflict.** The current pricing page
  (https://www.netlify.com/pricing/, read 2026-10-21) says Free includes
  "300 credit limit"; production deploy costs 15 credits; bandwidth 20 credits/GB;
  web requests 2 credits per 10,000; compute 10 credits per GB-hour. It does not
  say whether credits reset monthly, does not give a concurrency number, and
  does not say what happens at the limit. The Netlify changelog
  (https://www.netlify.com/changelog/netlify-pricing-update-introducing-credit-based-plans/,
  undated on the page, read 2026-10-21) says bandwidth 10 credits/GB and web
  requests 3 credits per 10,000 and 300 credits. The two Netlify sources disagree
  on bandwidth and request rates. The docs page at
  `docs.netlify.com/build/limits-and-pricing/` returned 404 and was not read.
  Legacy-model accounts (created before 2025-09-04, per third-party guides) may
  still have a different allotment; not verified against Netlify's own docs.
- **Caveat:** Same header rules as above; Netlify ignores a few headers it
  controls (`Content-Length`, `Content-Encoding`, `Set-Cookie`, etc.). COOP and
  COEP are not on that list.

### Vercel (candidate, works, but non-commercial on Hobby)

- **Custom headers for static sites:** Supported via `headers` in `vercel.json`.
  The reference shows `source` patterns applied to `/(.*)`; the page read does
  not explicitly say it covers static files, so confirm with a test deploy.
  Source: https://vercel.com/docs/project-configuration/vercel-json#headers
  (headers section; the page is large).
- **Config mechanism:** `vercel.json` at project root:
  ```json
  {
    "headers": [
      {
        "source": "/(.*)",
        "headers": [
          { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
          { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
        ]
      }
    ]
  }
  ```
  No dashboard setting was found for this in the pages read.
- **Hobby limits (https://vercel.com/docs/limits, read 2026-10-21):** 200 projects;
  100 deployments created per day; 45-minute build time per deployment; 100 MB
  static file uploads; 1 concurrent deployment; 32 GB disk.
- **Hobby usage guidelines (https://vercel.com/docs/limits/fair-use-guidelines,
  read 2026-10-21):** Fast Data Transfer first 100 GB per month; Fast Origin
  Transfer first 10 GB. These are "typical monthly usage guidelines," not hard
  caps.
- **Blocker to check:** "Hobby teams are restricted to non-commercial personal
  use only." Commercial use means any deployment used for financial gain of anyone
  involved, including payment requests, ads, affiliate linking as primary purpose,
  or a paid contributor. Donations are explicitly not commercial. An open-source
  app with no payments or ads is fine; anything else requires Pro.
  Source: https://vercel.com/docs/limits/fair-use-guidelines

### GitHub Pages (control)

- **Custom headers:** The GitHub Pages docs read (about-github-pages) and the
  limits page do not describe any mechanism for custom HTTP response headers.
  The docs are silent rather than explicitly prohibiting it. There is no
  documented config file or setting that can set COOP/COEP.
  Sources: https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages ;
  https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- **Limits:** Soft 100 GB/month bandwidth; soft 10 builds/hour (does not apply
  with a custom GitHub Actions workflow); site size max 1 GB.
- **Verdict:** Cannot set COOP/COEP per the docs. Matches the expected control.

## Caveats that would break MediaPipe multithreaded WASM

- Any cross-origin asset loaded without `crossorigin` (no-cors) and without a
  CORP header is blocked under `require-corp`. This includes CDN `<script>`s,
  images and fonts. Fix by either self-hosting, or loading with `crossorigin`
  and a CORS-enabled server. The `face_landmarker.task` model and the MediaPipe
  WASM/ `tasks-vision` bundle must be checked; if they come from a CDN, they need
  CORS (`crossorigin`) or CORP. Not verified: the MediaPipe web docs page
  (developers.google.com/edge/mediapipe/...) was read and says nothing about
  COOP/COEP or SharedArrayBuffer; its CDN example uses `crossorigin="anonymous"`.
- `same-origin` COOP severs `window.opener` for popups in a new browsing context
  group. This app has no OAuth or popup flow, so it should not matter.
- Test in the real deployed origin: check `crossOriginIsolated === true` in the
  console and confirm no `coep` violation reports. Headers are per response, so
  check the HTML and the WASM/model responses.

## Recommendation

Use **Cloudflare Pages**.

- It is the only candidate with a documented, unambiguous static-asset request
  policy on Free (unlimited static requests), plus a clear `_headers` mechanism
  with stated limits (100 rules, 20,000 files, 25 MiB per file, 500 builds/month).
- Not checked: whether Cloudflare's terms restrict commercial use on Free. Vercel
  Hobby's restriction is confirmed; the others were not read.
- Netlify works, but its free-tier numbers conflict between its own pricing page
  and changelog, and the credit model could pause a site at the limit. Not safe to
  pick until that is resolved.
- Vercel works technically, but Hobby forbids commercial use; any future
  sponsorship, donation-tied ads, or paid contributor would force Pro.

Open items for the user: confirm whether a bandwidth cap applies on Cloudflare Pages
Free (not stated in the docs read). Netlify rate conflict unresolved.

## Sources read (2026-10-21)

- https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Embedder-Policy
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy
- https://developers.cloudflare.com/pages/configuration/headers/
- https://developers.cloudflare.com/pages/platform/limits/
- https://developers.cloudflare.com/pages/functions/pricing/
- https://docs.netlify.com/manage/routing/headers/
- https://www.netlify.com/pricing/
- https://www.netlify.com/changelog/netlify-pricing-update-introducing-credit-based-plans/
- https://vercel.com/docs/limits
- https://vercel.com/docs/limits/fair-use-guidelines
- https://vercel.com/docs/project-configuration/vercel-json
- https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- https://svelte.dev/docs/kit/adapter-static (fallback and trailing-slash notes; `200.html` varies by host)
- https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js (silent on COOP/COEP)

Not read (404 or not found): docs.netlify.com/build/limits-and-pricing/ and
docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/;
vercel.com/docs/headers (system headers reference, not the config page).
