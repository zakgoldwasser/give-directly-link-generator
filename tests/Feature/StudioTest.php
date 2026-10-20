<?php

namespace Tests\Feature;

use DOMDocument;
use DOMXPath;
use Illuminate\Foundation\Testing\TestCase;

final class StudioTest extends TestCase
{
    public function test_studio_renders_all_five_views_and_the_exact_versioned_contract(): void
    {
        $response = $this->get('/');
        $response->assertOk()->assertSee('Campaign Link Studio')->assertSee('Synthetic demo');
        foreach (['create', 'review', 'validation', 'scenario', 'evidence'] as $view) {
            $response->assertSee('id="view-'.$view.'"', false);
        }
        $dom = new DOMDocument;
        @$dom->loadHTML($response->getContent());
        $node = (new DOMXPath($dom))->query('//*[@id="contract-data"]')->item(0);
        $actual = json_decode($node->getAttribute('data-contract'), true, flags: JSON_THROW_ON_ERROR);
        $expected = json_decode(file_get_contents(resource_path('contracts/2026-10-20.1.json')), true, flags: JSON_THROW_ON_ERROR);
        $this->assertSame($expected, $actual);
    }

    public function test_studio_is_stateless_and_prevents_outbound_connections_and_submissions(): void
    {
        $response = $this->get('/');
        $response->assertHeader('Referrer-Policy', 'no-referrer')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeaderMissing('Set-Cookie');
        $policy = $response->headers->get('Content-Security-Policy');
        $this->assertStringContainsString("connect-src 'none'", $policy);
        $this->assertStringContainsString("form-action 'none'", $policy);
        $this->assertStringContainsString("frame-ancestors 'none'", $policy);
        $this->assertSame('array', config('session.driver'));
        $this->assertSame('array', config('cache.default'));
    }

    public function test_no_campaign_submission_or_file_upload_endpoints_exist(): void
    {
        $this->post('/', ['campaignName' => 'Example'])->assertStatus(405);
        $this->put('/storage/example', ['value' => 'Example'])->assertNotFound();
        $this->get('/storage/example')->assertNotFound();
        $this->get('/up')->assertOk();
    }

    public function test_query_parameters_are_not_reflected_into_the_campaign_form(): void
    {
        $this->get('/?campaignName='.urlencode('<script>alert("example")</script>'))
            ->assertOk()->assertDontSee('<script>alert(', false)
            ->assertSee('value="Example Year-End Campaign"', false);
    }
}
