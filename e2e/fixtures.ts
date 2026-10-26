// Shared Playwright fixtures (spec 13 FR-28, D10). The test server sends vercel.json's headers (serve.json), so
// every page runs under the production Content Security Policy; any violation, enforced or report-only, fails
// the test that caused it. Spec files import `test` and `expect` from here instead of '@playwright/test'.

import { expect, test as base } from '@playwright/test';

export * from '@playwright/test';

export const test = base.extend<{ cspGuard: void }>({
  cspGuard: [async ({ page }, use) => {
    const violations: string[] = [];
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', e => {
        console.error(`[csp-violation] ${e.effectiveDirective} blocked ${e.blockedURI || 'inline'} on ${location.pathname}`);
      });
    });
    page.on('console', m => {
      const t = m.text();
      if (t.startsWith('[csp-violation]') || /Content Security Policy/i.test(t)) violations.push(t);
    });
    await use();
    expect(violations, 'Content Security Policy violations').toEqual([]);
  }, { auto: true }],
});
