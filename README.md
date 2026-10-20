# Campaign Link Studio

An independent fundraising operations work sample built with **Laravel 13, PHP 8.4+, Blade, and vanilla JavaScript**. It implements [the supplied specification](spec.md.md): create a synthetic campaign link, inspect its parameters, lint a package, and export a scenario that explicitly stops before payment.

This is not affiliated with or approved by GiveDirectly. It does not scrape, fetch donation URLs, submit payment forms, or establish that a generated link is accepted by a live server.

## Run locally

Requirements: PHP 8.4+ with the extensions required by Composer, Composer 2, and a modern browser. Node.js 22+ is only needed for development checks. No database, object storage, frontend build, or npm packages are needed to serve the application.

```sh
composer install
cp .env.example .env
php artisan key:generate
php artisan serve --host=127.0.0.1 --port=8000
```

On PowerShell, replace `cp .env.example .env` with `Copy-Item .env.example .env`. Open http://127.0.0.1:8000. The application does not use sessions or encrypted user data; the generated application key is standard Laravel setup.

For this workspace, portable PHP and Composer were downloaded into the ignored `.tools` directory. If PHP is not on PATH, use:

```powershell
& .tools/php/php.exe .tools/composer.phar install
& .tools/php/php.exe artisan serve --host=127.0.0.1 --port=8000
```

The portable tools are local conveniences, not distributed dependencies. Other clones should install PHP and Composer normally. Point a production web server at `public/`, keep `APP_DEBUG=false`, and allow Laravel to write its compiled views and bootstrap cache. There is no deployment or publishing integration.

## Five compact views

1. **Create link:** synthetic campaign, internal label, destination label, frequency, preset/custom amount, dedication, optional campaign selection and attribution.
2. **Review parameters:** safely encoded copyable URLs, decoded parameter tables, per-parameter evidence/status, and a JSON package download.
3. **Validation results:** local linting of generated or pasted URLs, structured errors/warnings/corrections, cross-link comparison, and a deliberately broken fixture.
4. **Test scenario:** copy/download reproducible JSON, expected parameters for every route, contract version, and `stop_before_payment: true`.
5. **Evidence:** the source-observation register, local assumptions, verification vocabulary, and contract history.

Changes to campaign settings invalidate the previous package and its exports. Pasted or broken-fixture lint results are separate from the original generated package. The **Restore generated links** action returns to that original package.

Internal and destination labels are metadata only. A destination label does **not** select a live donation program. Unknown attribution is preserved in every generated link, visibly marked unverified, and cannot overwrite reserved donation parameters. Attribution values are plain text, one `key=value` per line; ampersands and equals signs in values are encoded safely.

## Evidence and uncertainty

The initial version is `2026-10-20`, stored in `resources/contracts/2026-10-20.json`. Its provenance is the supplied spec's summaries of HTML and JavaScript. **The original HTML/JavaScript evidence excerpts were not provided in this repository.** References therefore point to the relevant spec sections rather than invented source filenames or line numbers.

- **Source-observed (reported by the spec):** `once`/`monthly`; client writes to `frequency`, `amountChosen`, and `dedicated`; custom amounts from $1 to below $1,000,000; truncation to two decimal places; campaign/return-route propagation.
- **Behavior-verified on the live donation site:** **none**. No parameter has `visible_effect_verified` or `server_behavior_verified` status. Passing local tests proves this application's behavior against its fixtures, not the destination site's behavior.
- **Local policies/assumptions:** the three route allowlists, required campaign name, selected return routes, applying the amount limits to presets, 120-character labels, attribution size limits, and strict plain-decimal input. These are not asserted server validation rules.
- **Incomplete behavior:** `amountBilled` and `utm_source` retain uncertainty warnings. The special instrumentation use of `utm_source=automated_browser_test` is described, not automatically added.
- **Route applicability unknown:** `focusOtherAmount` is recorded in the evidence register and its exact-`true` rule is linted, but it is not emitted to the three routes because none allow it in the supplied route contract.
- **Analytics-only:** `amount` and `donationId` are not offered as donation inputs and are rejected by the route linter.
- **Unknown parameters:** preserved in previews and exports with `UNKNOWN_PARAMETER` warnings; never silently dropped or described as supported.

See [the contract changelog](CHANGELOG.md) for what changed, why, and the verification level. Future contract changes should receive a new versioned file, update the controller's selected version, update the history, and add representative tests. Do not promote verification statuses based solely on a URL or a successful local unit test.

## Architecture

Laravel serves the Blade page with the escaped contract embedded in an HTML data attribute. The pure JavaScript module `public/js/link-engine.js` owns generation and linting; `public/js/studio.js` connects it to accessible native form controls and safe DOM rendering. `URL` and `URLSearchParams` handle query encoding. Decimal strings and integer comparisons avoid floating-point rounding at the amount boundaries.

Campaign data stays in browser memory until explicitly copied or downloaded. There are no campaign POST endpoints, persistence tables, accounts, background workers, localStorage, cookies, third-party scripts, or analytics. The browser Content Security Policy blocks outbound connections and form submissions. Laravel logs to stderr and does not log generated packages. A hosting server's access logs are separate; avoid adding query/body logging that could capture user-supplied values.

The package includes version, labels, generated links, parameter summaries with evidence, structured lint results, a test scenario, and a UTC generation timestamp. Scenario IDs are deterministic from link content; their hash is an identifier, not a cryptographic guarantee. The JSON scenario is a handoff format, **not an automatically executable live-site test**.

## Verify

```sh
composer test
npm ci
npm test
npx playwright install chromium
npm run test:browser
npm run format:check
php artisan view:cache
composer validate --strict
```

Playwright starts a local Laravel server, or reuses one already listening on port 8000 outside CI. On Linux, `npx playwright install --with-deps chromium` also installs browser system dependencies. On this Windows workspace, when PHP is not on PATH:

```powershell
& .tools/php/php.exe vendor/bin/phpunit
$env:PHP_BINARY = (Resolve-Path .tools/php/php.exe).Path
npm.cmd run test:browser
```

- Node tests exercise the same domain module shipped to the browser: amount boundaries/truncation, encoding/Unicode, valid and invalid frequency/flags, unknown and duplicate parameters, route rules, consistency, stable scenarios, and broken fixtures.
- PHPUnit tests exercise Laravel rendering, exact contract loading, privacy/security headers, absence of campaign/file-write routes, and non-reflection of query input.
- Playwright tests exercise desktop and mobile workflows, exports, clipboard behavior, form errors, literal rendering of untrusted text, stale-package invalidation, keyboard navigation, and layout overflow. External network requests fail the browser tests.
- Screenshots and failure traces are written to ignored `test-results/`. CI runs the same checks against the local application only.

The intentionally broken static package is in `tests/fixtures/broken-package.json`. Its second link lacks `campaignName`; the linter reports both `MISSING_PARAMETER` and `CROSS_LINK_MISMATCH`. The UI creates the same defect from the user's current synthetic package without altering the original.

## Three-minute demonstration

1. Keep **Example Year-End Campaign**, monthly, $60, and dedication enabled.
2. Generate the package and inspect the payment/dedication links and decoded values.
3. Review the contract version and evidence statuses; explain that they are not live verification.
4. Open validation and choose **Try a broken fixture**. Show the missing campaign and cross-link mismatch, then restore the generated links.
5. Add `utm_campaign=example-year-end` under attribution and regenerate. Show that the value is preserved but visibly unverified.
6. Download the scenario and point out `stop_before_payment: true`.

The result is a reproducible fundraising-to-engineering handoff with explicit uncertainty. Production server acceptance, real campaign validity, and live navigation behavior remain outside this demo's claims.
