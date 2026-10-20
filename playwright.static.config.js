import { defineConfig } from '@playwright/test';
import base from './playwright.config.js';
export default defineConfig({
    ...base,
    outputDir: 'test-results/static',
    use: { ...base.use, baseURL: 'http://127.0.0.1:8001' },
    webServer: {
        command: 'node scripts/preview-static.mjs',
        url: 'http://127.0.0.1:8001',
        reuseExistingServer: false,
        timeout: 10000,
    },
});
