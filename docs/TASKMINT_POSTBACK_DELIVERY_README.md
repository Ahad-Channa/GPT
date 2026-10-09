# TaskMint Postback & Direct Offers Delivery Notes

## Purpose

This document records the work completed and tested on the `delivery-postback-clean` branch for the TaskMint tracking/postback delivery. It is written as a project reference so the implementation, QA steps, and known follow-up items remain documented.

## Branch / Deployment Context

- Working branch: `delivery-postback-clean`
- Main branch was not modified for this delivery.
- Staging path used on server: `/var/www/taskmint-staging`
- Staging frontend URL used for QA: `http://81.17.100.61:5056`
- Staging backend URL used for QA: `http://81.17.100.61:5055`
- PM2 apps used:
  - `taskmint-staging-backend`
  - `taskmint-staging-frontend`

## Delivery Scope Covered

The current delivery focuses on TaskMint direct offer tracking, secure S2S postbacks, branded Goodpicks offerwall support, admin logs, and multi-step reward visibility.

Completed items:

- Direct offers can be shown in Featured Offers.
- Direct offers can be shown inside the branded Goodpicks offerwall.
- A single direct offer can be configured for Featured Offers, Branded Offerwall, or both placements.
- Direct offer clicks generate tracked click IDs.
- Direct offer postbacks can approve, reject, or reverse/chargeback conversions.
- Postback URL uses mapped parameters.
- Postback secret is stored server-side and is not displayed directly in the UI.
- Multi-step goals can be configured on a direct offer.
- Multi-step goal rows show their individual reward amounts in the user-facing offer modal.
- Admin can view conversions.
- Admin can view sanitized postback logs.
- Duplicate postback protection is working.
- Reversal/chargeback prevents double deduction when repeated.
- Wallet credit and wallet deduction were tested on staging.

## Frontend Work Completed

### Featured Offers

Direct offers with Featured placement now load into the user-facing Featured Offers section.

Tested behavior:

- Direct offer cards appear alongside existing/manual featured offers.
- Opening a direct offer shows the direct offer modal.
- Starting a direct offer uses backend click tracking instead of directly opening the raw advertiser URL.
- The generated advertiser URL includes a `click_id`.

### Branded Goodpicks Offerwall

The Goodpicks branded offerwall now loads direct offers that are marked for Branded Offerwall placement.

Tested behavior:

- Direct offers appear inside the Goodpicks modal.
- Existing legacy Goodpicks content remains separate.
- Branded direct offers use the tracked click endpoint.
- Raw advertiser URL fallback is avoided for tracked direct offers.
- Multi-step reward amounts are displayed per goal row.

### Multi-Step Reward Display

Multi-step goals are shown in the offer modal as requirement rows with the reward amount for each step.

Example display:

- `Register → receive 10 coins`
- `Deposit €50 → receive 50,000 coins`
- `Generate €200 in revenue → receive 10,000 coins`

## Admin Work Completed

### Direct Offers Admin

Admin can create/edit direct offers with:

- Title
- Description
- Reward coins
- Advertiser payout
- Advertiser URL
- Requirements
- Icon / cover image
- Expiration date
- Allowed countries
- Placement selection:
  - Featured Offers
  - Branded Offerwall
- Platform selection:
  - Desktop
  - Android
  - iOS
- Multi-step goals
- Postback parameter mapping
- Active/inactive status

### Provider / Postback Configuration

The system supports parameter mapping for direct offer postbacks, including:

- Click ID parameter
- Transaction ID parameter
- Payout/revenue parameter
- Status parameter
- Event type parameter for multi-step goals
- Approved status value
- Rejected status value
- Shared secret validation

### Conversion Logs

Admin conversions page shows tracked conversion lifecycle records, including:

- Provider/type
- User
- Campaign/offer
- Click ID
- Transaction ID
- Status
- Reward
- Ledger reference
- Reversal reference where applicable

### Postback Logs

Admin postback logs show sanitized diagnostic data, including:

- Time
- Provider
- Route
- Mapped click/transaction values
- Security result
- Final result
- User/conversion reference

Secrets are not exposed in the log output.

## Backend / Tracking Flow

### Click Flow

1. User opens Featured Offers or Goodpicks offerwall.
2. User opens a direct offer.
3. User clicks Start Offer.
4. Backend creates a click record.
5. Backend redirects or opens the advertiser URL with a generated `click_id`.
6. Admin click count increments.

### Approved Postback Flow

1. Advertiser/provider calls the direct offer postback URL.
2. Backend validates mapped fields and shared secret.
3. Backend matches the `click_id` to the tracked click/user/offer.
4. Backend checks duplicate transaction protection.
5. Conversion is created/updated as approved.
6. Wallet reward is credited.
7. Admin conversion and postback log records are created.

### Rejected Postback Flow

1. Advertiser/provider sends rejected status.
2. Backend validates mapped fields and shared secret.
3. Conversion is recorded as rejected.
4. No reward is credited to the wallet.
5. Admin conversion and postback logs show the rejected result.

### Reversal / Chargeback Flow

1. Advertiser/provider sends reversed or chargeback status for a previously approved transaction.
2. Backend validates mapped fields and shared secret.
3. Existing approved conversion is located.
4. Reward is deducted from user wallet.
5. Conversion is updated to reversed/chargeback state.
6. Reversal ledger reference is attached.
7. Repeated reversal/chargeback postbacks are treated as duplicate and do not deduct again.

## Staging QA Completed

The following QA checks were performed on staging.

### 1. Frontend Build

Command used:

```bash
cd frontend
npm run build
```

Result:

- Build passed.
- Vite bundle warnings appeared, but build completed successfully.
- Large chunk warning exists and can be optimized later. It was not blocking delivery.

### 2. Backend Tests

Codex reported:

```bash
cd backend
npm test
```

Result:

- 123 tests passed.

### 3. Featured Offer Display

Verified:

- Direct offers appeared in Featured Offers.
- `QA Test Offer` and `QA Multi Step Offer` were visible.
- Direct offer modal opened correctly.

### 4. Goodpicks / Branded Offerwall Display

Verified:

- Goodpicks modal opened from dashboard.
- Branded direct offers appeared inside Goodpicks.
- `QA Test Offer` and `QA Multi Step Offer` appeared in the Goodpicks modal.
- Multi-step rows showed individual reward amounts.

### 5. Click Tracking

Verified:

- Clicking Start Offer generated advertiser URL with `click_id`.
- Admin Direct Offers page click count increased.

### 6. Approved Postback

Tested using a URL in this format:

```text
http://81.17.100.61:5055/api/direct-offers/postback?click_id=CLICK_ID&txn_id=qa-charge-001&status=approved&payout=1&event_type=register&secret=OFFER_SECRET
```

Verified:

- Response returned `1`.
- Conversion showed `approved / processed`.
- Wallet balance increased by 10 coins for the `register` goal.
- Postback log showed accepted.

Observed wallet result:

- Before approved postback: `2,432,716`
- After approved postback: `2,432,726`
- Difference: `+10 coins`

### 7. Rejected Postback

Tested using rejected status.

Verified:

- Conversion showed `rejected`.
- Wallet was not credited.
- Postback log showed accepted.
- Direct offer card displayed rejected status for that test.

### 8. Reversal / Chargeback Postback

Tested using the same approved transaction with reversed/chargeback status.

Verified:

- Conversion updated to `reversed / reversed`.
- Wallet deducted the previously credited 10 coins.
- Reversal ledger reference appeared in admin conversions.
- Postback log showed accepted.

Observed wallet result:

- Before reversal: `2,432,726`
- After reversal: `2,432,716`
- Difference: `-10 coins`

### 9. Duplicate Reversal Protection

The same reversal URL was hit again.

Verified:

- Postback log showed `duplicate duplicate`.
- Wallet did not deduct again.
- Balance remained `2,432,716`.

### 10. Duplicate Approved Postback Protection

Duplicate approved postback behavior was observed in postback logs as duplicate protection.

Verified:

- Duplicate postbacks do not credit twice.

## Important Testing Notes

### Postback Secret

Each direct offer has its own secret. The admin UI displays `Secret configured` but does not reveal the secret for security.

For manual QA, the secret was retrieved server-side from the database and used only for testing.

### Postback URL Format

The postback URL must include a separator `&` between parameters.

Correct:

```text
?click_id=CLICK_ID&txn_id=TRANSACTION_ID&status=approved&payout=1&event_type=register&secret=SECRET
```

Incorrect:

```text
?click_id=CLICK_IDtxn_id=TRANSACTION_ID
```

The incorrect version causes this error:

```text
Missing required mapped field(s): transactionId
```

### Transaction ID Requirement

`txn_id` is required for duplicate protection and conversion matching.

### Event Type Requirement for Multi-Step Offers

For multi-step offers, `event_type` should match the configured goal key.

Example:

```text
event_type=register
event_type=deposit
event_type=revenue
```

## Client-Requested Items Covered

Based on the project discussion, the following client-requested items are covered in this delivery:

- Featured Offers direct offer display.
- Goodpicks branded offerwall direct offer display.
- Individual earning amount per step for multi-step offers.
- Admin direct offer creation and management.
- Postback tracking for direct offers.
- Secure shared-secret postback validation.
- Approved/rejected/reversed conversion lifecycle.
- Wallet credit and reversal deduction.
- Admin conversion logs.
- Admin postback logs.
- Duplicate postback protection.

## Known Follow-Up / Not Included in Current Delivery

The following items were discussed but should be treated as follow-up/add-on work unless separately agreed:

### Click Limit Per Offer

Client requested the ability to set click limits per offer based on different IPs, for example:

- Limit an offer to 100 unique IP clicks.
- Hide or disable the offer from new users when limit is reached.
- Keep the offer visible in history for users who already started it.
- Allow admin to increase the limit later.
- Show a limit reached message instead of deleting/closing the offer.

This was discussed as important but was not included in the already completed delivery scope. It should be planned as a separate enhancement.

### Advanced Geo-Based Per-Step Reward Rules

Client asked if different earning amounts per offer/per step could be selected for each geo target.

The current work supports allowed countries and multi-step goals. A more advanced geo-specific reward matrix per step/country should be treated as a separate enhancement unless already implemented separately.

### Dark Mode Polishing

Client mentioned dark mode for Featured Offers and Goodpicks. Any remaining dark mode polish should be checked separately before final production deployment.

### Real Provider Integration: Lootably

Client was asked to share Lootably login details. Real Lootably setup/testing requires provider credentials and should be reviewed when credentials are available.

## Suggested Client QA Instructions

The client can test using this process:

1. Login with a normal user account.
2. Go to dashboard / Earn page.
3. Check Featured Offers and open a direct offer.
4. Click Start Offer and confirm a tracked URL with `click_id` is generated.
5. Open the Goodpicks branded offerwall.
6. Confirm branded direct offers appear there.
7. Open a multi-step direct offer.
8. Confirm each step shows its own reward amount.
9. In admin, open:
   - Direct Offers
   - Conversions
   - Postback Logs
10. Use the postback URL shown on a direct offer and replace:
   - `[CLICK_ID]`
   - `[PAYOUT]`
   - `[SECRET]`
11. Test approved, rejected, and reversal/chargeback statuses.

## Suggested Delivery Message

```text
Hi Harun, the tracking/postback system is now deployed on staging and tested end-to-end.

I tested the main flow:
- Direct offers showing in Featured Offers
- Direct offers showing inside the branded Goodpicks offerwall
- Multi-step offers showing individual reward amounts per step
- Secure click tracking with generated click IDs
- Approved postbacks crediting the user wallet
- Rejected postbacks not crediting rewards
- Reversal/chargeback deducting the credited reward
- Duplicate postback protection, so rewards are not credited or deducted twice
- Admin conversion logs and postback logs

Please review the staging version from your side as well. Since the chat became quite long, if you remember anything from the agreed current scope that still needs attention, please let me know and I’ll check it.

Also, please share the Lootably login details when possible so I can review that setup too.
```

## Final QA Status

Current staging QA status: Passed for the core direct-offer tracking and postback lifecycle.

Validated:

- Featured direct offers
- Goodpicks branded direct offers
- Multi-step reward display
- Click tracking
- Approved postback
- Rejected postback
- Reversal/chargeback
- Duplicate protection
- Wallet credit and deduction
- Admin conversion logs
- Admin postback logs

Pending before final production merge/deployment:

- Client review on staging
- Optional final `backend npm test`
- Optional final `frontend npm run build`
- Decision on whether click-limit feature is a separate add-on
- Lootably credential review when provided
