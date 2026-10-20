<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Create, inspect and validate synthetic donation campaign links against a transparent, versioned contract.">
    <title>Campaign Link Studio</title>
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="/css/studio.css">
    <script type="module" src="/js/studio.js"></script>
</head>
<body>
<a class="skip-link" href="#main">Skip to workspace</a>
<header class="site-header">
    <a class="brand" href="/" aria-label="Campaign Link Studio home"><span class="brand-icon" aria-hidden="true">↗</span><span>Campaign<span class="brand-light"> Link Studio</span></span></a>
    <span class="demo-badge"><span aria-hidden="true">●</span> Independent work sample</span>
</header>
<main id="main" class="workspace" tabindex="-1">
    <div class="intro"><div><p class="eyebrow">FUNDRAISING OPERATIONS / LINK BUILDER</p><h1>Make every link count.</h1><p class="lede">Create a campaign link. See what it carries. Share with more confidence.</p></div><div class="contract-stamp"><span>CONTRACT VERSION</span><strong>{{ $contract['contract_version'] }}</strong><small>Static checks · transparent evidence</small></div></div>
    <div class="notice"><span aria-hidden="true">ⓘ</span><p>A public demo with synthetic campaigns. Links follow a documented contract; live donation behavior remains unverified. This tool is not affiliated with GiveDirectly.</p></div>
    <nav class="view-nav mode-nav" aria-label="Link tools">
        <button type="button" data-mode="create" aria-controls="view-create" aria-pressed="true">Create Link</button>
        <button type="button" data-mode="validate" aria-controls="view-validate" aria-pressed="false">Validate link</button>
    </nav>
    <noscript><p class="notice">Enable JavaScript to create and validate links locally in your browser.</p></noscript>
    <p id="status" class="status" role="status" aria-live="polite"></p>
    <section id="view-create" class="view" aria-labelledby="create-title">
            <form id="builder" class="card" novalidate>
                <div class="card-heading"><div><p class="eyebrow">YOUR CAMPAIGN</p><h2 id="create-title" tabindex="-1">Build a donation link</h2></div><span class="pill">Synthetic demo</span></div>
                <div id="form-errors" class="form-errors" role="alert" tabindex="-1" hidden></div>
                <div class="field"><label for="campaignName">Campaign name <span class="required">Required</span></label><input id="campaignName" name="campaignName" value="Example Year-End Campaign" maxlength="120" required aria-describedby="campaign-hint"><small id="campaign-hint">Included in the URL. Use a synthetic campaign, without personal data.</small></div>
                <div class="field-row"><div class="field"><label for="campaign_label">Internal label</label><input id="campaign_label" name="campaign_label" value="Year-end 2026" maxlength="120"><small>Package metadata only</small></div><div class="field"><label for="destination_label">Destination program label</label><input id="destination_label" name="destination_label" value="Example cash transfers" maxlength="120"><small>A label, not a program-routing parameter</small></div></div>
                <div class="divider"></div>
                <fieldset><legend>Donation frequency</legend><div class="choice-row frequency"><label><input type="radio" name="frequency" value="once"><span>One-time</span></label><label><input type="radio" name="frequency" value="monthly" checked><span>Monthly <span aria-hidden="true">↻</span></span></label></div></fieldset>
                <fieldset><legend>Donation amount <span class="muted">USD</span></legend><div class="choice-row amounts"><label><input type="radio" name="amountPreset" value="30"><span>$30</span></label><label><input type="radio" name="amountPreset" value="60" checked><span>$60</span></label><label><input type="radio" name="amountPreset" value="100"><span>$100</span></label><label><input type="radio" name="amountPreset" value="custom"><span>Custom</span></label></div></fieldset>
                <div id="custom-amount-field" class="field" hidden><label for="amountChosen">Custom amount (USD)</label><input id="amountChosen" name="amountChosen" inputmode="decimal" placeholder="60.00" maxlength="80" aria-describedby="amount-rules" disabled></div>
                <p id="amount-rules" class="rule-note">Observed client rule: $1 minimum, below $1,000,000. Extra decimal places are truncated, never rounded.</p>
                <label class="check-card"><input type="checkbox" id="dedicated" name="dedicated" aria-controls="dedication-fields"><span><strong>Include a dedication</strong><small>Add the person you wish to honor and your message.</small></span><span class="check-icon" aria-hidden="true">♡</span></label>
                <fieldset id="dedication-fields" class="dedication-fields" hidden disabled>
                    <legend>Dedication details</legend>
                    <p id="dedication-hint" class="rule-note">These details appear in the payment URL and downloaded package. Use fictional names and an example.com email for this public demo.</p>
                    @foreach($contract['dedication_fields'] as $name => $field)
                        <div class="field">
                            <label for="{{ $name }}">{{ $field['label'] }}</label>
                            @if($name === 'dedicateToMessage')
                                <textarea id="{{ $name }}" name="{{ $name }}" rows="3" maxlength="{{ $field['max_length'] }}" aria-describedby="dedication-hint" autocomplete="off"></textarea>
                            @else
                                <input id="{{ $name }}" name="{{ $name }}" type="{{ $field['type'] }}" maxlength="{{ $field['max_length'] }}" required aria-describedby="dedication-hint" autocomplete="off">
                            @endif
                        </div>
                    @endforeach
                </fieldset>
                <details class="advanced"><summary>Campaign selection & attribution <span aria-hidden="true">+</span></summary><div class="advanced-body">
                    <label class="check-line"><input type="checkbox" id="include_campaign" name="include_campaign"> Include a campaign-selection link</label>
                    <div class="field"><label for="back">Return route</label><select id="back" name="back" disabled>@foreach($contract['parameters']['back']['values'] as $route)<option value="{{ $route }}">{{ $contract['routes'][$route]['label'] }}</option>@endforeach</select></div>
                    <div class="field"><label for="attribution">Optional attribution</label><textarea id="attribution" name="attribution" rows="3" placeholder="utm_campaign=example-year-end" maxlength="11000" aria-describedby="attribution-hint"></textarea><small id="attribution-hint">One key=value per line. Values are plain text. Unknown parameters are preserved with an unverified warning.</small></div>
                </div></details>
                <button id="generate" class="button primary full" type="submit" disabled>Generate link package <span aria-hidden="true">↗</span></button>
                <p class="privacy-note">Processed in your browser. No campaign data is stored.</p>
            </form>
        <section id="create-output" class="inline-output" aria-labelledby="create-output-title" hidden>
            <div class="section-heading"><div><p class="eyebrow">YOUR GENERATED LINKS</p><h2 id="create-output-title" tabindex="-1">Link package</h2></div><button type="button" id="download-package" class="button secondary" disabled>Download package ↓</button></div>
            <p id="package-meta" class="package-meta"></p>
            <div id="link-cards" class="link-cards"></div>
            @include('partials.link-results', ['prefix' => 'create'])
        </section>
    </section>
    <section id="view-validate" class="view" aria-labelledby="validate-title" hidden>
        <form id="validator" class="card" novalidate>
            <div class="card-heading"><div><p class="eyebrow">CHECK AN EXISTING LINK</p><h2 id="validate-title" tabindex="-1">Validate a donation link</h2></div></div>
            <div class="field">
                <label for="lint-input">Link to validate</label>
                <textarea id="lint-input" rows="4" spellcheck="false" placeholder="https://donate.givedirectly.org/choose-payment?..." aria-describedby="lint-hint" maxlength="50000"></textarea>
                <small id="lint-hint">Paste a complete URL. To compare links, put one on each line. Links are checked locally and are never opened or fetched.</small>
            </div>
            <button type="submit" id="lint" class="button primary" disabled>Validate link</button>
            <p id="validation-status" class="status" role="status"></p>
        </form>
        <section id="validate-output" class="inline-output" aria-labelledby="validate-output-title" hidden>
            <div class="section-heading"><h2 id="validate-output-title" tabindex="-1">Link details</h2></div>
            @include('partials.link-results', ['prefix' => 'validate'])
        </section>
    </section>
    <details class="evidence-disclosure">
        <summary>Evidence & assumptions · Contract {{ $contract['contract_version'] }}</summary>
        <div class="notice evidence-note"><p>{{ $contract['evidence_note'] }}</p></div>
        <div class="card table-card"><div class="card-heading"><h3>Parameter evidence register</h3></div><div class="table-scroll" tabindex="0" aria-label="Parameter evidence table"><table><thead><tr><th scope="col">Parameter</th><th scope="col">What was reported</th><th scope="col">Status & source</th></tr></thead><tbody>@foreach($contract['parameters'] as $name => $parameter)<tr><th scope="row"><code>{{ $name }}</code></th><td>{{ $parameter['role'] }}</td><td>@foreach($parameter['status'] as $status)<span class="evidence-tag">{{ str_replace('_', ' ', $status) }}</span>@endforeach<small>{{ $parameter['evidence'] }}</small></td></tr>@endforeach</tbody></table></div></div>
        <div class="evidence-grid"><div class="card"><h3>Local policies & assumptions</h3><ul class="assumptions">@foreach($contract['assumptions'] as $assumption)<li>{{ $assumption }}</li>@endforeach</ul></div><div class="card"><h3>Contract history</h3>@foreach($contract['history'] as $entry)<article class="history-entry"><span class="pill">{{ $entry['version'] }}</span><h4>{{ $entry['change'] }}</h4><p>{{ $entry['reason'] }}</p><small>{{ $entry['verification'] }}</small></article>@endforeach<h3 class="legend-heading">Verification vocabulary</h3><p class="muted">“Visible effect verified” and “server behavior verified” are reserved for future evidence. “Analytics only” is not a donation input. “Unknown” makes no support claim.</p></div></div>

    </details>
    <div id="contract-data" data-contract="{{ json_encode($contract, JSON_THROW_ON_ERROR) }}" hidden></div>
</main>
<footer class="site-footer"><span>Campaign Link Studio <span aria-hidden="true">/</span> An independent work sample</span><span>Synthetic data. Transparent assumptions. No payments.</span></footer>
</body>
</html>
