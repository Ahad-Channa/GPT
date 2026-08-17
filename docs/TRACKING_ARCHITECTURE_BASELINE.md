# Taskmint Tracking Architecture Baseline

Phase 1 is a no-functional-change preparation phase. This document records the current runtime behavior and the later migration targets for the shared tracking, conversion, postback, reward, and reversal architecture. No live routes import future service placeholders in this phase.

## Baseline Scope

Authoritative sources:

- `Taskmint_Postback_Tracking_Scope.pdf`
- `Taskmint_Implementation_Phases.docx`
- Step 1 repository architecture review
- Step 2 technical/security audit

Phase 1 preserves the existing frontend, backend, database behavior, route paths, postback responses, reward amounts, wallet behavior, transaction creation, provider behavior, leaderboard calculations, daily bonus calculations, referral behavior, VIP behavior, and admin behavior.

## Current Runtime Architecture

The backend is an Express app initialized in `backend/server.js`. It loads environment variables, connects to MongoDB through `backend/config/db.js`, initializes Firebase Admin through `backend/config/firebase.js`, creates an HTTP server, and attaches Socket.IO. The current route mounting is:

- `/api/auth` -> `backend/routes/auth.js`
- `/api/wallet` -> `backend/routes/wallet.js`
- `/api/admin` -> `backend/routes/admin.js`
- `/api/offerwalls` -> `backend/routes/offerwalls.js`
- `/api/custom-offers` -> `backend/routes/customOffers.js`
- `/api/direct-offers` -> `backend/routes/directOffers.js`
- `/api/activity` -> `backend/routes/activity.js`
- `/api/leaderboard` -> `backend/routes/leaderboard.js`
- `/api/public` -> `backend/routes/public.js`
- `/api/notifications` -> `backend/routes/notifications.js`
- `/api/chat` -> `backend/routes/chat.js`
- `/api/support` -> `backend/routes/support.js`
- `/api/vip` -> `backend/routes/vip.js`
- `/api/books` -> `backend/routes/books.js`

Socket.IO identity registration happens in `backend/server.js` through the `identify` event, which calls `registerSocket` from `backend/utils/walletEvents.js`. Live wallet pushes use `emitWalletUpdate`; targeted events use `emitToUser`.

## Current Click Flow

Direct-offer clicks are handled by `POST /api/direct-offers/click/:offerId` in `backend/routes/directOffers.js`.

Current behavior:

- Authenticates with `verifyToken`.
- Loads the Mongo user by Firebase UID.
- Rejects banned users.
- Loads `DirectOffer` by route `offerId`.
- Rejects missing, inactive, or expired offers.
- Checks whether the user already has an approved `ClickLog` for that offer.
- Generates `clickId` using `uuidv4`.
- Captures IP with a local `getIp` helper.
- Captures user-agent and derived device with local `detectDevice`.
- Creates a `ClickLog` with `clickId`, `offerId`, `userId`, `ip`, `userAgent`, `device`, blank `country`, status `clicked`, and reward snapshot.
- Increments `DirectOffer.totalClicks`.
- Appends the click ID to `DirectOffer.advertiserUrl` using `postbackMapping.clickIdParam`, defaulting to `click_id`.
- Returns `{ success, url, clickId }` to the frontend.

Current frontend entry points:

- `frontend/src/pages/Earn.jsx` loads active direct offers from `/api/direct-offers`.
- `frontend/src/components/offers/DirectOfferCard.jsx` calls `/api/direct-offers/click/:offerId` and opens the returned URL.
- `frontend/src/pages/Home.jsx` also displays direct offers.

Later migration target:

- Move click validation, metadata capture, country resolution, country targeting, click ID generation, tracking param capture, and redirect URL generation into `backend/services/tracking/clickService.js`.
- Do not move this logic in Phase 1.

## Current Direct-Offer Postback Flow

Direct-offer S2S callbacks use `GET /api/direct-offers/postback` in `backend/routes/directOffers.js`.

Current behavior:

- Public route with no Firebase auth.
- Requires `secret` query parameter.
- Finds `DirectOffer` by `postbackSecretKey`.
- Reads direct-offer mapping fields from `offer.postbackMapping`.
- Reads click ID, status, and payout query parameters.
- Resolves `ClickLog` by `clickId` and `offerId`.
- Treats already approved/rejected clicks as idempotent success.
- For rejected status, marks the click rejected and increments `totalRejected`.
- For approved status, loads the user, rejects banned users, increments wallet and `totalEarned`, creates a `direct_offer_reward` transaction, updates the click, increments `totalApproved`, creates a notification, emits a wallet update, and attempts VIP processing.

Known audit notes for later phases:

- `transactionIdParam` exists in `DirectOffer.postbackMapping` but is not currently used.
- Unknown status currently defaults to approved.
- Wallet update, transaction create, and click update are not atomic.
- This route should later become a thin compatibility wrapper around the shared conversion engine.

Later migration targets:

- Parameter parsing -> `parameterMapper`
- Status normalization -> `statusMapper`
- Secret/signature validation -> provider security layer
- Conversion resolution and idempotency -> conversion service
- Wallet and transaction creation -> reward service
- Reversal handling -> reversal service

## Current Offerwall Postback Flow

Offerwall callbacks are handled in `backend/routes/offerwalls.js`.

Current route wrappers:

- `GET /api/offerwalls/postback/cpx`
- `GET /api/offerwalls/postback/adgem`
- `GET /api/offerwalls/postback/lootably`
- `GET /api/offerwalls/postback/torox`
- `GET /api/offerwalls/postback/primeearn`
- `GET /api/offerwalls/postback/ayet`
- `GET /api/offerwalls/postback/adtowall`
- `GET /api/offerwalls/postback/revu`

All wrappers call local `handlePostback(providerId, req, res, params)`.

Current behavior:

- Loads provider settings from `Settings.getSingleton().offerwallProviders`.
- Silently returns success if provider is missing or disabled.
- Uses `PROVIDER_SECRET_MAP` to find env secret names.
- Validates CPX with an MD5 hash when configured.
- Other provider secret mismatch rejection is currently commented out.
- If secret is missing from env, validation is skipped with a warning.
- Credits by provider-supplied user ID, not by a stored click.
- Converts provider units by `provider.conversionRatio`.
- Uses `Transaction.externalId = providerId:transactionId` for duplicate checks.
- Negative amounts are treated as chargebacks.
- Positive amounts create `offer_reward` transactions, update wallet or hold balance, notify user/admin, emit wallet updates, process VIP, and create referral rewards.

Known audit notes for later phases:

- Current logic is provider-specific and not click-chain based.
- Missing secrets can bypass validation.
- Non-CPX validation is not enforced.
- Missing transaction IDs are not explicitly rejected.
- Chargeback fallback can match by amount if original transaction is not found.
- Wallet mutation and transaction creation are not transactionally safe.

Later migration target:

- Keep current route paths as compatibility wrappers.
- Move provider mapping/adaptation into `backend/services/tracking/adapters/`.
- Move shared orchestration into `backend/services/tracking/conversionService.js`.
- Move reward creation into `backend/services/rewards/rewardService.js`.
- Move reversal processing into `backend/services/rewards/reversalService.js`.

## Current Wallet and Reward Flow

The central ledger model is `backend/models/Transaction.js`.

Relevant transaction types include:

- `offer_reward`
- `custom_offer_reward`
- `direct_offer_reward`
- `daily_bonus`
- `referral_reward`
- `withdrawal`
- `admin_adjustment`
- `promo_code`
- `leaderboard_reward`
- `chargeback`
- `vip_reward`
- `mission_reward`

Wallet history is returned by `GET /api/wallet/history` in `backend/routes/wallet.js`.

Offerwall rewards:

- Created in `backend/routes/offerwalls.js` as `offer_reward`.
- Can be immediate `completed` or `hold` depending on `Settings.earningHoldConfig`.

Custom/manual rewards:

- Approved through `backend/routes/admin.js` custom-offer approval routes.
- Created as `custom_offer_reward`.

Direct-offer rewards:

- Created in `backend/routes/directOffers.js` and admin manual click approval paths as `direct_offer_reward`.

Later migration target:

- Shared reward creation moves to `backend/services/rewards/rewardService.js`.
- The service must preserve existing transaction history semantics and live wallet updates.

## Current Referral Reward Flow

Referral relationships are created in `backend/routes/auth.js` during `/api/auth/sync` when `ref` is provided. Referral code resolution also exists in `backend/routes/public.js` through `/api/public/r/:code`.

Offerwall referral rewards are created in `backend/routes/offerwalls.js` after positive offerwall reward creation.

Custom-offer referral rewards are created in `backend/routes/admin.js` when admin approves proof submissions.

Referral hold release runs in `backend/utils/referralHoldJob.js`, scheduled daily at midnight UTC.

Known audit note:

- Direct-offer S2S rewards do not currently run equivalent referral commission logic.

Later migration target:

- Referral commission creation should be invoked by the shared reward service for eligible real earnings.

## Current VIP Flow

VIP logic is defined in `backend/utils/vipUtils.js` and `backend/routes/vip.js`.

Current behavior:

- VIP level is based on `User.totalEarned`.
- `processVipLevelUp(user, added, emitToUser)` detects level crossings.
- VIP rewards are claimed through `/api/vip/claim/:levelKey`.
- Admin VIP configuration is handled in `/api/vip/admin/config`.

Known audit note:

- Direct-offer postback/manual approval paths attempt to call `processVipLevelUp` with an incompatible argument shape.

Later migration target:

- Reward service calls VIP processing consistently after committed real earnings.

## Daily Bonus Relationship

Daily bonus routes live in `backend/routes/wallet.js`.

`backend/models/Transaction.js` has a post-save hook that initializes the Day 1 daily bonus timer after completed real earning transaction types:

- `offer_reward`
- `custom_offer_reward`
- `direct_offer_reward`

Daily bonus claims create `daily_bonus` transactions but intentionally do not increment `totalEarned`.

Later migration target:

- Preserve the existing daily bonus system.
- Ensure new real conversion rewards continue to create transaction types recognized by the daily bonus hook.

## Leaderboard Relationship

Leaderboard logic is in `backend/routes/leaderboard.js`.

Current period rankings aggregate only:

- `offer_reward`
- `custom_offer_reward`

All-time leaderboard reads `User.totalEarned`.

Known audit note:

- `direct_offer_reward` is excluded from period leaderboard calculations and some dashboard/public stats even though direct offers are real earnings.

Later migration target:

- Add a shared real-earning type definition and use it consistently across leaderboard, wallet stats, public profile, recent earnings, hold release, and profile views.
- Do not rebuild the leaderboard system.

## Chargeback and Reversal Paths

Existing reversal/chargeback behavior appears in several places:

- Offerwall negative amount path in `backend/routes/offerwalls.js`.
- Generic admin chargeback route `POST /api/admin/chargebacks/:transactionId/process` in `backend/routes/admin.js`.
- Proof chargeback route `POST /api/admin/proofs/:type/:id/chargeback` in `backend/routes/admin.js`.

Current behavior varies by path:

- Some paths mark the original transaction `reversed`.
- Proof chargeback creates separate `chargeback` transactions.
- Offerwall negative chargebacks do not consistently create a separate linked reversal ledger transaction.

Later migration target:

- Consolidate reversal behavior in `backend/services/rewards/reversalService.js`.
- Original reward transaction remains in history.
- A separate linked chargeback transaction records the reversal.
- Duplicate reversals cannot deduct twice.

## Admin Controls

Existing admin routes live primarily in `backend/routes/admin.js`.

Current relevant controls:

- Provider enable/disable and conversion ratio: `PUT /api/admin/offerwalls/:providerId`.
- Direct-offer CRUD: `/api/admin/direct-offers`.
- Direct-offer click logs: `/api/admin/direct-offers/:id/clicks` and `/api/admin/click-logs`.
- Manual click approve/reject: `/api/admin/click-logs/:clickId/approve` and `/api/admin/click-logs/:clickId/reject`.
- Custom offer CRUD/submission approval.
- Proof history and chargebacks.
- Settings for daily bonus, referral, earning holds, withdrawals, leaderboard, and public stats.

Frontend admin pages:

- `frontend/src/pages/admin/AdminOfferwalls.jsx`
- `frontend/src/pages/admin/AdminDirectOffers.jsx`
- `frontend/src/pages/admin/AdminCustomOffers.jsx`
- `frontend/src/pages/admin/AdminProofs.jsx`
- `frontend/src/pages/admin/AdminSettings.jsx`
- `frontend/src/pages/admin/AdminLeaderboard.jsx`
- `frontend/src/pages/admin/AdminVip.jsx`

Later migration target:

- Add admin conversion and postback log visibility inside the existing admin application.
- Do not create a separate admin platform.

## Socket.IO and Notification Behavior

Notification persistence uses `backend/models/Notification.js` and `backend/utils/notify.js`.

Live wallet updates use:

- `registerSocket`
- `emitWalletUpdate`
- `emitToUser`

Frontend socket identity and wallet update handling are in `frontend/src/contexts/AuthContext.jsx`.

Notifications are fetched/polled in `frontend/src/contexts/NotificationContext.jsx`, with additional targeted socket events for selected events.

Later migration target:

- Reward service emits wallet updates only after committed reward/reversal state.
- Conversion service writes logs before/after processing as appropriate.

## ProviderConfig Phase 2 Design

Phase 2 should add a dedicated `ProviderConfig` model rather than storing full provider integration configuration in `Settings`.

Proposed fields:

- `providerId`: unique stable identifier, for example `cpx`.
- `name`: display name.
- `type`: `offerwall`, `direct`, or another explicit provider class needed later.
- `enabled`: provider active state.
- `parameterMappings`: provider param names mapped to internal fields:
  - `clickId`
  - `transactionId`
  - `status`
  - `payout`
  - `eventType`
  - optional extra provider fields.
- `statusMappings`: provider values mapped to internal statuses:
  - pending
  - approved
  - rejected
  - reversal
- `security`: method and non-secret config:
  - `method`: none, shared_secret, md5, sha256, hmac, token, custom_adapter.
  - `signatureParam`
  - `secretRef` or environment variable reference, not plaintext secret in normal responses.
  - `hashTemplate` or adapter key where needed.
- `responseConfig`:
  - success body/status
  - duplicate body/status
  - rejection/error body/status where provider requires it.
- `ipAllowlist`: optional provider-published IPs/CIDRs.
- `providerSettings`: provider-specific non-secret settings.
- `timestamps`: Mongoose timestamps.

Sensitive credentials must never be returned in normal admin API responses. Admin responses should expose only safe indicators such as `secretConfigured: true` and masked identifiers where useful.

Actual database implementation belongs to Phase 2.

## Future Service Migration Map

The current logic should later move as follows:

- Click validation, metadata capture, country targeting, click ID generation, and redirect URL generation -> click service.
- Incoming provider routing, mapping, click/user/offer resolution, conversion state, idempotency, and response selection -> conversion service.
- Signature, hash, secret, token, and optional IP validation -> provider security layer and provider adapters.
- Wallet balance changes, transaction creation, earning holds, referral commissions, VIP processing, notifications, and socket wallet updates -> reward service.
- Chargeback/reversal lookup, linked ledger creation, duplicate reversal prevention, and referral reversal cascade -> reversal service.
- Provider parameter conversion -> parameter mapper.
- Provider status normalization -> status mapper.

## Reward Atomicity Strategy

The existing code uses Mongoose but does not currently prove whether the production MongoDB deployment supports multi-document transactions. MongoDB transactions generally require a replica set or sharded cluster. The current code only reads `MONGODB_URI` in `backend/config/db.js`, so Phase 1 cannot safely assume transaction support.

Phase 2 or Phase 6 should verify transaction capability against the actual deployment before implementing the final reward pipeline.

Preferred path if MongoDB transactions are supported:

- Use a Mongoose session.
- Create or claim the conversion inside the session.
- Create the reward transaction inside the session.
- Update user wallet and `totalEarned` inside the session.
- Update conversion with linked `rewardTransactionId` inside the session.
- Commit once all writes succeed.
- Abort on any failure.

Fallback path if unsupported:

- Use unique database constraints for provider transaction identity.
- Use an atomic conversion state claim with conditional `findOneAndUpdate`.
- Use idempotency keys per provider/conversion/reversal.
- Only the request that successfully claims the conversion can mutate wallet state.
- Do not mutate wallet before a successful durable claim exists.
- Use conditional updates to prevent duplicate reversal deductions.
- Return idempotent success for already-processed conversions without changing balances.

No existing reward behavior is changed in Phase 1.

## Sensitive Postback Logging Rules

Future `PostbackLog` persistence and admin display must sanitize sensitive data.

Must redact:

- API keys
- shared secrets
- authorization headers
- bearer tokens
- private tokens
- passwords
- private credentials
- raw provider secret params

Signatures and hashes may be logged only when safe and useful, preferably masked, for example first six and last four characters. Plaintext credentials must not be persisted.

Recommended sanitizer behavior:

- Case-insensitive key matching for `secret`, `token`, `api_key`, `apikey`, `authorization`, `password`, `private_key`, `signature` where appropriate.
- Preserve enough safe metadata for debugging, such as param presence, masked signature shape, provider ID, click ID, transaction ID, status, and processing result.

## Phase 1 Verification Checklist

This phase does not intentionally alter:

- postback responses
- reward amounts
- wallet behavior
- transaction creation
- existing route paths
- current provider behavior
- leaderboard calculations
- daily bonus calculations
- referral behavior
- VIP behavior
- admin behavior

Future service directories are placeholders only and are not imported by runtime code.
