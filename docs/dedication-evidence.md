# Dedication evidence — 2026-10-20

The user reported these labels on the destination dedication form and supplied an example generated `/choose-payment` URL:

| Form label | Query parameter |
| --- | --- |
| Name of the person you wish to honor | `dedicateToName` |
| Email of the person you wish to honor | `dedicateToEmail` |
| Message (optional) | `dedicateToMessage` |
| Your name as it should appear to the person | `dedicateFromName` |

The example also contained `dedicated=true`, `paymentMethod=card`, and `amountBilled=60` alongside the campaign, amount and frequency. This is user-reported URL propagation, not independently inspected source code or verified server behavior. No live URL was fetched or submitted to implement this change.

Contract `2026-10-20.1` allows the four dedication fields on `choose-payment`. The builder includes them only when dedication is enabled. Recipient name, email and sender name are required locally; message is optional. Names are limited to 120 characters, email to 254, and message to 2,000. Basic email syntax validation and these limits are local usability rules, not established destination-server validation.

The builder does not presume these values prefill `choose-dedication` or survive `choose-campaign`. Those links retain their prior route allowlists. `paymentMethod` is recorded as observed in the supplied URL with unverified behavior, but the builder does not select a payment method or calculate `amountBilled` automatically.

Dedication values remain in browser memory and appear in payment URLs, copied content, and downloaded packages. They are not posted to this application's server or persisted. Use fictional names and example.com addresses for the public demo. The follow-up user request explicitly adds these dedication fields to the original spec's scope.
