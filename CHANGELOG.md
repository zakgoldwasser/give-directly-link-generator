# Contract changelog

## Interface update — Attribution only

Removed campaign-selection link generation and the return-route control from the builder. The collapsible advanced section is now Attribution, with individual fields for common UTM parameters plus an optional additional key=value list. The parameter contract remains 2026-10-20.1 so pasted `choose-campaign` / `back` URLs can still be linted; the builder no longer emits them.

## Interface update — Create or Validate

Replaced the five-view workflow with two modes on one page. Both generated and manually entered links show decoded parameter tables followed by validation results inline. Removed test scenario generation, identifiers, copy/download actions, and the scenario property from package exports. The evidence register remains in a collapsed section. The parameter contract remains 2026-10-20.1 because route and parameter rules have not changed.


## 2026-10-20.1 — Expand dedication details

**What changed:** selecting dedication expands recipient name, recipient email, optional message, and sender name fields. The builder validates required details and safely encodes them into payment links, summaries, and scenario exports. Disabling dedication excludes all its details. The original dedication and campaign-selection route schemas remain unchanged. The supplied URL's paymentMethod field is recorded with unverified behavior but is not generated automatically.

**Why:** implement the user's follow-up form request and the four query parameters shown in their generated payment URL.

**Evidence and verification:** [user-reported form labels and URL propagation](docs/dedication-evidence.md), with local unit and browser verification. Required fields, email checks and size limits are local policy. No live delivery, route prefilling or server validation was verified. The original 2026-10-20 contract remains available for historical packages.


## 2026-10-20 — Initial demonstration contract

**What changed:** introduced `choose-payment`, `choose-dedication`, and `choose-campaign` route schemas; required shared frequency, amount, and campaign values; source/status metadata for all ten observed parameters; client amount boundaries and decimal truncation; exact-`true` flags; a local allowlist for return routes; unknown-parameter preservation; and cross-link consistency checks.

**Why:** implement the supplied specification as a reviewable, reproducible public work sample without manually editing query strings or hiding uncertain behavior.

**Evidence:** `spec.md.md` §§5–6 summarize client handlers, rendered links, instrumentation, and analytics. §8.1 supplies the example route contract. Original HTML/JavaScript excerpts are not present in this repository, so the source claims remain attributed to those summaries.

**Verification:** source-observed as reported by the specification; generation and linting verified against controlled local tests. No live visible effect or server behavior is verified. Route-required fields, the return-route allowlist, length limits, and route applicability are local demo policy rather than claimed server rules.

**Intentional exclusions:** the builder does not emit `amountBilled` or `focusOtherAmount` because their downstream behavior/applicability is incomplete. It does not emit analytics-only `amount` or `donationId`. It does not automatically add the special instrumentation value of `utm_source`. Unknown attribution remains in URLs and packages with warnings.
