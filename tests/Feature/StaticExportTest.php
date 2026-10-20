<?php

namespace Tests\Feature;

use App\Support\StaticSiteExporter;
use Illuminate\Foundation\Testing\TestCase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Route;
use RuntimeException;

final class StaticExportTest extends TestCase
{
    public function test_export_matches_the_blade_page_and_contains_only_explicit_public_assets(): void
    {
        $expected = $this->get('/')->assertOk()->getContent();
        $this->assertSame(0, Artisan::call('site:export'));
        $output = base_path('.vercel/output');
        $this->assertSame($expected, file_get_contents($output.'/static/index.html'));
        $actual = array_map(fn ($file) => str_replace('\\', '/', $file->getRelativePathname()), app('files')->allFiles($output.'/static'));
        $allowed = [...StaticSiteExporter::ASSETS, 'index.html'];
        sort($actual);
        sort($allowed);
        $this->assertSame($allowed, $actual);
        foreach (StaticSiteExporter::ASSETS as $asset) {
            $this->assertSame(file_get_contents(public_path($asset)), file_get_contents($output.'/static/'.$asset));
        }
        $this->assertDirectoryDoesNotExist($output.'/functions');
    }

    public function test_export_preserves_security_headers_and_routes_only_the_homepage_to_html(): void
    {
        app(StaticSiteExporter::class)->export();
        $config = json_decode(file_get_contents(base_path('.vercel/output/config.json')), true, flags: JSON_THROW_ON_ERROR);
        $this->assertSame(3, $config['version']);
        $response = $this->get('/');
        foreach ($config['routes'][0]['headers'] as $name => $value) {
            $this->assertSame($response->headers->get($name), $value);
        }
        $this->assertSame('/.*', $config['routes'][0]['src']);
        $this->assertTrue($config['routes'][0]['continue']);
        $this->assertSame(['src' => '/', 'dest' => '/index.html'], $config['routes'][1]);
        $this->assertSame(['handle' => 'filesystem'], $config['routes'][2]);
    }

    public function test_rebuilding_removes_stale_artifacts_but_preserves_project_metadata(): void
    {
        app(StaticSiteExporter::class)->export();
        $sentinel = base_path('.vercel/export-test-sentinel.txt');
        file_put_contents($sentinel, 'metadata must survive');
        try {
            app('files')->ensureDirectoryExists(base_path('.vercel/output/functions/stale.func'));
            file_put_contents(base_path('.vercel/output/functions/stale.func/index.js'), 'stale');
            file_put_contents(base_path('.vercel/output/static/stale.html'), 'stale');
            app(StaticSiteExporter::class)->export();
            $this->assertDirectoryDoesNotExist(base_path('.vercel/output/functions'));
            $this->assertFileDoesNotExist(base_path('.vercel/output/static/stale.html'));
            $this->assertSame('metadata must survive', file_get_contents($sentinel));
        } finally {
            unlink($sentinel);
        }
    }

    public function test_failed_homepage_render_cannot_leave_a_deployable_manifest(): void
    {
        app(StaticSiteExporter::class)->export();
        Route::get('/', fn () => response('Render failed', 503));
        try {
            app(StaticSiteExporter::class)->export();
            $this->fail('The export should reject a failed render.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('homepage did not render successfully', $exception->getMessage());
            $this->assertFileDoesNotExist(base_path('.vercel/output/config.json'));
        }
    }
}
