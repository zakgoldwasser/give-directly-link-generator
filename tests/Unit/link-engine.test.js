import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    generatePackage,
    lintPackage,
    normalizeAmount,
    parseAttribution,
    brokenFixture,
    InputError,
} from '../../public/js/link-engine.js';
const contract = JSON.parse(
    readFileSync(new URL('../../resources/contracts/2026-10-20.1.json', import.meta.url)),
);
const base = {
    campaignName: 'Example Year-End Campaign',
    campaign_label: 'Year end',
    destination_label: 'Example program',
    frequency: 'monthly',
    amountChosen: '60',
    dedicated: true,
    dedicateToName: 'Example Honoree',
    dedicateToEmail: 'honoree@example.com',
    dedicateFromName: 'Example Sender',
};
const build = (changes = {}) =>
    generatePackage({ ...base, ...changes }, contract, new Date('2026-10-20T12:00:00Z'));
const errors = (results) => results.filter((item) => item.severity === 'error');
const codes = (results) => results.map((item) => item.rule_id);
const url = (query) => `${contract.origin}/choose-payment?${query}`;

test('loads a versioned contract with evidence and no live verification claims', () => {
    assert.equal(contract.contract_version, '2026-10-20.1');
    for (const parameter of Object.values(contract.parameters)) {
        assert.ok(parameter.evidence);
        assert.ok(parameter.status.every((status) => contract.statuses.includes(status)));
        assert.ok(!parameter.status.includes('server_behavior_verified'));
        assert.ok(!parameter.status.includes('visible_effect_verified'));
    }
});
test('monthly $60 generates consistent payment and dedication links', () => {
    const pkg = build();
    assert.deepEqual(
        pkg.generated_links.map((link) => link.route),
        ['choose-payment', 'choose-dedication'],
    );
    assert.equal(errors(pkg.lint_results).length, 0);
    assert.equal(pkg.contract_version, contract.contract_version);
    assert.equal(pkg.test_scenario.stop_before_payment, true);
    assert.equal(pkg.test_scenario.live_behavior_verified, false);
    assert.equal(pkg.test_scenario.links.length, 2);
    assert.equal(pkg.generated_at, '2026-10-20T12:00:00.000Z');
});
test('one-time $100 without dedication emits no dedication flag or link', () => {
    const pkg = build({ frequency: 'once', amountChosen: '100', dedicated: false });
    assert.equal(pkg.generated_links.length, 1);
    assert.equal(new URL(pkg.generated_links[0].url).searchParams.has('dedicated'), false);
});
test('campaign encoding preserves ampersands, Unicode, plus, equals, percent and markup', () => {
    const name = 'Kenya & café + 50% = <example> 🌱';
    const pkg = build({ campaignName: name });
    assert.equal(new URL(pkg.generated_links[0].url).searchParams.get('campaignName'), name);
    assert.equal(pkg.test_scenario.expected.campaignName, name);
    assert.ok(pkg.generated_links[0].url.includes('%26'));
    assert.ok(pkg.parameter_summary.some((item) => item.name === 'campaignName' && item.value === name));
});
for (const value of [
    '0',
    '0.99',
    '1000000',
    '1000000.01',
    '-1',
    '1e3',
    'NaN',
    'Infinity',
    '',
    '1,000',
    '2foo',
]) {
    test(`rejects invalid amount ${JSON.stringify(value)} before generation`, () =>
        assert.throws(() => build({ amountChosen: value }), InputError));
}
for (const [input, expected] of [
    ['1', '1'],
    ['999999.99999999999999999', '999999.99'],
    ['60.999', '60.99'],
    ['1.009', '1'],
    ['00060.100', '60.1'],
]) {
    test(`normalizes ${input} to ${expected} without rounding`, () => {
        assert.equal(normalizeAmount(input, contract.parameters.amountChosen), expected);
        assert.equal(build({ amountChosen: input }).test_scenario.expected.amountChosen, expected);
    });
}
test('rejects invalid frequency, campaign, flag and return route', () => {
    for (const changes of [
        { frequency: 'weekly' },
        { campaignName: '  ' },
        { campaignName: 'x'.repeat(121) },
        { dedicated: 'false' },
        { include_campaign: true, back: 'https://evil.example' },
    ])
        assert.throws(() => build(changes), InputError);
});
test('campaign selection includes only route-specific values', () => {
    const pkg = build({ include_campaign: true, back: 'choose-dedication' });
    const params = new URL(pkg.generated_links[2].url).searchParams;
    assert.equal(params.get('back'), 'choose-dedication');
    assert.equal(params.has('dedicated'), false);
    assert.equal(new URL(pkg.generated_links[0].url).searchParams.has('back'), false);
    assert.equal(errors(pkg.lint_results).length, 0);
});
test('preserves unknown attribution and warns on every affected route', () => {
    const pkg = build({
        attribution: parseAttribution('utm_campaign=summer & fall=2026\nutm_medium=hello+world'),
    });
    assert.equal(new URL(pkg.generated_links[0].url).searchParams.get('utm_campaign'), 'summer & fall=2026');
    assert.equal(pkg.lint_results.filter((item) => item.rule_id === 'UNKNOWN_PARAMETER').length, 4);
    assert.ok(
        pkg.parameter_summary.some((item) => item.name === 'utm_campaign' && item.status[0] === 'unknown'),
    );
    assert.equal(errors(pkg.lint_results).length, 0);
});
test('attribution cannot override donation fields or hide duplicate values', () => {
    for (const text of [
        'frequency=weekly',
        'back=evil',
        'donationId=123',
        'utm_campaign=a\nutm_campaign=b',
        'bad line',
    ]) {
        assert.throws(() => build({ attribution: parseAttribution(text) }), InputError);
    }
});
test('unknown object property names remain unknown rather than prototype lookups', () => {
    const result = lintPackage(
        [url('frequency=monthly&amountChosen=60&campaignName=Example&constructor=x&__proto__=y')],
        contract,
    );
    assert.equal(result.filter((item) => item.rule_id === 'UNKNOWN_PARAMETER').length, 2);
});
test('detects duplicates even when names are encoded', () => {
    assert.ok(
        codes(
            lintPackage(
                [url('frequency=monthly&amountChosen=60&%61mountChosen=100&campaignName=Example')],
                contract,
            ),
        ).includes('DUPLICATE_PARAMETER'),
    );
});
test('detects missing campaign and invalid frequency in pasted URLs', () => {
    const result = lintPackage([url('frequency=weekly&amountChosen=60')], contract);
    assert.ok(codes(result).includes('MISSING_PARAMETER'));
    assert.ok(codes(result).includes('INVALID_FREQUENCY'));
});
test('detects invalid boolean flags and route-specific parameters', () => {
    const result = lintPackage(
        [
            url(
                'frequency=monthly&amountChosen=60&campaignName=Example&dedicated=false&focusOtherAmount=true&amount=60&donationId=1&back=evil',
            ),
        ],
        contract,
    );
    assert.ok(codes(result).includes('INVALID_FLAG'));
    assert.ok(codes(result).includes('PARAMETER_NOT_ALLOWED'));
    assert.ok(codes(result).includes('INVALID_BACK'));
});
test('amountBilled and utm_source are explicitly unverified', () => {
    const result = lintPackage(
        [
            url(
                'frequency=monthly&amountChosen=60&campaignName=Example&amountBilled=61&utm_source=automated_browser_test',
            ),
        ],
        contract,
    );
    assert.equal(result.filter((item) => item.rule_id === 'UNVERIFIED_BEHAVIOR').length, 2);
});
for (const bad of ['%ZZ', '%E0%A4%A', '%FF', 'bad value']) {
    test(`detects malformed encoding ${bad}`, () =>
        assert.ok(
            codes(
                lintPackage([url(`frequency=monthly&amountChosen=60&campaignName=${bad}`)], contract),
            ).includes('INVALID_ENCODING'),
        ));
}
test('rejects external origins, credentials, fragments, unknown routes and invalid URLs', () => {
    for (const value of [
        'https://evil.example/choose-payment',
        'https://user@donate.givedirectly.org/choose-payment',
        `${url('x=1')}#fragment`,
        `${contract.origin}/unknown`,
        'not a URL',
        'javascript:alert(1)',
    ])
        assert.ok(errors(lintPackage([value], contract)).length);
});
for (const name of contract.shared_parameters) {
    test(`flags inconsistent ${name}`, () => {
        const links = build().generated_links;
        const changed = new URL(links[1].url);
        changed.searchParams.set(
            name,
            name === 'frequency' ? 'once' : name === 'amountChosen' ? '100' : 'Other',
        );
        links[1].url = changed.href;
        assert.ok(codes(lintPackage(links, contract)).includes('CROSS_LINK_MISMATCH'));
    });
}
test('broken fixture is detected without mutating the original package', () => {
    for (const dedicated of [true, false]) {
        const pkg = build({ dedicated });
        const before = JSON.stringify(pkg);
        const result = lintPackage(brokenFixture(pkg), contract);
        assert.ok(codes(result).includes('MISSING_PARAMETER'));
        assert.ok(codes(result).includes('CROSS_LINK_MISMATCH'));
        assert.equal(JSON.stringify(pkg), before);
    }
});
test('scenario is reproducible and changes with link content', () => {
    assert.equal(build().test_scenario.scenario_id, build().test_scenario.scenario_id);
    assert.notEqual(build().test_scenario.scenario_id, build({ dedicated: false }).test_scenario.scenario_id);
});
test('every lint result includes the complete review contract', () => {
    const results = lintPackage(
        [url('frequency=weekly&amountChosen=0.5&campaignName=X&utm_campaign=x')],
        contract,
    );
    for (const result of results)
        for (const key of ['rule_id', 'severity', 'expected', 'observed', 'explanation', 'correction'])
            assert.ok(Object.hasOwn(result, key));
    assert.ok(codes(lintPackage([], contract)).includes('EMPTY_PACKAGE'));
});

test('saved broken package fixture exposes a missing campaign and cross-link mismatch', () => {
    const fixture = JSON.parse(readFileSync(new URL('../fixtures/broken-package.json', import.meta.url)));
    const fixtureContract = JSON.parse(
        readFileSync(new URL(`../../resources/contracts/${fixture.contract_version}.json`, import.meta.url)),
    );
    assert.equal(fixtureContract.contract_version, '2026-10-20');
    const result = lintPackage(fixture.generated_links, fixtureContract);
    assert.ok(codes(result).includes('MISSING_PARAMETER'));
    assert.ok(codes(result).includes('CROSS_LINK_MISMATCH'));
});

test('dedication details are encoded only on the payment route and included in exports', () => {
    const details = {
        dedicateToName: 'Example & café',
        dedicateToEmail: 'example+honoree@example.com',
        dedicateFromName: 'Example + Sender',
        dedicateToMessage: 'Thank you & welcome!\n<example> 🌱',
    };
    const pkg = build({ ...details, include_campaign: true, back: 'choose-payment' });
    const payment = new URL(pkg.generated_links[0].url);
    for (const [name, value] of Object.entries(details)) {
        assert.equal(payment.searchParams.get(name), value);
        assert.equal(pkg.test_scenario.expected[name], value);
        assert.ok(pkg.parameter_summary.some((item) => item.name === name && item.value === value));
        for (const link of pkg.generated_links.slice(1))
            assert.equal(new URL(link.url).searchParams.has(name), false);
    }
    assert.equal(errors(pkg.lint_results).length, 0);
    assert.equal(payment.searchParams.has('paymentMethod'), false);
    assert.equal(payment.searchParams.has('amountBilled'), false);
});
test('dedication message is optional and disabled dedication excludes every detail', () => {
    assert.equal(new URL(build().generated_links[0].url).searchParams.has('dedicateToMessage'), false);
    const pkg = build({ dedicated: false, dedicateToEmail: 'invalid', dedicateToMessage: 'Hidden message' });
    const params = new URL(pkg.generated_links[0].url).searchParams;
    for (const name of Object.keys(contract.dedication_fields)) assert.equal(params.has(name), false);
    assert.ok(!JSON.stringify(pkg).includes('Hidden message'));
});
test('dedication requires names and a valid recipient email, and enforces local length limits', () => {
    for (const changes of [
        { dedicateToName: ' ' },
        { dedicateFromName: '' },
        { dedicateToEmail: '' },
        { dedicateToEmail: 'bad-address' },
        { dedicateToName: 'x'.repeat(121) },
        { dedicateToMessage: 'x'.repeat(2001) },
    ])
        assert.throws(() => build(changes), InputError);
    assert.throws(() => build({ attribution: [['dedicateToName', 'Override']] }), InputError);
});
test('linter detects malformed or disabled dedication details in pasted URLs', () => {
    const result = lintPackage(
        [url('frequency=monthly&amountChosen=60&campaignName=Example&dedicateToEmail=bad')],
        contract,
    );
    assert.ok(codes(result).includes('INVALID_EMAIL'));
    assert.ok(codes(result).includes('DEDICATION_NOT_ENABLED'));
});
