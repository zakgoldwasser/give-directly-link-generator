import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
    testDir: './tests/Browser',
    fullyParallel: false,
    workers: 1,
    reporter: 'list',
    use: { baseURL: 'http://127.0.0.1:8000', trace: 'retain-on-failure' },
    projects: [
        { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1100 } } },
        { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
    ],
    webServer: {
        command: `"${process.env.PHP_BINARY || 'php'}" artisan serve --host=127.0.0.1 --port=8000`,
        url: 'http://127.0.0.1:8000',
        reuseExistingServer: !process.env.CI,
        timeout: 30000,
    },
});
