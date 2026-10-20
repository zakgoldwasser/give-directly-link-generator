# Contract changelog

## 2026-10-20 — Initial demonstration contract

**What changed:** introduced `choose-payment`, `choose-dedication`, and `choose-campaign` route schemas; required shared frequency, amount, and campaign values; source/status metadata for all ten observed parameters; client amount boundaries and decimal truncation; exact-`true` flags; a local allowlist for return routes; unknown-parameter preservation; and cross-link consistency checks.

**Why:** implement the supplied specification as a reviewable, reproducible public work sample without manually editing query strings or hiding uncertain behavior.

**Evidence:** `spec.md.md` §§5–6 summarize client handlers, rendered links, instrumentation, and analytics. §8.1 supplies the example route contract. Original HTML/JavaScript excerpts are not present in this repository, so the source claims remain attributed to those summaries.

**Verification:** source-observed as reported by the specification; generation and linting verified against controlled local tests. No live visible effect or server behavior is verified. Route-required fields, the return-route allowlist, length limits, and route applicability are local demo policy rather than claimed server rules.

**Intentional exclusions:** the builder does not emit `amountBilled` or `focusOtherAmount` because their downstream behavior/applicability is incomplete. It does not emit analytics-only `amount` or `donationId`. It does not automatically add the special instrumentation value of `utm_source`. Unknown attribution remains in URLs and packages with warnings.
