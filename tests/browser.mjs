import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { chromium } = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
  ? require(`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`)
  : await import('playwright');
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: process.env.CHROMIUM_PATH ? ['--no-sandbox', '--disable-dev-shm-usage'] : [],
});
const base = process.env.TEST_URL || 'http://127.0.0.1:8000';
const only = process.argv[2];
const results = [];
await mkdir('test-results', { recursive: true });

async function test(name, run) {
  if (only && only !== name) return;
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  const failedResponses = [];
  const external = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', response => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
  });
  // Never send test briefs or third-party requests. Record attempted navigation.
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === new URL(base).origin) return route.continue();
    external.push(url.href);
    return route.abort();
  });
  try {
    await page.goto(base);
    await page.waitForLoadState('networkidle');
    await run(page, { errors, external });
    assert.deepEqual(failedResponses, [], 'Unsuccessful resource response');
    results.push({ name, status: 'PASS' });
  } catch (e) {
    results.push({ name, status: 'FAIL', reason: e.message });
  } finally {
    await context.close();
  }
}

for (const width of [320, 375, 768, 1440]) {
  await test(`viewport-${width}`, async (page, { errors, external }) => {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal overflow');
    await page.locator('footer').scrollIntoViewIfNeeded();
    await page.waitForLoadState('networkidle');
    assert.equal(await page.evaluate(async () => {
      await document.fonts.ready;
      return document.fonts.check('16px Manrope');
    }), true, 'Local font did not load');
    assert.deepEqual(await page.locator('img').evaluateAll(imgs => imgs.filter(i => !i.complete || !i.naturalWidth).map(i => i.src)), [], 'Broken image');
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `test-results/beta-${width}.png`, fullPage: true });
    if (width < 761) {
      await page.locator('#menuToggle').click();
      assert.equal(await page.locator('#menuToggle').getAttribute('aria-expanded'), 'true');
      await page.locator('#navMenu a[href="#ideas"]').click();
      assert.equal(await page.locator('#menuToggle').getAttribute('aria-expanded'), 'false');
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(external, [], 'Unexpected third-party request');
  });
}

await test('gallery', async page => {
  for (const filter of await page.locator('.filter').all()) {
    await filter.click();
    const category = await filter.getAttribute('data-filter');
    const visible = page.locator('.project-card:not([hidden])');
    assert.ok(await visible.count() > 0);
    if (category !== 'all') assert.ok((await visible.evaluateAll(cards => cards.map(c => c.dataset.cat))).every(c => c === category));
    assert.equal(await page.locator('.filter[aria-pressed="true"]').count(), 1);
  }
  await page.locator('[data-filter="all"]').click();
  for (const trigger of await page.locator('[data-project]').all()) {
    await trigger.click();
    assert.equal(await page.locator('#modal').isVisible(), true);
    assert.ok(await page.locator('#modalImage').evaluate(img => img.complete && img.naturalWidth > 0));
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#modal').isVisible(), false);
    assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
  }
  await page.locator('[data-project]').first().click();
  await page.locator('#modalClose').click();
  assert.equal(await page.locator('#modal').isVisible(), false);
  await page.locator('[data-project]').first().click();
  await page.locator('#modal').click({ position: { x: 1, y: 1 } });
  assert.equal(await page.locator('#modal').isVisible(), false);
});

await test('modal-focus', async page => {
  await page.locator('[data-project]').first().click();
  await page.locator('#modalCta').focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('#modalClose').evaluate(el => el === document.activeElement), true, 'Tab escaped modal');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.locator('#modalCta').evaluate(el => el === document.activeElement), true);
  await page.locator('#modalCta').click();
  assert.equal(await page.locator('#modal').isVisible(), false);
  assert.equal(await page.locator('#model').evaluate(el => el === document.activeElement), true);
  assert.match(await page.locator('#wishes').inputValue(), /001/);
});

await test('comparison', async page => {
  await page.locator('#compareSlider').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#compareSlider').inputValue(), '51');
  assert.equal(await page.locator('#split').evaluate(el => el.style.left), '51%');
});

await test('requisites', async page => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.getByRole('link', { name: 'Исполнитель и реквизиты' }).click();
  await page.waitForLoadState('networkidle');
  assert.match(await page.title(), /Реквизиты исполнителя — Вендизайнер/);
  assert.ok((await page.locator('main').innerText()).includes('6311129449 / 631101001'));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Requisites overflow');
  await page.getByRole('link', { name: '← Вернуться на сайт' }).click();
  assert.match(await page.title(), /Вендизайнер/);
});

await test('form', async (page, { external }) => {
  external.length = 0;
  let opens = 0;
  await page.exposeFunction('__recordOpen', () => { opens++; });
  await page.evaluate(() => { window.open = () => { window.__recordOpen(); return null; }; });
  await page.locator('#briefForm button[type="submit"]').click();
  assert.equal(await page.locator('#model').evaluate(el => el.checkValidity()), false);
  assert.deepEqual(external, []);
  await page.locator('#model').fill('Jetinno JL220');
  await page.locator('#height').selectOption('180–200 см');
  await page.locator('#mood').selectOption('минимализм');
  await page.locator('#place').fill('Самара, офис');
  await page.locator('#wishes').fill('Зелёный & белый\nБез логотипа');
  await page.locator('#briefForm button[type="submit"]').click();
  await page.waitForTimeout(150);
  const links = external.filter(url => url.startsWith('https://wa.me/'));
  assert.equal(opens + links.length, 1, 'More than one WhatsApp navigation');
  assert.equal(links.length, 1);
  const message = new URL(links[0]).searchParams.get('text');
  assert.match(message, /Модель: Jetinno JL220/);
  assert.match(message, /Высота: 180–200 см/);
  assert.match(message, /Стиль: минимализм/);
  assert.match(message, /Место: Самара, офис/);
  assert.ok(message.includes('Зелёный & белый\nБез логотипа'));
});

await test('whitespace-model', async (page, { external }) => {
  external.length = 0;
  await page.locator('#model').fill('   ');
  await page.locator('#briefForm button[type="submit"]').click();
  assert.deepEqual(external, [], 'Whitespace model caused navigation');
  assert.equal(await page.locator('#model').evaluate(el => el.checkValidity()), false);
});

for (const width of [375, 1440]) {
  await test(`accessibility-${width}`, async page => {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    await page.addScriptTag({ path: process.env.AXE_CORE_PATH || require.resolve('axe-core/axe.min.js') });
    const reports = [];
    for (const modal of [false, true]) {
      if (modal) await page.locator('[data-project]').first().click();
      const report = await page.evaluate(() => axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      }));
      reports.push({ modal, report });
    }
    await writeFile(`test-results/accessibility-${width}.json`, JSON.stringify(reports, null, 2));
    assert.deepEqual(reports.flatMap(r => r.report.violations.map(v => ({ modal: r.modal, id: v.id, nodes: v.nodes.length }))), []);
  });
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
if (results.some(r => r.status === 'FAIL')) process.exitCode = 1;
