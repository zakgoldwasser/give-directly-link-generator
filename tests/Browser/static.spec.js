import { test, expect } from '@playwright/test';

test('static deployment preserves response headers and excludes PHP and private files', async ({
    request,
    baseURL,
}) => {
    test.skip(!baseURL.endsWith(':8001'), 'Checks the static deployment only.');
    const home = await request.get('/');
    expect(home.status()).toBe(200);
    expect(home.headers()['content-security-policy']).toContain("connect-src 'none'");
    expect(home.headers()['content-security-policy']).toContain("form-action 'none'");
    expect(home.headers()['referrer-policy']).toBe('no-referrer');
    expect(home.headers()['x-content-type-options']).toBe('nosniff');
    expect(await home.text()).toContain('Create Link');
    for (const pathname of [
        '/index.php',
        '/.env',
        '/composer.json',
        '/resources/contracts/2026-10-20.1.json',
        '/not-a-route',
        '/api/example',
    ]) {
        expect((await request.get(pathname)).status()).toBe(404);
    }
    expect((await request.post('/')).status()).toBe(405);
    expect((await request.get('/js/studio.js')).headers()['content-type']).toContain('javascript');
    expect((await request.get('/css/studio.css')).headers()['content-type']).toContain('text/css');
});
