import { generatePackage, lintPackage, parseAttribution, brokenFixture, InputError } from './link-engine.js';

const $ = (id) => document.getElementById(id);
const contract = JSON.parse($('contract-data').dataset.contract);
const form = $('builder');
let currentPackage = null;

function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
}
function announce(message) {
    $('status').textContent = message;
}
function showView(view, focus = true) {
    for (const section of document.querySelectorAll('.view')) section.hidden = section.id !== `view-${view}`;
    for (const button of document.querySelectorAll('[data-view]')) {
        if (button.dataset.view === view) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
    }
    if (focus) document.querySelector(`#view-${view} h2`).focus();
}
for (const button of document.querySelectorAll('[data-view], [data-go]')) {
    button.addEventListener('click', () => showView(button.dataset.view ?? button.dataset.go));
}

function setPackageAvailability(available) {
    for (const node of document.querySelectorAll('[data-package]')) node.hidden = !available;
    for (const node of document.querySelectorAll('[data-empty]')) node.hidden = available;
    for (const id of [
        'download-package',
        'copy-scenario',
        'download-scenario',
        'broken-fixture',
        'restore-links',
    ])
        $(id).disabled = !available;
}
function invalidatePackage() {
    if (!currentPackage) return;
    currentPackage = null;
    setPackageAvailability(false);
    $('lint-input').value = '';
    $('lint-results').replaceChildren();
    $('lint-summary').textContent = '';
    $('lint-source').textContent = 'Settings changed';
    $('validation-count').hidden = true;
    announce('Campaign settings changed. Generate a fresh package to review or export it.');
}
form.addEventListener('input', invalidatePackage);
form.addEventListener('change', () => {
    invalidatePackage();
    const custom = form.elements.amountPreset.value === 'custom';
    $('custom-amount-field').hidden = !custom;
    $('amountChosen').disabled = !custom;
    $('back').disabled = !$('include_campaign').checked;
});

form.addEventListener('submit', (event) => {
    event.preventDefault();
    $('form-errors').hidden = true;
    for (const control of form.querySelectorAll('[aria-invalid]')) control.removeAttribute('aria-invalid');
    try {
        currentPackage = generatePackage(
            {
                campaignName: $('campaignName').value,
                campaign_label: $('campaign_label').value,
                destination_label: $('destination_label').value,
                frequency: form.elements.frequency.value,
                amountChosen:
                    form.elements.amountPreset.value === 'custom'
                        ? $('amountChosen').value
                        : form.elements.amountPreset.value,
                dedicated: $('dedicated').checked,
                include_campaign: $('include_campaign').checked,
                back: $('back').value,
                attribution: parseAttribution($('attribution').value),
            },
            contract,
        );
        renderPackage();
        showView('review');
        announce(
            `Package generated with ${currentPackage.generated_links.length} links. Review the decoded values and static validation before sharing.`,
        );
    } catch (error) {
        currentPackage = null;
        setPackageAvailability(false);
        const issues =
            error instanceof InputError
                ? error.issues
                : [{ explanation: 'The package could not be generated. Check your inputs and try again.' }];
        const box = $('form-errors');
        box.replaceChildren(element('strong', 'Please check your campaign settings.'));
        const list = element('ul');
        for (const issue of issues) {
            list.append(element('li', issue.explanation));
            if (issue.field && $(issue.field)) $(issue.field).setAttribute('aria-invalid', 'true');
        }
        box.append(list);
        box.hidden = false;
        box.focus();
        announce('No link package was generated.');
    }
});

async function copy(text, fallbackField) {
    try {
        await navigator.clipboard.writeText(text);
        announce('Copied to clipboard.');
    } catch {
        if (fallbackField) {
            fallbackField.focus();
            fallbackField.select();
            announce('Clipboard access is unavailable. The URL is selected; use your keyboard copy command.');
        } else
            announce(
                'Clipboard access is unavailable. Download the JSON or select and copy it from the scenario.',
            );
    }
}
function download(value, filename) {
    const blob = new Blob([JSON.stringify(value, null, 2) + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = element('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce(`${filename} downloaded.`);
}

function renderPackage() {
    setPackageAvailability(true);
    $('package-meta').textContent =
        `${currentPackage.campaign_label || 'Untitled internal label'} · ${currentPackage.destination_label || 'No destination label'} · Contract ${currentPackage.contract_version} · ${new Date(currentPackage.generated_at).toLocaleString()}`;
    $('link-cards').replaceChildren();
    $('review-route').replaceChildren();
    for (const link of currentPackage.generated_links) {
        const card = element('article', undefined, 'link-card');
        const heading = element('div', undefined, 'link-heading');
        const copyButton = element('button', 'Copy link', 'button secondary');
        copyButton.type = 'button';
        copyButton.setAttribute('aria-label', `Copy ${link.label.toLowerCase()} link`);
        const field = element('textarea', undefined, 'url-preview');
        field.readOnly = true;
        field.value = link.url;
        field.rows = 2;
        field.setAttribute('aria-label', `${link.label} link URL`);
        field.spellcheck = false;
        copyButton.addEventListener('click', () => copy(link.url, field));
        heading.append(element('h3', `${link.label} link`), copyButton);
        card.append(heading, field);
        $('link-cards').append(card);
        const option = element('option', link.label);
        option.value = link.route;
        $('review-route').append(option);
    }
    renderParameters();
    $('scenario-json').textContent = JSON.stringify(currentPackage.test_scenario, null, 2);
    restoreLinks();
}
function renderParameters() {
    $('parameter-rows').replaceChildren();
    if (!currentPackage) return;
    for (const parameter of currentPackage.parameter_summary.filter(
        (item) => item.route === $('review-route').value,
    )) {
        const row = element('tr');
        const name = element('th');
        name.scope = 'row';
        name.append(element('code', parameter.name));
        const details = element('td');
        details.append(element('div', parameter.role));
        for (const status of parameter.status)
            details.append(element('span', status.replaceAll('_', ' '), 'evidence-tag'));
        details.append(element('small', parameter.evidence));
        row.append(name, element('td', parameter.value), details);
        $('parameter-rows').append(row);
    }
}
$('review-route').addEventListener('change', renderParameters);
function renderLint(results, source) {
    const errors = results.filter((item) => item.severity === 'error').length;
    const warnings = results.filter((item) => item.severity === 'warning').length;
    $('lint-summary').textContent =
        `${errors ? 'Needs correction' : 'Static checks complete'} · ${errors} errors · ${warnings} warnings. Live behavior is unverified.`;
    $('lint-source').textContent = source;
    $('validation-count').textContent = errors + warnings;
    $('validation-count').hidden = errors + warnings === 0;
    $('lint-results').replaceChildren();
    for (const result of results) {
        const card = element('article', undefined, `lint-item ${result.severity}`);
        const heading = element('div', undefined, 'lint-rule');
        heading.append(element('span', result.severity, 'severity'), element('span', result.rule_id));
        if (result.link) heading.append(element('span', `Link ${result.link}`, 'muted'));
        const details = element('details');
        details.append(element('summary', 'Expected & observed values'));
        details.append(
            element('pre', JSON.stringify({ expected: result.expected, observed: result.observed }, null, 2)),
        );
        card.append(
            heading,
            element('p', result.explanation),
            element('p', `Suggested correction: ${result.correction}`),
            details,
        );
        $('lint-results').append(card);
    }
}
function restoreLinks() {
    if (!currentPackage) return;
    $('lint-input').value = currentPackage.generated_links.map((link) => link.url).join('\n');
    renderLint(currentPackage.lint_results, 'Generated package');
}
$('restore-links').addEventListener('click', () => {
    restoreLinks();
    announce('Original generated links restored.');
});
$('broken-fixture').addEventListener('click', () => {
    if (!currentPackage) return;
    const links = brokenFixture(currentPackage);
    $('lint-input').value = links.map((link) => link.url).join('\n');
    renderLint(lintPackage(links, contract), 'Broken fixture — campaign removed from link 2');
    announce(
        'Broken fixture loaded. The original package is unchanged; the missing campaign and cross-link mismatch appear below.',
    );
});
$('lint-input').addEventListener('input', () => {
    $('lint-results').replaceChildren();
    $('lint-summary').textContent = 'Links changed. Run static validation to check these values.';
    $('lint-source').textContent = 'Edited links — not checked';
    $('validation-count').hidden = true;
});
$('lint').addEventListener('click', () => {
    const links = $('lint-input')
        .value.split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    if (links.length > 20 || $('lint-input').value.length > 50000) {
        $('lint-summary').textContent = 'Use at most 20 links and 50,000 characters per check.';
        return;
    }
    renderLint(lintPackage(links, contract), 'Pasted / edited links');
    announce('Static validation finished. Results are shown below.');
});
$('download-package').addEventListener('click', () => {
    if (currentPackage) download(currentPackage, `link-package-${currentPackage.contract_version}.json`);
});
$('download-scenario').addEventListener('click', () => {
    if (currentPackage) download(currentPackage.test_scenario, 'test-scenario.json');
});
$('copy-scenario').addEventListener('click', () => {
    if (currentPackage) copy(JSON.stringify(currentPackage.test_scenario, null, 2));
});
$('generate').disabled = false;
