import { expect, test, type APIRequestContext } from '@playwright/test';
import { builds } from '../playwright.config';

const API = 'http://localhost:4355';
const paths = ['/api/profile', '/api/orders', '/api/catalog'] as const;
type Counts = Record<(typeof paths)[number], { server: number; browser: number }>;

// Loads the page once in a real browser and returns the API hits it caused,
// split by who sent them: the Angular server while rendering, or the browser.
async function countHits(page: import('@playwright/test').Page, request: APIRequestContext, port: number) {
  await request.post(`${API}/reset`);
  await page.goto(`http://localhost:${port}/`);
  await expect(page.locator('#catalog li')).toHaveCount(2);
  await page.waitForLoadState('networkidle');

  const hits: { path: string; from: 'server' | 'browser'; auth: string | null }[] =
    await (await request.get(`${API}/hits`)).json();
  expect(hits.every((h) => h.auth === 'Bearer alice-token')).toBe(true);

  const counts = {} as Counts;
  for (const p of paths) {
    counts[p] = {
      server: hits.filter((h) => h.path === p && h.from === 'server').length,
      browser: hits.filter((h) => h.path === p && h.from === 'browser').length,
    };
  }
  console.log(`  ${JSON.stringify(counts)}`);
  return counts;
}

// The serialized state Angular writes into the HTML, as the browser receives it.
async function ngState(request: APIRequestContext, port: number) {
  const res = await request.get(`http://localhost:${port}/`);
  const html = await res.text();
  const state = html.match(/<script id="ng-state" type="application\/json">(.*?)<\/script>/)?.[1] ?? '';
  return { state, cacheControl: res.headers()['cache-control'] };
}

test('default: every auth-header GET is sent twice, once by the server, once by the browser', async ({ page, request }) => {
  const counts = await countHits(page, request, builds.off);
  for (const p of paths) expect(counts[p]).toEqual({ server: 1, browser: 1 });

  const { state } = await ngState(request, builds.off);
  expect(state).not.toContain('alice@example.com');
});

test('includeRequestsWithAuthHeaders: true: the browser reuses what the server fetched', async ({ page, request }) => {
  const counts = await countHits(page, request, builds.on);
  expect(counts['/api/profile']).toEqual({ server: 1, browser: 0 });
  // httpResource goes through HttpClient, so the transfer cache covers it too.
  expect(counts['/api/catalog']).toEqual({ server: 1, browser: 0 });
  // Cache-Control: private on the response keeps it out of the cache, flag or not.
  expect(counts['/api/orders']).toEqual({ server: 1, browser: 1 });
});

test('with the flag on, the user\'s data sits in the HTML and the HTML has no Cache-Control', async ({ request }) => {
  const { state, cacheControl } = await ngState(request, builds.on);
  console.log(`  ng-state: ${state.slice(0, 220)}...`);
  console.log(`  Cache-Control on the page: ${cacheControl ?? '(none)'}`);
  expect(state).toContain('"email":"alice@example.com"');
  expect(state).toContain('Desk lamp');
  expect(state).not.toContain('1042'); // the private orders response
  expect(cacheControl).toBeUndefined();
});

test('flag plus filter: only the listed URL is reused, the profile stays out of the HTML', async ({ page, request }) => {
  const counts = await countHits(page, request, builds.filter);
  expect(counts['/api/catalog']).toEqual({ server: 1, browser: 0 });
  expect(counts['/api/profile']).toEqual({ server: 1, browser: 1 });
  expect(counts['/api/orders']).toEqual({ server: 1, browser: 1 });

  const { state } = await ngState(request, builds.filter);
  expect(state).toContain('Desk lamp');
  expect(state).not.toContain('alice@example.com');
});

test('filter alone cannot let an auth-header request in', async ({ page, request }) => {
  const counts = await countHits(page, request, builds['filter-only']);
  for (const p of paths) expect(counts[p]).toEqual({ server: 1, browser: 1 });

  const { state } = await ngState(request, builds['filter-only']);
  expect(state).not.toContain('Desk lamp');
});
