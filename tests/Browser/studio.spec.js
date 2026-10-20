import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.beforeEach(async ({ page }) => {
    await page.route('**/*', (route) => {
        if (new URL(route.request().url()).hostname !== '127.0.0.1')
            throw new Error('Unexpected external request');
        return route.continue();
    });
    await page.goto('/');
    await expect(page.locator('#generate')).toBeEnabled();
});
const mode = (page, name) => page.locator(`[data-mode="${name}"]`).click();
const generate = (page) => page.getByRole('button', { name: 'Generate link package' }).click();
const validate = (page) => page.locator('#lint').click();
const paymentUrl =
    'https://donate.givedirectly.org/choose-payment?frequency=monthly&amountChosen=60&campaignName=Example+%26+caf%C3%A9';
async function dedication(page) {
    await page.getByLabel('Include a dedication').check();
    await page.getByLabel('Name of the person you wish to honor', { exact: true }).fill('Example Honoree');
    await page
        .getByLabel('Email of the person you wish to honor', { exact: true })
        .fill('honoree@example.com');
    await page
        .getByLabel('Your name as it should appear to the person', { exact: true })
        .fill('Example Sender');
}

test('two modes replace the old workflow and generated results stay below the form', async ({
    page,
}, testInfo) => {
    const failures = [];
    page.on('pageerror', (error) => failures.push(error.message));
    await expect(page.locator('[data-mode]')).toHaveCount(2);
    await expect(page.getByText('Test scenario', { exact: true })).toHaveCount(0);
    await dedication(page);
    await generate(page);
    await expect(page.locator('#builder')).toBeVisible();
    await expect(page.locator('#create-output')).toBeVisible();
    await expect(page.locator('[data-mode="create"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByLabel('Dedication link URL')).toBeVisible();
    await expect(page.locator('#create-parameters')).toContainText('honoree@example.com');
    await expect(page.locator('#create-lint-summary')).toContainText('0 errors · 0 warnings');
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download package' }).click();
    const pkg = JSON.parse(await readFile(await (await downloadEvent).path(), 'utf8'));
    expect(pkg).not.toHaveProperty('test_scenario');
    expect(pkg.generated_links).toHaveLength(2);
    expect(pkg.contract_version).toBe('2026-10-20.1');
    expect(
        await page
            .locator('#create-output')
            .evaluate(
                (node) =>
                    node.getBoundingClientRect().top >
                    document.querySelector('#builder').getBoundingClientRect().bottom,
            ),
    ).toBe(true);
    await page.screenshot({
        path: testInfo.outputPath('create-inline.png'),
        fullPage: true,
        animations: 'disabled',
    });
    expect(failures).toEqual([]);
});

test('pasted link displays decoded parameters and validation results directly underneath', async ({
    page,
}, testInfo) => {
    await mode(page, 'validate');
    await expect(page.locator('#builder')).toBeHidden();
    await page
        .getByLabel('Link to validate', { exact: true })
        .fill(paymentUrl + '&utm_campaign=%3Cimg+src%3Dx+onerror%3Dalert(1)%3E');
    await validate(page);
    await expect(page.locator('#validator')).toBeVisible();
    await expect(page.locator('#validate-output')).toBeVisible();
    await expect(page.locator('#validate-parameters')).toContainText('Example & café');
    await expect(page.locator('#validate-parameters')).toContainText('<img src=x onerror=alert(1)>');
    await expect(page.locator('#validate-parameters img')).toHaveCount(0);
    await expect(page.locator('#validate-lint-summary')).toContainText('0 errors · 1 warnings');
    await expect(page.getByRole('link', { name: 'View errors' })).toHaveCount(0);
    await expect(page.locator('#validate-lint-results')).toContainText('UNKNOWN_PARAMETER');
    expect(
        await page
            .locator('#validate-output')
            .evaluate(
                (node) =>
                    node.getBoundingClientRect().top >
                    document.querySelector('#validator').getBoundingClientRect().bottom,
            ),
    ).toBe(true);
    expect(
        await page
            .locator('#validate-lint-results')
            .evaluate(
                (node) =>
                    node.getBoundingClientRect().top >
                    document.querySelector('#validate-parameters').getBoundingClientRect().bottom,
            ),
    ).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({
        path: testInfo.outputPath('validate-inline.png'),
        fullPage: true,
        animations: 'disabled',
    });
});

test('validation errors appear beside the button and link to the first error', async ({ page }, testInfo) => {
    await mode(page, 'validate');
    await page
        .getByLabel('Link to validate')
        .fill(paymentUrl.replace('monthly', 'weekly') + '&utm_campaign=example&amountChosen=100');
    await validate(page);
    const count = await page.locator('#validate-lint-results .error').count();
    expect(count).toBeGreaterThan(1);
    await expect(page.locator('#validation-status')).toHaveText(
        `Validation found ${count} errors. View errors`,
    );
    await expect(page.locator('#lint')).toBeFocused();
    await expect(page.locator('#validation-status')).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({
        path: testInfo.outputPath('validation-error-notice.png'),
        animations: 'disabled',
    });
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'View errors' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#validate-first-error$/);
    await expect(page.locator('#validate-lint-results .error').first()).toBeFocused();
    await expect(page.locator('#validate-first-error')).toBeInViewport();
});

test('manual validation preserves duplicate values and detects cross-link differences', async ({ page }) => {
    await mode(page, 'validate');
    await page
        .getByLabel('Link to validate')
        .fill(paymentUrl + '&amountChosen=100\n' + paymentUrl.replace('monthly', 'once'));
    await validate(page);
    const amounts = page
        .locator('#validate-parameters tr')
        .filter({ has: page.getByRole('rowheader', { name: 'amountChosen', exact: true }) });
    await expect(amounts).toHaveCount(3);
    await expect(amounts.nth(1)).toContainText('100');
    await expect(page.locator('#validate-lint-results')).toContainText('DUPLICATE_PARAMETER');
    await expect(page.locator('#validate-lint-results')).toContainText('CROSS_LINK_MISMATCH');
});

test('empty and malformed input show useful errors and edits clear stale parameters and results', async ({
    page,
}) => {
    await mode(page, 'validate');
    await validate(page);
    await expect(page.locator('#validate-lint-results')).toContainText('EMPTY_PACKAGE');
    await expect(page.locator('#validation-status')).toHaveText('Validation found 1 error. View errors');
    await expect(page.locator('#validate-parameters-empty')).toBeVisible();
    await page.getByLabel('Link to validate').fill('not a URL');
    await validate(page);
    await expect(page.locator('#validate-lint-results')).toContainText('INVALID_URL');
    await page.getByLabel('Link to validate').fill(paymentUrl);
    await expect(page.locator('#validate-output')).toBeHidden();
    await expect(page.getByRole('link', { name: 'View errors' })).toHaveCount(0);
    await expect(page.locator('#validation-status')).not.toHaveClass(/has-errors/);
    await expect(page.locator('#validate-parameters')).toBeEmpty();
    await expect(page.locator('#validate-lint-results')).toBeEmpty();
    await validate(page);
    await expect(page.locator('#validate-parameters')).toContainText('Example & café');
    await expect(page.locator('#validate-lint-summary')).toContainText('0 errors · 0 warnings');
    await page.getByLabel('Link to validate').fill('https://other.example/choose-payment?frequency=weekly');
    await validate(page);
    await expect(page.locator('#validate-parameters')).toContainText('weekly');
    await expect(page.locator('#validate-lint-results')).toContainText('INVALID_DESTINATION');
});

test('mode changes preserve independent inputs and editing a campaign invalidates its export', async ({
    page,
}) => {
    await generate(page);
    await mode(page, 'validate');
    await page.getByLabel('Link to validate').fill(paymentUrl);
    await validate(page);
    await mode(page, 'create');
    await page.getByLabel('Campaign name', { exact: false }).fill('Example New Campaign');
    await expect(page.locator('#create-output')).toBeHidden();
    await expect(page.locator('#download-package')).toBeDisabled();
    await mode(page, 'validate');
    await expect(page.getByLabel('Link to validate')).toHaveValue(paymentUrl);
    await expect(page.locator('#validate-output')).toBeVisible();
    await mode(page, 'create');
    await generate(page);
    await expect(page.locator('#create-parameters')).toContainText('Example New Campaign');
});

test('amount and dedication validation still work in the single-page creator', async ({ page }) => {
    await page.locator('input[name="amountPreset"][value="custom"]').check();
    await page.getByLabel('Custom amount (USD)').fill('0.99');
    await generate(page);
    await expect(page.locator('#form-errors')).toContainText('at least $1');
    await page.getByLabel('Custom amount (USD)').fill('1000000');
    await generate(page);
    await expect(page.locator('#form-errors')).toContainText('less than $1000000');
    await page.getByLabel('Custom amount (USD)').fill('60.999');
    await page.getByLabel('Include a dedication').check();
    await generate(page);
    await expect(page.locator('#form-errors')).toContainText('email of the person');
    await dedication(page);
    await page.locator('#dedicateToEmail').fill('invalid');
    await generate(page);
    await expect(page.locator('#form-errors')).toContainText('valid email address');
    await page.locator('#dedicateToEmail').fill('example+honoree@example.com');
    await page.getByLabel('Message (optional)', { exact: true }).fill('Thank you & welcome!\n<example> 🌱');
    await generate(page);
    const payment = new URL(await page.getByLabel('Payment link URL').inputValue());
    expect(payment.searchParams.get('amountChosen')).toBe('60.99');
    expect(payment.searchParams.get('dedicateToMessage')).toBe('Thank you & welcome!\n<example> 🌱');
    await page.getByLabel('Include a dedication').uncheck();
    await expect(page.locator('#dedication-fields')).toBeHidden();
    await generate(page);
    await expect(page.locator('#create-parameters')).not.toContainText('example+honoree@example.com');
});

test('keyboard mode selection, evidence disclosure and narrow layout remain usable', async ({ page }) => {
    await page.locator('[data-mode="validate"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#validate-title')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#lint-input')).toBeFocused();
    await page.locator('.evidence-disclosure > summary').click();
    await expect(page.locator('.evidence-disclosure')).toContainText(
        'Original source excerpts are not present',
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await mode(page, 'create');
    await page.locator('#campaignName').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator('#campaign_label')).toBeFocused();
});

test('copy writes the generated URL and selects it when clipboard access is unavailable', async ({
    page,
    context,
}) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await generate(page);
    const expected = await page.getByLabel('Payment link URL').inputValue();
    await page.getByRole('button', { name: 'Copy payment link', exact: true }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
    await page.evaluate(() => {
        navigator.clipboard.writeText = () => Promise.reject(new Error('Unavailable'));
    });
    await page.getByRole('button', { name: 'Copy payment link', exact: true }).click();
    await expect(page.getByLabel('Payment link URL')).toBeFocused();
    expect(
        await page.getByLabel('Payment link URL').evaluate((node) => node.selectionEnd - node.selectionStart),
    ).toBe(expected.length);
});
