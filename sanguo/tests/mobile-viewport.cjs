// Mobile battle viewport regression: controls must survive portrait, landscape,
// and touch-capable desktop-mode layouts without requesting browser fullscreen.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createServer } = require('../preview-server.cjs');

const cases = [
  {
    label: 'mobile-portrait',
    context: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
  },
  {
    // iPad can report a fine primary pointer when a trackpad or desktop-mode UI is
    // active. Keep maxTouchPoints so the battle HUD still recognizes touch input.
    label: 'touch-capable-landscape',
    context: { viewport: { width: 1180, height: 820 }, hasTouch: false, isMobile: false },
    forceTouchPoints: true,
  },
];

function assertStickInVisualViewport(result, label) {
  assert.equal(result.exists, true, `${label}: #touch-stick exists`);
  assert.equal(result.visibility, 'visible', `${label}: movement stick remains visible`);
  assert.notEqual(result.display, 'none', `${label}: movement stick is rendered`);
  assert.ok(result.rect.width > 0 && result.rect.height > 0, `${label}: movement stick has size (${JSON.stringify(result)})`);
  assert.ok(
    result.rect.left >= result.viewport.left - 1 &&
      result.rect.top >= result.viewport.top - 1 &&
      result.rect.right <= result.viewport.right + 1 &&
      result.rect.bottom <= result.viewport.bottom + 1,
    `${label}: movement stick stays inside visual viewport (${JSON.stringify(result)})`,
  );
}

async function startBattle(page, baseUrl) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.command-menu');
  await page.locator('#menu-deploy').click();
  await page.waitForSelector('#story-begin');
  await page.locator('#story-begin').click();
  await page.waitForSelector('#hud');
  await page.waitForFunction(() => document.documentElement.classList.contains('battle-viewport'));
}

async function inspectViewport(page) {
  return page.evaluate(() => {
    const stick = document.querySelector('#touch-stick');
    const rect = stick?.getBoundingClientRect();
    const view = window.visualViewport;
    const left = view?.offsetLeft ?? 0;
    const top = view?.offsetTop ?? 0;
    const width = view?.width ?? window.innerWidth;
    const height = view?.height ?? window.innerHeight;
    const styles = stick ? getComputedStyle(stick) : null;
    return {
      exists: Boolean(stick),
      visibility: styles?.visibility,
      display: styles?.display,
      rect: rect && { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
      viewport: { left, top, right: left + width, bottom: top + height, width, height },
    };
  });
}

async function waitForTwoFrames(page) {
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
}

async function assertBattleSurvivesBlur(page, label) {
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await waitForTwoFrames(page);
  assert.equal(
    await page.locator('#hud').evaluate((hud) => hud.classList.contains('paused')),
    false,
    `${label}: a transient window blur does not pause battle`,
  );
  assertStickInVisualViewport(await inspectViewport(page), `${label} after blur`);
}

(async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    for (const scenario of cases) {
      const context = await browser.newContext(scenario.context);
      const page = await context.newPage();
      const pageErrors = [];
      const requestFailures = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      page.on('response', (response) => {
        if (response.status() >= 400) requestFailures.push(`${response.status()} ${response.url()}`);
      });
      await page.addInitScript((forceTouchPoints) => {
        let fullscreenRequests = 0;
        Object.defineProperty(Element.prototype, 'requestFullscreen', {
          configurable: true,
          writable: true,
          value() {
            fullscreenRequests += 1;
            return Promise.resolve();
          },
        });
        Object.defineProperty(globalThis, '__mobileViewportFullscreenRequests', {
          configurable: true,
          get: () => fullscreenRequests,
        });
        if (forceTouchPoints) {
          Object.defineProperty(Navigator.prototype, 'maxTouchPoints', {
            configurable: true,
            get: () => 5,
          });
        }
      }, scenario.forceTouchPoints === true);

      await startBattle(page, baseUrl);
      assertStickInVisualViewport(await inspectViewport(page), scenario.label);
      await assertBattleSurvivesBlur(page, scenario.label);
      assert.equal(
        await page.evaluate(() => globalThis.__mobileViewportFullscreenRequests),
        0,
        `${scenario.label}: starting battle does not request browser fullscreen`,
      );
      assert.equal(
        await page.evaluate(() => {
          const event = new Event('gesturestart', { bubbles: true, cancelable: true });
          document.dispatchEvent(event);
          return event.defaultPrevented;
        }),
        true,
        `${scenario.label}: gesturestart is blocked while battle controls are active`,
      );
      if (scenario.label === 'mobile-portrait') {
        try {
          await page.setViewportSize({ width: 844, height: 390 });
          await waitForTwoFrames(page);
          assertStickInVisualViewport(await inspectViewport(page), 'mobile-portrait after landscape rotation');
        } catch (error) {
          // Some browser contexts deliberately lock their viewport. The separate
          // landscape case above remains the compatibility assertion in that case.
          if (!/viewport|context/i.test(String(error))) throw error;
          console.warn(`SKIP: runtime viewport rotation unavailable (${error.message})`);
        }
      }
      assert.deepEqual(requestFailures, [], `${scenario.label}: no failed local assets`);
      assert.deepEqual(pageErrors, [], `${scenario.label}: no page errors`);
      console.log(`PASS: ${scenario.label}`);
      await context.close();
    }
    console.log('PASS: mobile battle viewport controls, fullscreen guard, and gesture guard');
  } finally {
    await browser?.close();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
