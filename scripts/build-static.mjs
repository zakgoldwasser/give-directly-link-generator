import { spawnSync } from 'node:child_process';
const result = spawnSync(process.env.PHP_BINARY || 'php', ['artisan', 'site:export'], { stdio: 'inherit' });
if (result.error) {
    process.stderr.write(
        'PHP could not be started. Install PHP 8.4+ or set PHP_BINARY to its executable path.\n',
    );
}
process.exit(result.status ?? 1);
