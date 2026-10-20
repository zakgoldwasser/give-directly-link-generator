<?php

namespace App\Http\Controllers;

use Illuminate\Http\Response;

final class StudioController
{
    public function __invoke(): Response
    {
        $contract = json_decode(file_get_contents(resource_path('contracts/2026-10-20.1.json')), true, flags: JSON_THROW_ON_ERROR);

        return response()->view('studio', ['contract' => $contract])->withHeaders([
            'Content-Security-Policy' => "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
            'Referrer-Policy' => 'no-referrer',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'no-store',
        ]);
    }
}
