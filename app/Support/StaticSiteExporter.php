<?php

namespace App\Support;

use Illuminate\Contracts\Http\Kernel;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Http\Request;
use RuntimeException;

final class StaticSiteExporter
{
    // Explicit public files: do not publish public/index.php or arbitrary repository files.
    public const ASSETS = ['css/studio.css', 'js/studio.js', 'js/link-engine.js', 'favicon.svg'];

    public function __construct(private Filesystem $files, private Kernel $kernel) {}

    public function export(): void
    {
        $parent = base_path('.vercel');
        $output = $parent.'/output';
        // Keep cleanup confined to the generated directory, including on Windows.
        foreach ([$parent, $output] as $path) {
            if (is_link($path) || (file_exists($path) && $this->normalized(realpath($path)) !== $this->normalized($path))) {
                throw new RuntimeException('Refusing to export through a redirected .vercel/output path.');
            }
        }
        if (is_dir($output) && !$this->files->deleteDirectory($output)) {
            throw new RuntimeException('Could not clear the previous static export.');
        }
        $this->files->ensureDirectoryExists($output.'/static');

        $request = Request::create('/', 'GET');
        $response = $this->kernel->handle($request);
        $this->kernel->terminate($request, $response);
        if ($response->getStatusCode() !== 200 || !str_contains($response->headers->get('Content-Type', ''), 'text/html')) {
            throw new RuntimeException('The homepage did not render successfully; no deployable configuration was created.');
        }
        $this->write($output.'/static/index.html', $response->getContent());
        foreach (self::ASSETS as $asset) {
            $source = public_path($asset);
            if (!is_file($source) || is_link($source)) {
                throw new RuntimeException('Missing or redirected public asset: '.$asset);
            }
            $this->files->ensureDirectoryExists(dirname($output.'/static/'.$asset));
            if (!$this->files->copy($source, $output.'/static/'.$asset)) {
                throw new RuntimeException('Could not export asset: '.$asset);
            }
        }

        // Preserve the controller's security policy without maintaining a separate copy.
        $headers = [];
        foreach (['Content-Security-Policy', 'Referrer-Policy', 'X-Content-Type-Options', 'Cache-Control'] as $name) {
            $value = $response->headers->get($name);
            if ($value === null) {
                throw new RuntimeException('Missing required homepage header: '.$name);
            }
            $headers[$name] = $value;
        }
        // Write the manifest last: a failed render or asset copy is not a deployable build.
        $this->write($output.'/config.json', json_encode([
            'version' => 3,
            'routes' => [
                ['src' => '/.*', 'headers' => $headers, 'continue' => true],
                ['src' => '/', 'dest' => '/index.html'],
                ['handle' => 'filesystem'],
            ],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)."\n");
    }

    private function normalized(string $path): string
    {
        $path = str_replace('\\', '/', $path);

        return PHP_OS_FAMILY === 'Windows' ? strtolower($path) : $path;
    }

    private function write(string $path, string $contents): void
    {
        if ($this->files->put($path, $contents) === false) {
            throw new RuntimeException('Could not write static export: '.$path);
        }
    }
}
