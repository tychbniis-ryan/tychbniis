import { expect, test } from '@playwright/test';

const GAS_WEBAPP_URL = process.env.GAS_WEBAPP_URL ||
  'https://script.google.com/macros/s/AKfycbwNVIuv6lOjovyXejbBVEEXwQ2FH36v8EGyNDmNN8E7-JOI2G7gGE8kfBBhb3fTQ3jnsw/exec';

const VIEWS = [
  'report',
  'create',
  'maintain',
  'search',
  'stats',
  'promo',
  'vendor',
  'system'
];

const ADMIN_GUARDED_VIEWS = new Set(['stats', 'promo', 'system']);

test('GAS Web App UI entries and one-page workflow remain reachable', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(GAS_WEBAPP_URL, { waitUntil: 'domcontentloaded' });
  const app = page.frameLocator('iframe').frameLocator('iframe');
  await app.locator('button[data-view="create"]').waitFor({ timeout: 30000 });

  await expect(app.locator('[data-view]')).toHaveCount(VIEWS.length);

  for (const view of VIEWS) {
    await test.step(`open ${view} view`, async () => {
      await app.locator(`button[data-view="${view}"]`).click();
      if (ADMIN_GUARDED_VIEWS.has(view)) {
        await expect(app.locator('#view-admin-guard')).toBeVisible();
      } else {
        await expect(app.locator(`#view-${view}`)).toBeVisible();
      }
      await app.locator('body').evaluate(() => window.showHome());
      await expect(app.locator('button[data-view="create"]')).toBeVisible();
    });
  }

  await test.step('create form is one-page on desktop', async () => {
    await app.locator('button[data-view="create"]').click();
    const displays = await app.locator('#view-create .form-step').evaluateAll((steps) =>
      steps.map((step) => window.getComputedStyle(step).display)
    );
    expect(displays).toHaveLength(6);
    expect(displays.every((display) => display !== 'none')).toBe(true);
    await expect(app.locator('#bulkCreateBox')).toHaveJSProperty('tagName', 'DETAILS');
    expect(await app.locator('#bulkCreateBox').evaluate((details) => details.open)).toBe(false);
  });

  await test.step('search page keeps advanced filters collapsed', async () => {
    await app.locator('body').evaluate(() => window.showHome());
    await app.locator('button[data-view="search"]').click();
    const advancedFilters = app.locator('#view-search details.advanced-filter');
    await expect(advancedFilters).toHaveCount(1);
    expect(await advancedFilters.first().evaluate((details) => details.open)).toBe(false);
  });
});
