# Campaign Link Studio

An independent fundraising operations work sample built with **Laravel 13, PHP 8.4+, Blade, and vanilla JavaScript**. It implements [the supplied specification](spec.md.md) with the requested follow-up simplification: a single page with Create Link and Validate link modes. Generated and pasted links show decoded parameters and static validation inline. Test scenario generation and downloads have been removed.

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

## One page, two modes

- **Create Link:** enter campaign details, frequency, amount, and optional dedication. Generate copyable links, then see all decoded parameters and validation results directly below the form. Download the link package as JSON.
- **Validate link:** manually paste a URL and validate it. Decoded parameters appear below the input, followed by errors, warnings, and corrections. Multiple links can be compared by entering one per line. Duplicate query values remain visible as separate rows; unknown parameters retain their evidence status. Invalid URLs show an error and an empty parameter state.

Evidence and assumptions are available in a collapsed section at the bottom of the same page. There are no separate review, results, or scenario views. Packages no longer contain a test scenario.

The two modes preserve their own input and result state. Changes to campaign settings invalidate its generated package and export without overwriting pasted links. Editing a pasted link clears its old parameters and results until it is validated again.

Internal and destination labels are metadata only. A destination label does **not** select a live donation program. Unknown attribution is preserved in every generated link, visibly marked unverified, and cannot overwrite reserved donation parameters. Attribution values are plain text, one `key=value` per line; ampersands and equals signs in values are encoded safely.

## Evidence and uncertainty

The current version is `2026-10-20.1`, stored in `resources/contracts/2026-10-20.1.json`; the initial `2026-10-20` version is retained for historical packages. Its provenance is the supplied spec's summaries of HTML and JavaScript. **The original HTML/JavaScript evidence excerpts were not provided in this repository.** References therefore point to the relevant spec sections rather than invented source filenames or line numbers. The dedication extension additionally uses the user-reported form labels and payment URL documented in [dedication evidence](docs/dedication-evidence.md). These fields are marked `propagated_to_route`, without claiming independently verified server behavior.

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

Campaign and dedication data stay in browser memory until explicitly copied or downloaded. Dedication values are included in payment URLs and exports; use fictional names and example.com addresses in this public demo. Unchecking dedication excludes its values from generated links and exports. There are no campaign POST endpoints, persistence tables, accounts, background workers, localStorage, cookies, third-party scripts, or analytics. The browser Content Security Policy blocks outbound connections and form submissions. Laravel logs to stderr and does not log generated packages. A hosting server's access logs are separate; avoid adding query/body logging that could capture user-supplied values.

The package includes version, labels, generated links, parameter summaries with evidence, structured lint results, and a UTC generation timestamp. Generation and manual validation share the same query inspection and linting modules.

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

- Node tests exercise the same domain module shipped to the browser: amount boundaries/truncation, encoding/Unicode, valid and invalid frequency/flags, unknown and duplicate parameters, route rules, consistency, manual parameter inspection, and broken fixtures.
- PHPUnit tests exercise Laravel rendering, exact contract loading, privacy/security headers, absence of campaign/file-write routes, and non-reflection of query input.
- Playwright tests exercise desktop and mobile workflows, exports, clipboard behavior, form errors, literal rendering of untrusted text, stale-package invalidation, keyboard navigation, and layout overflow. External network requests fail the browser tests.
- Screenshots and failure traces are written to ignored `test-results/`. CI runs the same checks against the local application only.

The intentionally broken static package is in `tests/fixtures/broken-package.json`. Its second link lacks `campaignName`; the linter reports both `MISSING_PARAMETER` and `CROSS_LINK_MISMATCH`. This is a regression-test fixture, not a separate product workflow.

## Quick demonstration

1. In **Create Link**, keep the example campaign, monthly, and $60. Optionally enable dedication and enter fictional recipient/sender details.
2. Generate the package. Inspect the links, decoded parameters and validation results below the form; copy the payment URL.
3. Switch to **Validate link**, paste that URL and validate it. Inspect its decoded values and results below the input.
4. Add a duplicate amount parameter or change frequency to weekly and validate again to see the corresponding errors.
5. Expand evidence and assumptions to see what is reported in the source and what remains unverified.

Production server acceptance, real campaign validity, and live navigation behavior remain outside this demo's claims.
