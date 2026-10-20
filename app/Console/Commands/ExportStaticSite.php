<?php

namespace App\Console\Commands;

use App\Support\StaticSiteExporter;
use Illuminate\Console\Command;

final class ExportStaticSite extends Command
{
    protected $signature = 'site:export';

    protected $description = 'Render the Laravel site into a static Vercel Build Output bundle';

    public function handle(StaticSiteExporter $exporter): int
    {
        $exporter->export();
        $this->info('Static site exported to .vercel/output/static.');
        $this->line('Preview: npm run preview:static');
        $this->line('Deploy: npm run deploy:preview (requires a linked Vercel project)');

        return self::SUCCESS;
    }
}
