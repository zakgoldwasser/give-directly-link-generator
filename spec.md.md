# Fundraising Link Operations Tool

## 1. Purpose

Fundraisers often need links that open a donation flow with a campaign, amount, and frequency already selected. Manually editing those links can produce invalid combinations or silently lose important values during navigation.

This project is a public, independent work sample that generates, explains, validates, and tests donation campaign links using a versioned route-and-parameter contract.

It is not a scraper, payment processor, or claim about GiveDirectly's private systems.

## 2. Product statement

> Create a campaign donation link, understand exactly what it carries through the donation flow, and receive a test scenario before sharing it with donors.

## 3. Goals

- Make donation links easy to create without hand-editing query strings.
- Prevent invalid amounts, unsupported frequencies, and incomplete campaign links.
- Show users exactly which parameters are being sent to each route.
- Generate a reproducible test scenario for every link.
- Make uncertainty visible when a parameter has been observed in source but not behaviorally verified.
- Produce a polished public demo using synthetic campaign names and approved example routes.

## 4. Non-goals

- Scraping GiveDirectly's site.
- Circumventing CAPTCHA, rate limits, or access controls.
- Submitting real payment forms.
- Collecting donor names, emails, payment information, or other personal data.
- Claiming that a generated link is production-approved by GiveDirectly.
- Automatically publishing or distributing campaign links.
- Proving that GiveDirectly currently needs this tool.

## 5. Evidence-based parameter contract

The initial contract is based on supplied HTML and JavaScript from the donation flow. Each entry must include its evidence source and verification status.

### Observed parameters

| Parameter | Known role | Initial status |
|---|---|---|
| `frequency` | Donation frequency; visible values include `once` and `monthly`. | Observed and written by client code |
| `amountChosen` | Selected preset or custom donation amount. | Observed and written by client code |
| `amountBilled` | Cleared when amount changes; downstream behavior not established. | Observed, behavior incomplete |
| `dedicated` | Set to `true` when dedication is selected and removed when unselected. | Observed and written by client code |
| `focusOtherAmount` | If exactly `true`, opens the custom amount input on page load. | Observed and written/read by client code |
| `campaignName` | Carried in server-rendered links to later routes. | Propagation observed; server validation unknown |
| `back` | Used in the campaign-selection link to identify the return route. | Propagation observed; server behavior unknown |
| `utm_source` | `automated_browser_test` suppresses browser-error log submission. | Observed in page instrumentation |
| `amount` | Read by conversion analytics after donation events. | Post-flow analytics use only |
| `donationId` | Read as a conversion transaction ID after donation events. | Post-flow analytics use only |

The application must not label a parameter “supported” merely because it appears in a URL. The contract distinguishes:

- `observed_in_source`
- `written_by_client`
- `propagated_to_route`
- `visible_effect_verified`
- `server_behavior_verified`
- `analytics_only`
- `unknown`

## 6. Known validation rules

The initial builder must enforce the client-side rules visible in the supplied amount module:

- `frequency` is `once` or `monthly`.
- Custom amount must be at least `$1`.
- Custom amount below `$1,000,000` is required.
- Custom amounts are truncated to two decimal places by the observed client logic.
- `dedicated` is either absent or `true`.
- `focusOtherAmount` is either absent or `true`.
- `campaignName` must be URL-encoded safely.
- `back` must be selected from an allowlisted route name.

The interface must distinguish a confirmed rule from an assumed server-side rule.

## 7. User workflow

### Step 1: Choose a campaign

The user enters or selects:

- Campaign name
- Internal campaign label
- Destination program label
- Optional attribution values

Campaign names are synthetic by default in the public demo.

### Step 2: Choose donation behavior

The user selects:

- One-time or monthly
- Preset amount or custom amount
- Optional dedication flow

The interface displays the applicable validation rules before generating a link.

### Step 3: Review the link package

The application generates a package containing:

- Payment link
- Dedication link, when selected
- Campaign-selection link, when relevant
- Human-readable parameter summary
- Contract version
- Verification status for every parameter

Example:

```text
Payment link
https://donate.givedirectly.org/choose-payment?
frequency=monthly&amountChosen=60&campaignName=Example%20Campaign
```

### Step 4: Run static validation

The linter checks:

- Required parameters
- Allowed values
- Amount boundaries
- Encoding
- Duplicate parameters
- Unsupported parameters
- Route-specific parameter rules
- Inconsistent values between generated links

### Step 5: Generate a test scenario

The user downloads or copies a scenario describing what should be tested:

```json
{
  "scenario_id": "campaign-example-monthly-60",
  "target_route": "/choose-payment",
  "expected": {
    "frequency": "monthly",
    "amountChosen": "60",
    "campaignName": "Example Campaign"
  },
  "stop_before_payment": true
}
```

The scenario can later be consumed by a Playwright runner, but the link builder itself does not need to scrape or test the live site.

## 8. Core features

### 8.1 Schema-driven generation

All link generation must use a versioned contract rather than scattered string concatenation.

```json
{
  "contract_version": "2026-10-20",
  "routes": {
    "choose-payment": {
      "required": ["frequency", "amountChosen", "campaignName"],
      "optional": ["amountBilled", "dedicated"]
    },
    "choose-dedication": {
      "required": ["frequency", "amountChosen", "campaignName"],
      "optional": ["dedicated"]
    },
    "choose-campaign": {
      "required": ["frequency", "amountChosen", "campaignName"],
      "optional": ["back"]
    }
  }
}
```

### 8.2 URL-safe encoding

Use the platform URL API and `URLSearchParams`. Never concatenate unescaped campaign names or attribution values.

The preview must show both:

- The copyable URL.
- A decoded parameter table.

### 8.3 Link linting

Each lint result contains:

- Rule ID
- Severity: error, warning, or informational
- Expected value or rule
- Observed value
- Plain-language explanation
- Suggested correction

Example:

```text
ERROR AMOUNT_BELOW_MINIMUM
amountChosen=0.50 is below the observed minimum of $1.00.
Choose an amount of at least $1.00.
```

### 8.4 Cross-link consistency

When a package includes payment and dedication links, the application compares their shared parameters. It must flag differences in:

- Frequency
- Amount
- Campaign name

### 8.5 Unknown-parameter warnings

An unrecognized parameter must not be silently discarded. The linter should say:

```text
WARNING UNKNOWN_PARAMETER
The parameter `utm_campaign` is not part of the current verified contract.
It will be preserved in the preview but its effect is unverified.
```

### 8.6 Contract history

The public demo should show the contract version used to generate a link. Contract changes must be recorded in a changelog explaining:

- What changed
- Why it changed
- Whether the change is source-observed or behavior-verified

## 9. Interface

The public demo should have five compact views:

1. **Create link** — select campaign, frequency, amount, and optional dedication.
2. **Review parameters** — inspect decoded values and verification status.
3. **Validation results** — see errors, warnings, and corrections.
4. **Test scenario** — view and download the generated test case.
5. **Evidence and assumptions** — see which rules came from supplied source and which remain unverified.

The interface must be keyboard accessible, mobile usable, and understandable without technical knowledge.

## 10. Architecture

### Version 1 recommendation

Use a Laravel application with Blade and plain JavaScript. Store the contract as version-controlled JSON or PHP configuration.

No database or object storage is required for the public demo.

The application can generate links entirely within a request and return the result immediately. Generated link packages may be downloaded as JSON or CSV.

### Optional backend features

A backend can later add:

- Saved campaign templates
- Shareable link-package IDs
- Version history
- Team permissions
- Approval workflow

These features must not be added to the first release unless the core generator and linter are already polished.

## 11. Data model

The first version needs only in-memory request data:

```text
LinkPackage
  contract_version
  campaign_label
  generated_links[]
  parameter_summary[]
  lint_results[]
  test_scenario
  generated_at
```

No donor data may be stored.

## 12. Security and privacy

- Treat campaign names and attribution values as untrusted text.
- Encode all query parameters.
- Do not accept payment details.
- Do not submit generated links automatically.
- Do not scrape arbitrary URLs.
- Do not bypass CAPTCHA or rate limits.
- Do not include personal data in example links.
- Clearly label synthetic campaigns.
- Avoid logging full URLs if they could contain sensitive values.

## 13. Testing

### Unit tests

- URL encoding
- Amount boundaries
- Decimal truncation behavior
- Frequency validation
- Dedication flag handling
- Unknown-parameter detection
- Duplicate-parameter detection
- Cross-link consistency
- Contract-version loading

### Example test cases

| Case | Expected result |
|---|---|
| Monthly, `$60`, valid campaign | Valid payment and dedication links |
| One-time, `$100`, valid campaign | Valid payment link |
| `$0.99` custom amount | Error |
| `$1,000,000` custom amount | Error |
| `frequency=weekly` | Error |
| Missing `campaignName` | Warning or error according to route contract |
| Duplicate `amountChosen` | Error |
| Unrecognized `utm_campaign` | Warning; preserve and mark unverified |
| Payment and dedication links disagree on frequency | Error |
| Campaign name contains `&` or Unicode | Correctly encoded URL |

### Demonstration test

The demo must include a deliberately broken contract fixture. For example, it should remove `campaignName` from one generated link and show the linter catching the inconsistency.

## 14. Acceptance criteria

The project is complete when:

1. A user can generate a valid payment link without manually editing a query string.
2. The interface displays a decoded parameter summary.
3. Invalid frequency and amount values are rejected before link generation.
4. Campaign names and special characters are encoded correctly.
5. Payment and dedication links are checked for shared-value consistency.
6. Unknown parameters produce visible warnings.
7. Every generated package includes a contract version and test scenario.
8. The test scenario explicitly stops before payment submission.
9. A deliberately broken fixture is detected by the linter.
10. The demo uses synthetic data and does not require donor information.
11. The application works without a database or object storage.
12. The README distinguishes source-observed rules from behavior-verified rules.

## 15. Demo narrative

The recommended three-minute demonstration is:

1. Choose a synthetic year-end campaign.
2. Select monthly, `$60`, and dedication enabled.
3. Generate the payment and dedication links.
4. Show the decoded parameters and the contract version.
5. Display the generated Playwright scenario.
6. Introduce a broken campaign link.
7. Show the linter identifying the missing or inconsistent parameter.
8. Explain that the tool creates a safer handoff between fundraising and engineering; it does not claim to know GiveDirectly's private workflow.

## 16. Known limitations

The tool cannot prove that GiveDirectly's server accepts every parameter or that its internal campaign process needs this interface. CAPTCHA and anti-bot behavior make live automated validation unreliable and outside the scope of this project.

The project's evidence is therefore limited to supplied source code, generated-link behavior in controlled fixtures, and clearly labeled assumptions. Its strongest claim is that it provides a disciplined way to generate and reason about fundraising links without hand-editing URLs or hiding uncertainty.
