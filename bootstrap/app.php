<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(web: __DIR__.'/../routes/web.php', health: '/up')
    ->withMiddleware(function (Middleware $middleware): void {
        // No user sessions, cookies, database, or persisted campaign data.
        $middleware->group('web', []);
    })
    ->withExceptions(function (Exceptions $exceptions): void {})
    ->create();
