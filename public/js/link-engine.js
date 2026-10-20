// Pure browser/Node domain module. The versioned JSON contract is its only route policy.
const owns = (object, key) => Object.hasOwn(object, key);
const issue = (rule_id, severity, expected, observed, explanation, correction, context = {}) => ({
    rule_id,
    severity,
    expected,
    observed,
    explanation,
    correction,
    ...context,
});

export class InputError extends Error {
    constructor(issues) {
        super('Please correct the highlighted inputs.');
        this.issues = issues;
    }
}

export function normalizeAmount(value, rule) {
    const raw = String(value ?? '').trim();
    if (!/^\d+(\.\d+)?$/.test(raw)) throw new Error('Enter a plain decimal amount, such as 60 or 60.25.');
    const [whole, fraction = ''] = raw.split('.');
    // Decimal strings avoid rounding across boundaries (including long fractional inputs).
    const integer = BigInt(whole);
    if (integer < BigInt(rule.minimum)) throw new Error(`Choose at least $${rule.minimum}.`);
    if (integer >= BigInt(rule.exclusive_maximum))
        throw new Error(`Choose less than $${rule.exclusive_maximum}.`);
    const decimals = fraction.slice(0, rule.decimal_places).replace(/0+$/, '');
    return integer.toString() + (decimals ? `.${decimals}` : '');
}

export function parseAttribution(text = '') {
    return text
        .split(/\r?\n/)
        .filter((line) => line.trim())
        .map((line) => {
            const separator = line.indexOf('=');
            if (separator < 1)
                throw new InputError([
                    issue(
                        'INVALID_ATTRIBUTION',
                        'error',
                        'One key=value per line',
                        line,
                        'Each attribution needs a name and value.',
                        'Use a line such as utm_campaign=year-end.',
                    ),
                ]);
            return [line.slice(0, separator).trim(), line.slice(separator + 1)];
        });
}

export function generatePackage(input, contract, now = new Date()) {
    const errors = [];
    const fail = (id, expected, observed, explanation, field) =>
        errors.push(issue(id, 'error', expected, observed, explanation, explanation, { field }));
    const campaign = String(input.campaignName ?? '').trim();
    if (!campaign || campaign.length > 120)
        fail(
            'INVALID_CAMPAIGN',
            '1–120 characters',
            campaign,
            'Enter a campaign name of 1–120 characters.',
            'campaignName',
        );
    for (const field of ['campaign_label', 'destination_label']) {
        if (String(input[field] ?? '').length > 120)
            fail(
                'INVALID_LABEL',
                'At most 120 characters',
                input[field],
                'Shorten the label to 120 characters.',
                field,
            );
    }
    if (!contract.parameters.frequency.values.includes(input.frequency))
        fail(
            'INVALID_FREQUENCY',
            contract.parameters.frequency.values,
            input.frequency,
            'Choose one-time or monthly.',
            'frequency',
        );
    let amount;
    try {
        amount = normalizeAmount(input.amountChosen, contract.parameters.amountChosen);
    } catch (error) {
        fail('INVALID_AMOUNT', '$1 to below $1,000,000', input.amountChosen, error.message, 'amountChosen');
    }
    for (const flag of ['dedicated', 'include_campaign']) {
        if (input[flag] !== undefined && typeof input[flag] !== 'boolean')
            fail('INVALID_FLAG', 'Boolean', input[flag], 'Use the checkbox to choose this option.', flag);
    }
    if (input.include_campaign && !contract.parameters.back.values.includes(input.back))
        fail(
            'INVALID_BACK',
            contract.parameters.back.values,
            input.back,
            'Select an allowlisted return route.',
            'back',
        );
    const dedication = {};
    if (input.dedicated === true) {
        for (const [name, rule] of Object.entries(contract.dedication_fields ?? {})) {
            const value = String(input[name] ?? '').trim();
            if (rule.required && !value)
                fail(
                    'REQUIRED_DEDICATION_FIELD',
                    rule.label,
                    value,
                    'Enter ' + rule.label.toLowerCase() + '.',
                    name,
                );
            if (value.length > rule.max_length)
                fail(
                    'DEDICATION_TOO_LONG',
                    rule.max_length,
                    value.length,
                    rule.label + ' must be at most ' + rule.max_length + ' characters.',
                    name,
                );
            if (value && rule.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
                fail(
                    'INVALID_EMAIL',
                    'A valid email address',
                    value,
                    'Enter a valid email address for the person you wish to honor.',
                    name,
                );
            if (value) dedication[name] = value;
        }
    }
    const extra = input.attribution ?? [];
    const names = new Set();
    for (const [name, value] of extra) {
        if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(name) || typeof value !== 'string' || value.length > 500) {
            fail(
                'INVALID_ATTRIBUTION',
                'Simple name; text value up to 500 characters',
                name,
                'Use letters, digits and underscores in names, and values of at most 500 characters.',
                'attribution',
            );
        }
        // utm_source is the only observed parameter offered as attribution; its behavior remains unknown.
        if (owns(contract.parameters, name) && name !== 'utm_source')
            fail(
                'RESERVED_PARAMETER',
                'An attribution name',
                name,
                'Donation parameters must be set with the donation controls.',
                'attribution',
            );
        if (names.has(name))
            fail(
                'DUPLICATE_PARAMETER',
                'One value per name',
                name,
                'Remove the duplicate attribution name.',
                'attribution',
            );
        names.add(name);
    }
    if (extra.length > 20)
        fail(
            'TOO_MANY_PARAMETERS',
            'At most 20 attribution entries',
            extra.length,
            'Use at most 20 attribution entries.',
            'attribution',
        );
    if (errors.length) throw new InputError(errors);

    const values = { frequency: input.frequency, amountChosen: amount, campaignName: campaign };
    if (input.dedicated) Object.assign(values, { dedicated: 'true' }, dedication);
    if (input.include_campaign) values.back = input.back;
    const selected = ['choose-payment'];
    if (input.dedicated) selected.push('choose-dedication');
    if (input.include_campaign) selected.push('choose-campaign');
    const generated_links = selected.map((route) => {
        const schema = contract.routes[route];
        const url = new URL(`/${route}`, contract.origin);
        const params = new URLSearchParams();
        for (const name of [...schema.required, ...schema.optional]) {
            if (owns(values, name)) params.set(name, values[name]);
        }
        for (const [name, value] of extra) params.append(name, value);
        url.search = params.toString();
        return { route, label: schema.label, url: url.href };
    });
    const lint_results = lintPackage(generated_links, contract);
    const parameter_summary = generated_links.flatMap((link) =>
        [...new URL(link.url).searchParams].map(([name, value]) => ({
            route: link.route,
            name,
            value,
            role: owns(contract.parameters, name)
                ? contract.parameters[name].role
                : 'Unrecognized attribution; effect unverified',
            status: owns(contract.parameters, name) ? contract.parameters[name].status : ['unknown'],
            evidence: owns(contract.parameters, name)
                ? contract.parameters[name].evidence
                : 'No evidence in the current contract',
        })),
    );
    const expected = Object.fromEntries(new URL(generated_links[0].url).searchParams);
    // Stable content hash disambiguates campaign slugs and produces reproducible scenario identifiers.
    let hash = 2166136261;
    for (const char of JSON.stringify(generated_links))
        hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
    const slug =
        campaign
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 50) || 'campaign';
    return {
        contract_version: contract.contract_version,
        campaign_label: String(input.campaign_label ?? '').trim(),
        destination_label: String(input.destination_label ?? '').trim(),
        generated_links,
        parameter_summary,
        lint_results,
        test_scenario: {
            scenario_id: `${slug}-${input.frequency}-${amount}-${hash.toString(16)}`,
            contract_version: contract.contract_version,
            target_route: '/choose-payment',
            expected,
            links: generated_links.map((link) => ({
                target_route: `/${link.route}`,
                url: link.url,
                expected: Object.fromEntries(new URL(link.url).searchParams),
            })),
            checks: [
                'Confirm decoded parameters match expected values.',
                'Manually inspect the intended donation amount, frequency and campaign before proceeding.',
                'Check shared parameters during navigation.',
            ],
            stop_before_payment: true,
            live_behavior_verified: false,
        },
        generated_at: now.toISOString(),
    };
}

export function lintPackage(links, contract) {
    const results = [];
    const parsed = [];
    for (const [index, link] of links.entries()) {
        const raw = typeof link === 'string' ? link : link.url;
        const add = (id, severity, expected, observed, explanation, correction) =>
            results.push(
                issue(id, severity, expected, observed, explanation, correction, { link: index + 1 }),
            );
        let url;
        try {
            url = new URL(raw);
        } catch {
            add(
                'INVALID_URL',
                'error',
                'An absolute HTTPS URL',
                raw,
                'This is not a valid absolute URL.',
                'Paste the complete generated URL.',
            );
            continue;
        }
        if (url.origin !== contract.origin || url.username || url.password || url.hash) {
            add(
                'INVALID_DESTINATION',
                'error',
                contract.origin + ' with no credentials or fragment',
                raw,
                'The destination is outside the demo contract.',
                'Use the approved HTTPS origin and remove credentials or fragments.',
            );
        }
        if (/\s/.test(raw) || /[\u0000-\u001f\u007f]/.test(raw))
            add(
                'INVALID_ENCODING',
                'error',
                'URL-encoded text',
                raw,
                'The URL contains unescaped whitespace or control characters.',
                'Generate the URL again to encode text safely.',
            );
        const route = url.pathname.slice(1);
        if (!owns(contract.routes, route)) {
            add(
                'UNKNOWN_ROUTE',
                'error',
                Object.keys(contract.routes),
                url.pathname,
                'This route is not in the current contract.',
                'Choose an approved route.',
            );
            continue;
        }
        if (typeof link !== 'string' && link.route !== route)
            add(
                'ROUTE_MISMATCH',
                'error',
                link.route,
                route,
                'The package route label differs from its URL.',
                'Regenerate the package.',
            );
        const schema = contract.routes[route];
        const allowed = [...schema.required, ...schema.optional];
        const params = url.searchParams;
        parsed.push({ params, index, route });
        for (const piece of url.search.slice(1).split('&')) {
            try {
                decodeURIComponent(piece.replace(/\+/g, ' '));
            } catch {
                add(
                    'INVALID_ENCODING',
                    'error',
                    'Valid percent-encoded UTF-8',
                    piece,
                    'A query component has malformed encoding.',
                    'Generate the URL again instead of editing escape sequences.',
                );
            }
        }
        for (const name of schema.required) {
            if (!params.has(name) || !params.get(name).trim())
                add(
                    'MISSING_PARAMETER',
                    'error',
                    `${name} is required by /${route}`,
                    params.get(name),
                    `The ${name} parameter is missing or empty.`,
                    `Add ${name} by regenerating the link.`,
                );
        }
        for (const name of new Set(params.keys())) {
            const values = params.getAll(name);
            const value = values[0];
            if (values.length > 1)
                add(
                    'DUPLICATE_PARAMETER',
                    'error',
                    'One value per parameter',
                    { name, values },
                    `${name} appears more than once.`,
                    'Keep exactly one value.',
                );
            if (!owns(contract.parameters, name)) {
                add(
                    'UNKNOWN_PARAMETER',
                    'warning',
                    'A parameter in the current verified contract',
                    { name, value },
                    `${name} is not part of the current verified contract. It is preserved in the preview but its effect is unverified.`,
                    'Confirm its behavior independently or remove it.',
                );
                continue;
            }
            const rule = contract.parameters[name];
            if (owns(contract.dedication_fields ?? {}, name)) {
                if (params.get('dedicated') !== 'true')
                    add(
                        'DEDICATION_NOT_ENABLED',
                        'error',
                        'dedicated=true',
                        params.get('dedicated'),
                        'Dedication details require the dedication flag.',
                        'Enable dedication or remove its details.',
                    );
                if (value.length > rule.max_length)
                    add(
                        'DEDICATION_TOO_LONG',
                        'error',
                        rule.max_length,
                        value.length,
                        name + ' exceeds the local length limit.',
                        'Shorten the field in the builder.',
                    );
                if (rule.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
                    add(
                        'INVALID_EMAIL',
                        'error',
                        'A valid email address',
                        value,
                        'The dedication recipient email is malformed.',
                        'Correct the recipient email in the builder.',
                    );
            }
            if (!allowed.includes(name)) {
                const severity = name === 'utm_source' ? 'warning' : 'error';
                add(
                    'PARAMETER_NOT_ALLOWED',
                    severity,
                    allowed,
                    name,
                    `${name} has no established input role on /${route} in this contract.`,
                    rule.type === 'analytics'
                        ? 'Remove this post-flow analytics parameter.'
                        : 'Remove it or document evidence before updating the route contract.',
                );
            }
            if ((rule.type === 'enum' || rule.type === 'route') && !rule.values.includes(value))
                add(
                    name === 'back' ? 'INVALID_BACK' : 'INVALID_FREQUENCY',
                    'error',
                    rule.values,
                    value,
                    `${name} is outside the allowed values.`,
                    'Select a value from the builder.',
                );
            if (rule.type === 'true_flag' && value !== 'true')
                add(
                    'INVALID_FLAG',
                    'error',
                    'Absent or exactly true',
                    { name, value },
                    `${name} must be absent or true.`,
                    'Remove the flag or set it to true.',
                );
            if (rule.type === 'amount') {
                try {
                    const normalized = normalizeAmount(value, rule);
                    if (normalized !== value)
                        add(
                            'AMOUNT_NORMALIZATION',
                            'warning',
                            normalized,
                            value,
                            'The observed client normalizes amounts and truncates decimals beyond two places.',
                            `Use ${normalized}.`,
                        );
                } catch (error) {
                    add(
                        'INVALID_AMOUNT',
                        'error',
                        '$1 to below $1,000,000',
                        value,
                        error.message,
                        'Choose an amount within the observed client boundaries.',
                    );
                }
            }
            if (rule.status.includes('unknown'))
                add(
                    'UNVERIFIED_BEHAVIOR',
                    'warning',
                    'Independently verified behavior',
                    { name, value },
                    rule.role,
                    'Treat the effect as unverified.',
                );
        }
    }
    if (parsed.length > 1) {
        for (const name of contract.shared_parameters) {
            const observed = parsed.map(({ params, index, route }) => ({
                link: index + 1,
                route,
                value: params.get(name),
            }));
            if (new Set(observed.map((item) => item.value)).size > 1)
                results.push(
                    issue(
                        'CROSS_LINK_MISMATCH',
                        'error',
                        `The same ${name} on every link`,
                        observed,
                        `${name} differs between links or is missing from one.`,
                        'Regenerate the links together from the same campaign settings.',
                    ),
                );
        }
    }
    if (!links.length)
        results.push(
            issue(
                'EMPTY_PACKAGE',
                'error',
                'At least one link',
                0,
                'No links were supplied.',
                'Generate or paste at least one link.',
            ),
        );
    results.push(
        issue(
            'VERIFICATION_LIMIT',
            'informational',
            'Static contract validation only',
            contract.contract_version,
            'Static checks cannot establish live visible effects or server acceptance.',
            'Use the scenario for a manual review; stop before submitting payment.',
        ),
    );
    return results;
}

export function brokenFixture(pkg) {
    const links = pkg.generated_links.map((link) => ({ ...link }));
    if (links.length === 1) links.push({ ...links[0] });
    const url = new URL(links[1].url);
    url.searchParams.delete('campaignName');
    links[1].url = url.href;
    return links;
}
