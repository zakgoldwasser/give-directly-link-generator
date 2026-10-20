import { generatePackage, lintPackage, summarizeLinks, parseAttribution, InputError } from './link-engine.js';

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
for (const button of document.querySelectorAll('[data-mode]')) {
    button.addEventListener('click', () => {
        const mode = button.dataset.mode;
        for (const name of ['create', 'validate']) $(`view-${name}`).hidden = name !== mode;
        for (const other of document.querySelectorAll('[data-mode]'))
            other.setAttribute('aria-pressed', String(other === button));
        announce('');
        $(`${mode}-title`).focus();
    });
}
function invalidatePackage() {
    if (!currentPackage) return;
    currentPackage = null;
    $('create-output').hidden = true;
    $('download-package').disabled = true;
    announce('Settings changed. Generate a fresh link package to review or export it.');
}
form.addEventListener('input', (event) => {
    invalidatePackage();
    event.target.removeAttribute('aria-invalid');
    $('form-errors').hidden = true;
});
form.addEventListener('change', () => {
    invalidatePackage();
    const custom = form.elements.amountPreset.value === 'custom';
    $('custom-amount-field').hidden = !custom;
    $('amountChosen').disabled = !custom;
    $('back').disabled = !$('include_campaign').checked;
    $('dedication-fields').hidden = !$('dedicated').checked;
    $('dedication-fields').disabled = !$('dedicated').checked;
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
                ...Object.fromEntries(
                    Object.keys(contract.dedication_fields).map((name) => [name, $(name).value]),
                ),
                include_campaign: $('include_campaign').checked,
                back: $('back').value,
                attribution: parseAttribution($('attribution').value),
            },
            contract,
        );
        renderPackage();
        $('create-output-title').focus();
        announce('Links created. Decoded parameters and validation results are below the form.');
    } catch (error) {
        currentPackage = null;
        $('create-output').hidden = true;
        $('download-package').disabled = true;
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
async function copy(text, field) {
    try {
        await navigator.clipboard.writeText(text);
        announce('Copied to clipboard.');
    } catch {
        field.focus();
        field.select();
        announce('Clipboard access is unavailable. The URL is selected; use your keyboard copy command.');
    }
}
function renderPackage() {
    $('create-output').hidden = false;
    $('download-package').disabled = false;
    $('package-meta').textContent =
        `${currentPackage.campaign_label || 'Untitled internal label'} · ${currentPackage.destination_label || 'No destination label'} · Contract ${currentPackage.contract_version}`;
    $('link-cards').replaceChildren();
    for (const link of currentPackage.generated_links) {
        const card = element('article', undefined, 'link-card');
        const heading = element('div', undefined, 'link-heading');
        const button = element('button', 'Copy link', 'button secondary');
        button.type = 'button';
        button.setAttribute('aria-label', `Copy ${link.label.toLowerCase()} link`);
        const field = element('textarea', undefined, 'url-preview');
        field.readOnly = true;
        field.value = link.url;
        field.rows = 2;
        field.setAttribute('aria-label', `${link.label} link URL`);
        field.spellcheck = false;
        button.addEventListener('click', () => copy(link.url, field));
        heading.append(element('h3', `${link.label} link`), button);
        card.append(heading, field);
        $('link-cards').append(card);
    }
    renderResults('create', currentPackage.parameter_summary, currentPackage.lint_results);
}
function renderResults(prefix, parameters, results) {
    const rows = $(`${prefix}-parameters`);
    rows.replaceChildren();
    $(`${prefix}-parameters-empty`).hidden = parameters.length > 0;
    $(`${prefix}-parameters-table`).hidden = parameters.length === 0;
    for (const parameter of parameters) {
        const row = element('tr');
        const name = element('th');
        name.scope = 'row';
        name.setAttribute('aria-label', parameter.name);
        name.append(element('code', parameter.name));
        const details = element('td');
        details.append(element('div', parameter.role));
        for (const status of parameter.status)
            details.append(element('span', status.replaceAll('_', ' '), 'evidence-tag'));
        details.append(element('small', parameter.evidence));
        row.append(
            element('td', `Link ${parameter.link} /${parameter.route}`),
            name,
            element('td', parameter.value),
            details,
        );
        ['Link / route', 'Parameter', 'Decoded value', 'Role & verification'].forEach((label, index) => {
            row.children[index].dataset.label = label;
        });
        rows.append(row);
    }
    const errors = results.filter((item) => item.severity === 'error').length;
    const warnings = results.filter((item) => item.severity === 'warning').length;
    $(`${prefix}-lint-summary`).textContent =
        `${errors ? 'Needs correction' : 'Static checks complete'} · ${errors} errors · ${warnings} warnings. Live behavior is unverified.`;
    const cards = $(`${prefix}-lint-results`);
    cards.replaceChildren();
    for (const result of results) {
        const card = element('article', undefined, `lint-item ${result.severity}`);
        const heading = element('div', undefined, 'lint-rule');
        heading.append(element('span', result.severity, 'severity'), element('span', result.rule_id));
        if (result.link) heading.append(element('span', `Link ${result.link}`, 'muted'));
        const details = element('details');
        details.append(
            element('summary', 'Expected & observed values'),
            element('pre', JSON.stringify({ expected: result.expected, observed: result.observed }, null, 2)),
        );
        card.append(
            heading,
            element('p', result.explanation),
            element('p', `Suggested correction: ${result.correction}`),
            details,
        );
        cards.append(card);
    }
    const firstError = cards.querySelector('.error');
    if (firstError) {
        firstError.id = `${prefix}-first-error`;
        firstError.tabIndex = -1;
    }
    return errors;
}
$('validation-status').addEventListener('click', (event) => {
    if (event.target.closest('a')) $('validate-first-error')?.focus();
});
$('lint-input').addEventListener('input', () => {
    $('validate-output').hidden = true;
    $('validation-status').classList.remove('has-errors');
    $('validate-parameters').replaceChildren();
    $('validate-lint-results').replaceChildren();
    $('validate-lint-summary').textContent = '';
    $('validation-status').textContent = 'Link changed. Validate it to see updated parameters and results.';
});
$('validator').addEventListener('submit', (event) => {
    event.preventDefault();
    $('validation-status').classList.remove('has-errors');
    const links = $('lint-input')
        .value.split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    if (links.length > 20 || $('lint-input').value.length > 50000) {
        $('validate-output').hidden = true;
        $('validation-status').textContent = 'Use at most 20 links and 50,000 characters per check.';
        return;
    }
    const errors = renderResults('validate', summarizeLinks(links, contract), lintPackage(links, contract));
    $('validate-output').hidden = false;
    const status = $('validation-status');
    if (errors) {
        status.classList.add('has-errors');
        status.textContent = `Validation found ${errors} ${errors === 1 ? 'error' : 'errors'}. `;
        const link = element('a', 'View errors');
        link.href = '#validate-first-error';
        status.append(link);
        $('lint').focus();
    } else {
        status.textContent = 'Parameters and validation results are below.';
        $('validate-output-title').focus();
    }
});
$('download-package').addEventListener('click', () => {
    if (!currentPackage) return;
    const blob = new Blob([JSON.stringify(currentPackage, null, 2) + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = element('a');
    anchor.href = url;
    anchor.download = `link-package-${currentPackage.contract_version}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce('Link package downloaded.');
});
$('generate').disabled = false;
$('lint').disabled = false;
