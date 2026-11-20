# Lootably Conversion Webhook

## Endpoint

Configure Lootably's `approved`, `pending`, and `rejected` Conversion Webhook events to:

```text
https://taskmint.itskode.com/api/offerwalls/webhook/lootably
```

Use the development/staging host while testing. Remove the old GET callback URL from the Lootably placement: `/api/offerwalls/postback/lootably` remains fail-closed because Lootably's documented GET hash does not authenticate the transaction ID or status.

## Backend environment

Set these on the backend process without pasting the secret into chat or source control:

```text
LOOTABLY_WEBHOOK_SECRET=<placement webhook secret>
LOOTABLY_PLACEMENT_ID=<placement ID>
LOOTABLY_WEBHOOK_ALLOWED_IPS=<comma-separated exact Lootably egress IPs>
LOOTABLY_CURRENCY_REWARD_IS_COINS=true
OFFERWALL_ADAPTER_LOOTABLY_ENABLED=true
```

Get the current egress IP list from Lootably support. Never use `*` or a guessed IP range. `LOOTABLY_CURRENCY_REWARD_IS_COINS=true` confirms the placement's `currencyReward` is already configured as whole TaskMint coins. Lootably calculates this value from its placement Currency settings. The backend credits it directly and does not apply the TaskMint User Split Ratio a second time. Configure the placement's currency name, conversion rate and user split in Lootably accordingly.

The adapter activates only when the webhook secret, placement ID, exact IP allowlist, coin-unit confirmation, and server activation flag are all present. The admin provider list shows whether webhook setup is complete and whether server activation is on. It never returns the webhook secret to the browser.

## Event behavior

- `pending`: acknowledge, no wallet change.
- `approved`: credit the whole-number `currencyReward` once, keyed to provider transaction and goal.
- `rejected`: reverse that same transaction and goal once; a late approved callback for the reversed transaction stays blocked. Lootably documents rejected as a conversion that has been rejected and will not be paid out.
- A new provider transaction ID is a new completion, so a user can restart an offer after a chargeback. A different approved goal has its own reward identity.

The webhook secret is compared timing-safely. The placement, source IP, event header/body, timestamp format, and unique webhook ID are checked. Duplicate webhook IDs are recorded in `OfferwallWebhookReceipt`. Lootably documents retries up to five times until it receives a 2xx response, so transient backend errors return a retryable response.

Before production, verify unique indexes exist for `offerwallwebhookreceipts`, `offerwallrewardidentities`, and the transaction external ID index. Then run approved, duplicate, rejected, and multi-goal cases on staging and confirm wallet/ledger totals. A new provider transaction ID is treated as a new completion after reversal, as requested; the same transaction ID cannot be credited again.
