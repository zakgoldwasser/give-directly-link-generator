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
    <nav class="view-nav" aria-label="Link workflow">
        <button type="button" data-view="create" aria-controls="view-create" aria-current="step"><span>01</span> Create link</button>
        <button type="button" data-view="review" aria-controls="view-review"><span>02</span> Review parameters</button>
        <button type="button" data-view="validation" aria-controls="view-validation"><span>03</span> Validation results <span id="validation-count" class="count" hidden></span></button>
        <button type="button" data-view="scenario" aria-controls="view-scenario"><span>04</span> Test scenario</button>
        <button type="button" data-view="evidence" aria-controls="view-evidence"><span>05</span> Evidence</button>
    </nav>
    <noscript><p class="notice">Enable JavaScript to generate and lint links locally. Your campaign inputs stay in this browser.</p></noscript>
    <p id="status" class="status" role="status" aria-live="polite"></p>
    <section id="view-create" class="view" aria-labelledby="create-title">
        <div class="create-grid">
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
            <aside class="aside-stack" aria-label="How the package works">
                <div class="dark-card"><p class="eyebrow">A CLEARER HANDOFF</p><h2>One campaign.<br>Every parameter accounted for.</h2><p>A link is only the beginning. Your package makes the next steps explicit.</p><ol class="flow-list"><li><span>1</span><div><strong>Create</strong><small>Encoded links for the selected routes</small></div></li><li><span>2</span><div><strong>Inspect</strong><small>Decoded values and evidence for each parameter</small></div></li><li><span>3</span><div><strong>Validate</strong><small>Static rules and cross-link consistency</small></div></li><li><span>4</span><div><strong>Test safely</strong><small>A reproducible scenario that stops before payment</small></div></li></ol><div class="dark-footer"><span aria-hidden="true">⌁</span> Designed for fundraising + engineering</div></div>
                <div class="note-card"><p class="eyebrow">KNOW WHAT YOU KNOW</p><h3>Observed doesn’t mean verified.</h3><p>Every parameter carries its evidence status. Server behavior and live visible effects are clearly marked as unverified.</p><button type="button" class="text-button" data-go="evidence">Explore the evidence <span aria-hidden="true">→</span></button></div>
            </aside>
        </div>
    </section>
    <section id="view-review" class="view" aria-labelledby="review-title" hidden>
        <div class="section-heading"><div><p class="eyebrow">THE LINK PACKAGE</p><h2 id="review-title" tabindex="-1">Review every parameter</h2><p>Copyable URLs, decoded values, and the evidence behind them.</p></div><button type="button" class="button secondary" id="download-package" disabled>Download package ↓</button></div>
        <div class="empty-state" data-empty>Start by creating a link package.<button type="button" class="text-button" data-go="create">Create your link →</button></div>
        <div data-package hidden><div class="package-meta" id="package-meta"></div><div id="link-cards" class="link-cards"></div><div class="card table-card"><div class="card-heading"><h3>Decoded parameters</h3><label class="compact-label" for="review-route">Route <select id="review-route"></select></label></div><div class="table-scroll" tabindex="0" aria-label="Decoded parameter table"><table><thead><tr><th scope="col">Parameter</th><th scope="col">Decoded value</th><th scope="col">Role & verification</th></tr></thead><tbody id="parameter-rows"></tbody></table></div></div><div class="view-footer"><span>Internal and destination labels stay in the package metadata.</span><button type="button" class="button primary" data-go="validation">Review validation →</button></div></div>
    </section>
    <section id="view-validation" class="view" aria-labelledby="validation-title" hidden>
        <div class="section-heading"><div><p class="eyebrow">CHECK BEFORE SHARING</p><h2 id="validation-title" tabindex="-1">Validation results</h2><p>Check generated or pasted links against the same versioned contract.</p></div><button type="button" class="button secondary" id="broken-fixture" disabled>Try a broken fixture</button></div>
        <div class="card"><div class="field"><label for="lint-input">Links to check</label><textarea id="lint-input" rows="5" spellcheck="false" placeholder="Paste a complete donation link here. One URL per line." aria-describedby="lint-hint"></textarea><small id="lint-hint">Local static analysis only. Pasted URLs are never opened or fetched.</small></div><div class="action-row"><button type="button" id="lint" class="button primary">Run static validation</button><button type="button" id="restore-links" class="button secondary" disabled>Restore generated links</button><span id="lint-source" class="muted">No links checked</span></div></div>
        <div id="lint-summary" class="lint-summary" role="status"></div><div id="lint-results" class="lint-results"></div>
    </section>
    <section id="view-scenario" class="view" aria-labelledby="scenario-title" hidden>
        <div class="section-heading"><div><p class="eyebrow">A REPRODUCIBLE HANDOFF</p><h2 id="scenario-title" tabindex="-1">Test scenario</h2><p>A JSON checklist for manual testing or a future Playwright runner.</p></div><div class="action-row"><button type="button" class="button secondary" id="copy-scenario" disabled>Copy JSON</button><button type="button" class="button primary" id="download-scenario" disabled>Download scenario ↓</button></div></div>
        <div class="empty-state" data-empty>Create a link package to generate its test scenario.<button type="button" class="text-button" data-go="create">Create your link →</button></div>
        <div data-package hidden><div class="stop-banner"><strong>Stop before payment submission.</strong><span>This scenario does not execute automatically or verify live behavior.</span></div><pre id="scenario-json" tabindex="0" aria-label="Test scenario JSON"></pre></div>
    </section>
    <section id="view-evidence" class="view" aria-labelledby="evidence-title" hidden>
        <div class="section-heading"><div><p class="eyebrow">EVIDENCE, NOT ASSUMPTIONS</p><h2 id="evidence-title" tabindex="-1">Know the contract’s limits</h2><p>Contract {{ $contract['contract_version'] }} · No live behavior verified</p></div></div>
        <div class="notice evidence-note"><p>{{ $contract['evidence_note'] }}</p></div>
        <div class="card table-card"><div class="card-heading"><h3>Parameter evidence register</h3></div><div class="table-scroll" tabindex="0" aria-label="Parameter evidence table"><table><thead><tr><th scope="col">Parameter</th><th scope="col">What was reported</th><th scope="col">Status & source</th></tr></thead><tbody>@foreach($contract['parameters'] as $name => $parameter)<tr><th scope="row"><code>{{ $name }}</code></th><td>{{ $parameter['role'] }}</td><td>@foreach($parameter['status'] as $status)<span class="evidence-tag">{{ str_replace('_', ' ', $status) }}</span>@endforeach<small>{{ $parameter['evidence'] }}</small></td></tr>@endforeach</tbody></table></div></div>
        <div class="evidence-grid"><div class="card"><h3>Local policies & assumptions</h3><ul class="assumptions">@foreach($contract['assumptions'] as $assumption)<li>{{ $assumption }}</li>@endforeach</ul></div><div class="card"><h3>Contract history</h3>@foreach($contract['history'] as $entry)<article class="history-entry"><span class="pill">{{ $entry['version'] }}</span><h4>{{ $entry['change'] }}</h4><p>{{ $entry['reason'] }}</p><small>{{ $entry['verification'] }}</small></article>@endforeach<h3 class="legend-heading">Verification vocabulary</h3><p class="muted">“Visible effect verified” and “server behavior verified” are reserved for future evidence. “Analytics only” is not a donation input. “Unknown” makes no support claim.</p></div></div>
    </section>
    <div id="contract-data" data-contract="{{ json_encode($contract, JSON_THROW_ON_ERROR) }}" hidden></div>
</main>
<footer class="site-footer"><span>Campaign Link Studio <span aria-hidden="true">/</span> An independent work sample</span><span>Synthetic data. Transparent assumptions. No payments.</span></footer>
</body>
</html>
