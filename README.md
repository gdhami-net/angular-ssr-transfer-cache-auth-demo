# angular-ssr-transfer-cache-auth-demo

What Angular's HTTP transfer cache does with API calls that carry an
`Authorization` header, measured by counting hits on a small API during one
page load.

Companion to the post "Stop the second API call after Angular server rendering
when requests carry an auth header" on gdhami.net.

## What it proves

The app is a server-rendered Angular page that calls three endpoints. An
interceptor adds `Authorization: Bearer alice-token` to every one of them.

| endpoint | what it is | response headers |
| --- | --- | --- |
| `/api/profile` | one user's data | none special |
| `/api/orders` | one user's data | `Cache-Control: private` |
| `/api/catalog` | the same for everyone, still behind the token (loaded with `httpResource`) | none special |

The app is built four times, each with a different transfer cache setting
(`src/app/modes/`, swapped in through `fileReplacements` in `angular.json`):

| build | setting | hits for one page load (server + browser) |
| --- | --- | --- |
| `off` | `provideClientHydration()` | every endpoint 1 + 1 (6 hits) |
| `on` | `includeRequestsWithAuthHeaders: true` | profile 1 + 0, catalog 1 + 0, orders 1 + 1 |
| `filter` | the flag plus `filter` allowing only `/api/catalog` | catalog 1 + 0, profile 1 + 1, orders 1 + 1 |
| `filter-only` | `filter` allowing `/api/catalog`, no flag | every endpoint 1 + 1 |

The check also reads the `<script id="ng-state">` block of the rendered HTML:

- with the flag on, the profile response is there in full, email included;
- the `private` orders response is not there, flag or not;
- with the filter, only the catalog is there;
- the rendered page itself is sent with no `Cache-Control` header.

## Run it

```
npm install
npm run check
```

`npm run check` builds the four variants, then Playwright starts the API
(port 4355) and the four SSR servers (ports 4451 to 4454), loads each page in
the installed Microsoft Edge, and asserts the counts above. Playwright gives
the browser a temporary profile and removes it when the run ends.

To look around by hand: `npm run api` in one terminal, then
`PORT=4452 node dist/on/server/server.mjs`, open http://localhost:4452/ and
watch the API's console. Each hit is logged as `server` or `browser`
(decided by the User-Agent: Node's `fetch` doesn't send a browser one).

## Versions

Checked on 2026-11-01, Windows 11, Node 26.1.0, npm 11.13.0.

- Angular 22.2.4 (`@angular/core`, `common`, `platform-browser`, `platform-server`)
- `@angular/ssr`, `@angular/build`, `@angular/cli` 22.2.5
- TypeScript 6.0.3 (what `ng new` 22.2.5 scaffolds; Angular 22 isn't on TypeScript 7)
- Express 5.3.0
- `@playwright/test` 1.64.1, run in the installed Microsoft Edge (`channel: 'msedge'`)

## Edge cases the post leaves out

- **Cookies count as auth headers.** The flag's check is
  `authorization`, `proxy-authorization` or `cookie` on the request. An app
  that forwards the browser's cookie to the API on the server is excluded by
  default for the same reason.
- **Credentialed requests have their own switch.** Since Angular 22.1,
  requests sent with `withCredentials` or fetch `credentials: 'include' |
  'same-origin'` are skipped unless `includeRequestsWithCredentials: true`.
- **Response cache headers have a vote.** Since 22.1, a request or response
  with `Cache-Control: no-store`, `no-cache` or `private`, a response with
  `Set-Cookie`, or a fetch `cache: 'no-store' | 'no-cache'` request is skipped
  unless `includeNonCacheableRequests: true`. The skip itself was also
  backported as a fix to 22.0.2, 21.2.17 and 20.3.25; the opt-out option is
  only in 22.1 and later. Angular changelog, PR #69017.
- **`filter` can only say no.** In `canUseOrCacheRequest` the filter is the
  last test, `filter?.(req) === false`. It can't let in a request another
  rule has already excluded.
- **The options run on both sides.** The server stores with them and the
  browser reads with them, so they belong in the shared `app.config.ts`, not
  only in `app.config.server.ts`.
- **Headers aren't transferred.** `includeHeaders` defaults to none: a cached
  response arrives in the browser with no headers, and in dev mode Angular
  warns when code reads one that wasn't listed.
- **Prerendering.** The CLI scaffold renders `**` with `RenderMode.Prerender`.
  A prerendered route bakes whatever the build-time request returned into a
  static file served to everyone. This demo switches to `RenderMode.Server`.
- **Host check.** The v22 scaffold writes `security.allowedHosts: []`; the
  SSR server answers 400 for `localhost` until it is listed.
- **The token is fixed.** In a real app the server would take it from the
  incoming request's cookie. The demo keeps one user so the counts stay about
  the cache.
- **Different URLs on server and browser.** The cache key is a SHA-256 of
  method, response type, URL, body and sorted params. If the server calls an
  internal host, map it with `HTTP_TRANSFER_CACHE_ORIGIN_MAP` in the server
  config, or nothing matches. Here both sides use `http://localhost:4355`.

## License

MIT
