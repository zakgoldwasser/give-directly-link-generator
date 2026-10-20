# Static deployment on Vercel

Laravel and Blade remain the source. `php artisan site:export` renders the homepage through Laravel and creates a Vercel Build Output API v3 bundle. Vercel serves the resulting HTML, CSS, JavaScript, and favicon without PHP, a database, or server functions.

## Build and preview

Install PHP 8.4+, Composer 2, and Node.js 22+. From the repository root:

```sh
composer install
npm ci
npm run build
npm run preview:static
```

Open http://127.0.0.1:8001. Stop the preview with Ctrl+C before running browser tests. The preview serves only the exported files and applies their response headers; it is a local check, not a full Vercel emulator.

`npm run build` invokes `php artisan site:export`. If PHP is not on PATH, set `PHP_BINARY` to its executable. For this Windows workspace:

```powershell
$env:PHP_BINARY = (Resolve-Path .tools/php/php.exe).Path
npm.cmd run build
```

The export does not require an application key or database. Composer's install step discovers Laravel packages; Laravel needs writable `storage/framework/views` and `bootstrap/cache` during rendering. Never edit the exported HTML: change Blade, PHP, or the public assets and rebuild.

## Deploy from your computer

Authenticate and link this folder to your Vercel project once:

```sh
npx vercel login
npx vercel link
```

Choose the **Other** framework preset if prompted. The project IDs are saved in ignored `.vercel/project.json`; exporting preserves that file.

Build and test the static bundle, then upload a preview:

```sh
npx playwright install chromium
npm run test:static
npm run deploy:preview
```

When you are ready to publish the tested bundle to the production domain:

```sh
npm run deploy:production
```

Both deploy commands use `vercel deploy --prebuilt`. They upload the existing `.vercel/output` bundle; they do not rebuild it. Always rerun `npm run test:static` after source changes and before deployment. There is no need to run `vercel build`, install PHP on Vercel, or configure a PHP runtime. This repository does not include Vercel credentials or a linked project.

## Deploy with GitHub Actions

1. Push these commits to GitHub. The manual workflow must be present on the default branch to appear in Actions.
2. Create a Vercel token and add these GitHub Actions secrets, either at repository level or in both the `preview` and `production` environments:
   - `VERCEL_TOKEN`: the deployment token.
   - `VERCEL_ORG_ID`: `orgId` from your local `.vercel/project.json`.
   - `VERCEL_PROJECT_ID`: `projectId` from the same file.
3. In **Actions → Deploy static site to Vercel → Run workflow**, choose the branch and target. The default target is `preview`; select `production` to publish to your production domain.

The workflow installs dependencies, checks Composer metadata, runs PHP and JavaScript tests, checks formatting, renders Blade, and exercises the static site in desktop and mobile browsers before uploading that same bundle. Missing deployment secrets fail the upload step. GitHub environment protection rules can be configured separately if desired.

`vercel.json` disables Vercel's automatic Git deployments. Use the provided workflow or local prebuilt commands: a native Vercel Git build would otherwise need a PHP build environment. The existing Verify workflow also tests the static bundle on pushes and pull requests without deployment credentials.

## What gets deployed

- `.vercel/output/static/index.html`: the rendered Blade page, including its embedded contract data.
- The four explicit public assets: `css/studio.css`, `js/studio.js`, `js/link-engine.js`, and `favicon.svg`.
- `.vercel/output/config.json`: routing and the homepage's Content Security Policy, referrer policy, content-type protection, and cache policy, taken from Laravel's actual response.

No PHP source, `.env`, vendor directory, raw contract files, or server functions are exported. The homepage is available at `/`; assets are served by path. Unknown paths return 404; Laravel's `/up` route is not exported. All link generation and validation continues in vanilla JavaScript in the browser.

The exporter replaces only `.vercel/output`, removes stale artifacts, and writes the deployment manifest only after rendering and asset copying succeed. Generated output and Vercel project metadata are ignored by Git. Treat exports as disposable and do not run multiple exports in the same checkout concurrently.

The pinned Vercel CLI is development/deployment tooling and is not included in the static bundle. Its current dependency tree has upstream npm audit advisories; compatible `npm audit fix` does not resolve all of them. Recheck those advisories when updating the CLI rather than applying forced downgrades or incompatible overrides.

## References

- [Vercel Build Output API](https://vercel.com/docs/build-output-api)
- [Output configuration and routing](https://vercel.com/docs/build-output-api/configuration)
- [Prebuilt deployments with Vercel CLI](https://vercel.com/docs/cli/deploy)
- [GitHub Actions and Vercel](https://vercel.com/kb/guide/how-can-i-use-github-actions-with-vercel)
- [Disabling automatic Git deployments](https://vercel.com/docs/project-configuration/git-configuration)
