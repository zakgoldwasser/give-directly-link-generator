import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.beforeEach(async ({ page }) => {
    await page.route('**/*', (route) => {
        const url = new URL(route.request().url());
        if (url.hostname !== '127.0.0.1') throw new Error(`Unexpected external request: ${url.origin}`);
        return route.continue();
    });
    await page.goto('/');
    await expect(page.locator('#generate')).toBeEnabled();
});
const navigate = (page, view) => page.locator(`[data-view="${view}"]`).click();
const generate = (page) => page.getByRole('button', { name: 'Generate link package' }).click();

test('generates, inspects, validates, demonstrates a broken link and downloads a safe scenario', async ({
    page,
}, testInfo) => {
    const failures = [];
    page.on('pageerror', (error) => failures.push(error.message));
    await page.screenshot({
        path: testInfo.outputPath('create.png'),
        fullPage: true,
        animations: 'disabled',
    });
    await generate(page);
    await expect(page.locator('#view-review')).toBeVisible();
    await expect(page.getByLabel('Payment link URL')).toHaveValue(
        /frequency=monthly&amountChosen=60&campaignName=Example\+Year-End\+Campaign&dedicated=true/,
    );
    await expect(page.getByLabel('Dedication link URL')).toBeVisible();
    await expect(page.locator('#parameter-rows')).toContainText('Example Year-End Campaign');
    await expect(page.locator('#parameter-rows')).toContainText('propagated to route');
    await page.screenshot({
        path: testInfo.outputPath('review.png'),
        fullPage: true,
        animations: 'disabled',
    });
    const packageDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download package' }).click();
    const pkg = JSON.parse(await readFile(await (await packageDownload).path(), 'utf8'));
    expect(pkg.contract_version).toBe('2026-10-20');
    expect(pkg.test_scenario.stop_before_payment).toBe(true);
    await navigate(page, 'validation');
    await expect(page.locator('#lint-summary')).toContainText('0 errors · 0 warnings');
    await page.getByRole('button', { name: 'Try a broken fixture' }).click();
    await expect(page.locator('#lint-results')).toContainText('MISSING_PARAMETER');
    await expect(page.locator('#lint-results')).toContainText('CROSS_LINK_MISMATCH');
    await expect(page.locator('#lint-source')).toContainText('Broken fixture');
    await page.getByRole('button', { name: 'Restore generated links' }).click();
    await expect(page.locator('#lint-summary')).toContainText('0 errors · 0 warnings');
    await navigate(page, 'scenario');
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download scenario' }).click();
    const scenario = JSON.parse(await readFile(await (await downloadEvent).path(), 'utf8'));
    expect(scenario.stop_before_payment).toBe(true);
    expect(scenario.expected).toEqual({
        frequency: 'monthly',
        amountChosen: '60',
        campaignName: 'Example Year-End Campaign',
        dedicated: 'true',
    });
    expect(scenario.links).toHaveLength(2);
    expect(failures).toEqual([]);
});

test('rejects bad custom amounts and truncates decimals without rounding', async ({ page }) => {
    await page.locator('input[name="amountPreset"][value="custom"]').check();
    await page.getByLabel('Custom amount (USD)').fill('0.99');
    await generate(page);
    await expect(page.locator('#form-errors')).toContainText('at least $1');
    await expect(page.locator('#form-errors')).toBeFocused();
    await expect(page.locator('#download-package')).toBeDisabled();
    await page.getByLabel('Custom amount (USD)').fill('1000000');
    await generate(page);
    await expect(page.locator('#form-errors')).toContainText('less than $1000000');
    await page.getByLabel('Custom amount (USD)').fill('60.999');
    await generate(page);
    await expect(page.getByLabel('Payment link URL')).toHaveValue(/amountChosen=60.99&/);
});

test('preserves encoded Unicode and unknown attribution without interpreting markup', async ({ page }) => {
    const campaign = 'Example & café + <img src=x onerror=alert(1)> 🌱';
    await page.getByLabel('Campaign name', { exact: false }).fill(campaign);
    await page.locator('summary').filter({ hasText: 'Campaign selection & attribution' }).click();
    await page.getByLabel('Optional attribution').fill('utm_campaign=year & end');
    await page.getByLabel('Include a campaign-selection link').check();
    await page.getByLabel('Return route').selectOption('choose-dedication');
    await generate(page);
    const payment = new URL(await page.getByLabel('Payment link URL').inputValue());
    expect(payment.searchParams.get('campaignName')).toBe(campaign);
    expect(payment.searchParams.get('utm_campaign')).toBe('year & end');
    await expect(page.locator('#parameter-rows')).toContainText(campaign);
    await expect(page.locator('#parameter-rows img')).toHaveCount(0);
    const campaignUrl = new URL(await page.getByLabel('Campaign selection link URL').inputValue());
    expect(campaignUrl.searchParams.get('back')).toBe('choose-dedication');
    expect(campaignUrl.searchParams.has('dedicated')).toBe(false);
    await navigate(page, 'validation');
    await expect(page.locator('#lint-summary')).toContainText('0 errors · 3 warnings');
    await expect(page.locator('#lint-results')).toContainText('UNKNOWN_PARAMETER');
});

test('editing settings invalidates old exports and regeneration updates the package', async ({ page }) => {
    await generate(page);
    await navigate(page, 'create');
    await page.getByLabel('Campaign name', { exact: false }).fill('Example New Campaign');
    await navigate(page, 'review');
    await expect(page.locator('#download-package')).toBeDisabled();
    await expect(page.locator('#view-review [data-empty]')).toBeVisible();
    await navigate(page, 'create');
    await page.getByLabel('Include a dedication').uncheck();
    await page.locator('input[name="frequency"][value="once"]').check();
    await generate(page);
    await expect(page.locator('.link-card')).toHaveCount(1);
    await expect(page.getByLabel('Payment link URL')).toHaveValue(/frequency=once/);
    await expect(page.locator('#parameter-rows')).toContainText('Example New Campaign');
});

test('lints pasted URLs locally and clears stale results after editing', async ({ page }) => {
    await navigate(page, 'validation');
    await page
        .getByLabel('Links to check')
        .fill(
            'https://donate.givedirectly.org/choose-payment?frequency=weekly&amountChosen=60&amountChosen=100&campaignName=Example',
        );
    await page.getByRole('button', { name: 'Run static validation' }).click();
    await expect(page.locator('#lint-results')).toContainText('DUPLICATE_PARAMETER');
    await expect(page.locator('#lint-results')).toContainText('INVALID_FREQUENCY');
    await page.getByLabel('Links to check').fill('https://other.example/choose-payment');
    await expect(page.locator('#lint-results')).toBeEmpty();
    await page.getByRole('button', { name: 'Run static validation' }).click();
    await expect(page.locator('#lint-results')).toContainText('INVALID_DESTINATION');
});

test('keyboard navigation and narrow layout keep the workflow usable', async ({ page }) => {
    await page.locator('[data-view="evidence"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#evidence-title')).toBeFocused();
    await expect(page.locator('#view-evidence')).toContainText('Original source excerpts are not present');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await navigate(page, 'create');
    await page.locator('#campaignName').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator('#campaign_label')).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('copy action writes the URL and offers selection when clipboard access is unavailable', async ({
    page,
    context,
}) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await generate(page);
    const expected = await page.getByLabel('Payment link URL').inputValue();
    await page.getByRole('button', { name: 'Copy payment link', exact: true }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
    await page.evaluate(() => {
        navigator.clipboard.writeText = () => Promise.reject(new Error('Clipboard unavailable'));
    });
    await page.getByRole('button', { name: 'Copy payment link', exact: true }).click();
    await expect(page.getByLabel('Payment link URL')).toBeFocused();
    await expect(page.locator('#status')).toContainText('URL is selected');
    expect(
        await page.getByLabel('Payment link URL').evaluate((node) => node.selectionEnd - node.selectionStart),
    ).toBe(expected.length);
});
