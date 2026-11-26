# TaskMint: project handoff (for a new Claude chat or a new developer)

Read this first, then continue. Last updated 2026-11-26 (Evening update: bonus hold `65094f2`, Profile Completed Offers fix `3c92f13`, and legacy offerwall list display `dcf7377` pushed on `merge-main-test`). **The newest state is in the last section: "Session of 2026-11-26" (read it first; it changes how the frontend is handled).**

## Project
- TaskMint: rewards/offerwall site. Frontend `frontend/` (React + Vite), backend `backend/` (Node/Express + MongoDB).
- Working branch: `delivery-postback-clean` (do not switch or create branches without asking).
- Client: Harun (Fiverr, writes German). Feature work is for his direct-offer tracking, Goodpicks offerwall and admin panel.
- Docs already in the repo: `docs/TASKMINT_POSTBACK_DELIVERY_README.md` (staging setup, postback QA), `docs/TRACKING_*.md`.

## What was done in the recent sessions (all committed)
1. **Goodpicks History / completion lifecycle**
   - Backend `GET /api/direct-offers` returns `lifecycle`, `isCompleted`, `completedGoalKeys` (`backend/services/tracking/offerGoalCompletion.js`, `backend/routes/directOffers.js`).
   - Completed offers leave Featured / Earn / Goodpicks browse and stay in History as plain, non-clickable text ("Abgeschlossen" / "Completed", `GoodpicksHistoryAction.jsx`).
   - The "Approved" badge on cards follows the lifecycle, not raw `clickStatus` (`getOfferBadgeStatus` in `frontend/src/utils/offerLifecycle.js`).
2. **Click-time goal snapshot is authoritative.** Completion uses the goals stored on the user's click (`goalsSnapshot`), so later admin edits to goals do not change an existing click. Clicks with no `goalsSnapshot` field (legacy) fall back to the offer's current enabled goals.
3. **QR section** (`OfferQrSection.jsx`, `utils/offerPlatforms.js`): shown for Android/iOS offers, never for PC-only, same in Featured and Goodpicks. It is a static icon, not a scannable code. A real scannable QR is not built.
4. **Coin pill** on offer cards is content-sized with a light yellow background.
5. **Multi-step goals**
   - Server now rejects empty / invalid / duplicate Goal Keys with a clear 400 (`assertValidGoalKeys` in `backend/utils/offerGoals.js`). Before, those steps were silently dropped on save.
   - Admin form (`frontend/src/pages/admin/AdminDirectOffers.jsx`) is minimal: Step label (with language dropdown), Reward (Coins), Goal Key (auto-created from the English label, editable; saved steps keep their key). Event ID, aliases, time (days), payout metadata are inside a collapsed "Advanced". Step description was removed from the form (stored data is kept). Each step has its own colour. Save shows one combined error list.
6. **10 languages** (en, de, fr, es, it, pl, pt, ru, tr, ur): enabled in `frontend/src/i18n/localeRegistry.js`. Locale files restored from `origin/main`; missing UI keys were filled with English text. Offer and step text is entered per language in the admin; users see their language's text, otherwise English. The goal "days" label follows the language of the shown offer text (`utils/goalTimeLimit.js`, `getOfferDisplayLocale`).

## Tests
- Backend: `cd backend && npm test` (node:test). Last run: 577 tests, 571 pass, 6 fail.
- Known failing tests (not caused by recent work, not fixed):
  - `phase22-transaction-labels.test.js:70`
  - `phase27-direct-offer-reward-settings.test.js:511` and `:539`
  - `phase8-admin-visibility.test.js:521`
  - `phase24-earning-display.test.js:158` and `:315` (step label comes out lowercase: `'fight 20 battles'` instead of `'Fight 20 Battles'`; also fails on a clean checkout of HEAD)
- Frontend: `cd frontend && npm run build`. Note: the build does NOT catch a missing import, check the page in a browser.
- Many tests read source files with regexes, so editing UI text can break a test. Run the related test file after changes.
- Test files use LF/CRLF mixed; some tools strip `\r`, the test helpers already normalize.

## Deploy (staging, from `docs/TASKMINT_POSTBACK_DELIVERY_README.md`)
- Server path: `/var/www/taskmint-staging`. PM2 apps seen on the server: `taskmint-staging-backend` (backend), `taskmint-ssl-frontend` (frontend; the name `taskmint-staging-frontend` does not exist).
- Other unrelated apps run on the same server. Never run `pm2 restart all`; restart by exact name.
- Typical deploy:
  ```bash
  cd /var/www/taskmint-staging
  git pull origin delivery-postback-clean
  cd backend && npm ci --omit=dev && pm2 restart taskmint-staging-backend
  cd ../frontend && npm ci && npm run build && pm2 restart taskmint-ssl-frontend
  pm2 logs taskmint-staging-backend --lines 40 --nostream
  ```
- The live site is `https://taskmint.itskode.com/`. Check with `pm2 describe <app>` (`exec cwd`) which folder the live app really runs from before assuming it is the staging folder.
- Hard refresh the browser after a frontend deploy (Ctrl+Shift+R).

## Open items / things not done
- Real scannable QR code (needs a QR library and a phone-start flow with login and click tracking).
- Website UI text (buttons, labels) for fr, es, it, pl, pt, ru, tr, ur: about 26 newer keys per language are English placeholders. The Turkish file has an Italian word ("Completato") for "Completed".
- Missing-UI-text policy for languages is unchanged in `localeRegistry.js` (no silent English fallback for UI keys; English text was filled into the files instead).
- Held rewards count as "credited" for completion (unchanged behavior). Needs a product decision if that should change.
- Final checks before telling the client it is done: Android offer shows QR, PC-only offer does not, multi-step offer with 2+ steps saves both, language dropdown in each step, History shows "Abgeschlossen" for completed offers.

## Client conversation status (as of 2026-11-24)
- Delivery: the user asked Harun to release/complete the current order (it has run long, payment is pending). The user takes responsibility for fixing bugs in the existing project after release (things that do not work as agreed), and stays available.
- New request from Harun (not started, no price given yet): three extra features integrated into TaskMint and the postback system.
  1. Cash reward spin: logic behind the reward wheel.
  2. Pack opening: users get packs based on qualified earnings; each pack reveals 3 random cards of different rarity.
  3. Collection album: collected/missing cards, progress, complete the 100-card collection.
  - A separate designer delivers the pack-opening animation, album design and 100 AI card images (50 Common, 30 Rare, 20 Super Rare).
  - Harun asked: can you do it, what do you charge, what do you need from me/the designer. He is calculating total costs.
- The user sent Harun (in German, one message) a "yes, I can" answer plus these questions before pricing: spin prize (cash or coins), who sets odds, how a spin is earned; what "qualified earnings" means and the earnings per pack (do held/reversed rewards count); drop odds per rarity and duplicate handling; whether an admin panel for cards/odds/pack rules is needed; from the designer: image format/size, animation format (Lottie/video/CSS), card list with names and IDs.
- Design notes for later (when Harun answers): decide spin results and pack rolls on the server only (never in the browser), keep them idempotent and logged, tie pack eligibility to credited conversions the same way offer completion does (`internalStatus==='approved'`, `processingState==='processed'`, `rewardTransactionId != null`), and agree milestone payments separately from the current order.
- Next step when the user is back: wait for Harun's answers, then estimate effort and give a fixed price with a timeline. Do not start coding these features before the scope and payment are agreed.

## Session of 2026-11-24: main merge, design safety, UI fixes (READ BEFORE DEPLOYING TO taskmint.me)

### Branches and servers
- `delivery-postback-clean` (my work, 86 commits ahead of `main`, 3 behind). `main` = the designer's/client's live design (taskmint.me). `merge-main-test` (pushed, tip `4e75997`) = trial merge of `origin/main` into my branch. `backup-before-main-merge` = pre-merge `dd03f62`. Test worktree: `Documents\GitHub\GPT-merge-test` (node_modules symlinked from the main folder).
- Staging server `/var/www/taskmint-staging` (PM2 `taskmint-staging-backend` id 41, `taskmint-ssl-frontend` id 42) still runs `delivery-postback-clean` (`4fe200b`); `merge-main-test` was pushed but NOT yet checked out there. Never run `pm2 restart all` (many unrelated apps). taskmint.me (live) is the client's site; nothing of mine is on it.
- Commits: `2f22df7` (alignment, transaction lines, coin pill colour, handoff) and `a2f5410` (test fix) are on `delivery-postback-clean`. `merge-main-test` is PUSHED (tip `4bc120a` or later) and contains all of them. Staging still runs `delivery-postback-clean` until the user deploys `merge-main-test`. Nothing is on taskmint.me.

### CRITICAL: do not overwrite taskmint.me with this branch yet
- The client (Harun, German only) found design differences between taskmint.me (`main`) and the staging host, and fears hidden, unagreed design changes and old bugs coming back. Rule from him: **never change design without being told; keep taskmint.me's look.**
- Verified: `merge-main-test` does NOT contain all of `main`'s newer UI. Example `frontend/src/pages/DailyBonus.jsx`: `main` has the newer mobile fixes (`clamp(12px,3.2vw,14px)`, `truncate`, `shrink-0`, `min-w-0`, progress bar on the header line); the merge test has the older version. Cause: an earlier merge of `main` was reverted (`a5b64cf`), so git treats those `main` changes as already merged and does not bring them back. `git diff --stat origin/main origin/merge-main-test -- frontend/src` still shows 76 files different; some are my intended features, some are lost `main` fixes.
- Known visible diffs of my branch vs `main` on offer cards: (1) coin pill background was yellow `rgba(255,243,214)` from old commit `6a19804`, `main` uses `rgba(249,247,241)`; I restored `main`'s colour in `DirectOfferCard.jsx` and `OfferCards.jsx` (uncommitted). (2) Number format: `main` shows `4.200` (`toLocaleString('de-DE')`), my branch uses `formatOfferAmount(..., language)` (shows `4,200` in English). Not changed yet; ask the user/Harun. (3) `main` shows an "In Progress/Pending" status pill on clicked cards; my branch shows only the reward. Not changed yet.
- Done on `merge-main-test`: restored from `origin/main` the 52 files only `main` changed since the original fork point `30e729c` (designer images in `frontend/public/coins`, DailyBonus, Header, Wallet, Leaderboard, Affiliates, VipPage, Policies, LegalModal, NotificationPanel, MyBooksSection, AdminCustomOffers, AdminLegalPages, backend CustomOffer/GoodpickOffer/LegalPage/legalTemplates). Images deleted on `main` were left in place (harmless).
- NOT reconciled yet: 27 files changed on BOTH sides (App.jsx, LanguageToggle, PublicProfileModal, Footer, GoodpicksModal, OfferCards, all i18n json + i18n.js, Home, Landing, Profile, AdminGoodpicksOffers, AdminLayout, notificationLocalizer, backend admin.js/public.js/User.js/Settings.js). A raw 3-way merge from `30e729c` conflicts in Footer, GoodpicksModal, OfferCards, the i18n files and AdminLayout, so review them by hand: keep my features, take `main`'s look.
- Next: the user deploys `merge-main-test` on staging, Harun compares it with taskmint.me and lists differences, fix them, then go live only after his approval. Test status of `merge-main-test`: frontend build ok; frontend 5 known failures; backend 7 known failures (phase22/24/27/8 groups). Never merge to `main` or deploy to taskmint.me without the user's explicit go-ahead.

### Restored on the test branch (files from `main` that must stay)
`backend/utils/fraudMultiAccount.js`, `User.js` (banReason, bannedAt), `Settings.js` (supportEmail), `authMiddleware.js`, `routes/auth.js` (enforceMultiAccountCheck), admin ban route sets banReason/bannedAt/fraudStatus, `BannedAccountModal.jsx`, `AdminSupportEmail.jsx`, `App.jsx`, `AuthContext.jsx`, `AuthModal.jsx`, `AdminLayout.jsx`; `Landing.jsx` got `isEs/isRu/isPt/isIt/isPl/isTr`.

### Offerwall crediting risk (decision still open)
`main`'s adapter registry is fail-closed: CPX, AdGem, Torox, AdToWall, Revu, PrimeEarn, Ayet postbacks will not credit coins until verified adapters exist (only Lootably if `OFFERWALL_ADAPTER_<ID>_ENABLED` env flags are set). Either finish verified adapters or keep the legacy path before any live deploy. Do not enable providers or invent rates.

### Done on 2026-11-24 (now committed; contained in `merge-main-test`)
- Coin conversion: `backend/utils/offerwallConversion.js` (`convertProviderUnitsToCoins`, tolerance snap, still floor), used in `backend/routes/offerwalls.js`; `Settings.coinsPerUSD` default 1000; admin Offerwalls shows provider-specific multiplier only where it applies (`frontend/src/utils/offerwallConversion.js`, `AdminOfferwalls.jsx`). Live DB/provider rates/Lootably settings were never touched. Tests: `phase28-offerwall-conversion`, `frontend/tests/offerwall-conversion.test.js`.
- Goal labels: `cleanGoalLabelText` in `offerGoalDisplay.js` (underscores to spaces, "50 euro" to "50 €"); Italian `offers.*` keys translated in `it.json`. English is the fallback for missing offer text in every language.
- Direct offer form (`AdminDirectOffers.jsx`): emoji/icon picker and cover-URL removed; cover image is an upload (`frontend/src/utils/imageUpload.js`, resized to webp, saved as data URL in `coverImage`; server validation `parseCoverImageInput` in `backend/utils/directOfferInput.js`, used in `backend/routes/admin.js`); step label input no longer swallows spaces (`getGoalEditorText` in `offerTranslations.js`); each step has a user preview (`data-testid="step-preview"`).
- Profile "Recent Activity": right column aligned to the right edge (`PublicProfileModal.jsx`). Recent Activity and the wallet `TransactionHistory.jsx` now use `getTransactionLines` (`earningDisplay.js`): line 1 = "Goodpicks" or "Offerwall: <name>", line 2 = offer name plus " - <step>" for multi-step. Still the old text in `frontend/src/pages/PublicProfile.jsx` and the lists in `Profile.jsx` (~lines 2775, 3613); ask the client whether to change them.
- Tests: new ones in `frontend/tests/cover-image-upload.test.js`, `backend/tests/phase29-cover-image-input.test.js`. Pre-existing failures (verified on a clean HEAD): backend phase22/27/8 ones (see list above), frontend `locale-support` (registry, marquee keys) and `offer-editor-smoke` (3 tests searching the old form text "Goal #1").

### Deploy test branch on staging (when the user says so)
```
cd /var/www/taskmint-staging && git status -sb && git fetch origin
git checkout merge-main-test && git pull --ff-only origin merge-main-test
cd backend && npm install && cd ../frontend && npm install && npm run build && cd ..
pm2 restart taskmint-staging-backend && pm2 restart taskmint-ssl-frontend
```
Rollback: `git checkout delivery-postback-clean`, reinstall, rebuild, restart the same two processes. (The profile alignment fix and transaction-lines change are now on `merge-main-test` too.)

### Communication rules
- The user speaks Roman Urdu: explain to the user in Roman Urdu. Harun only reads German: anything meant for him must be written in German, copy-paste ready, short and polite. Harun is picky about unrequested design changes; always say exactly what changed.

## Session of 2026-11-25 (older; superseded where it conflicts with 2026-11-26 below)

### Servers and branches
- `merge-main-test` (tip `22d2f18`) was deployed on staging on 2026-11-24 evening (`git pull --ff-only`, `npm install` in both folders, frontend build ok, `taskmint-staging-backend` and `taskmint-ssl-frontend` restarted, both online). Logs were clean: only Mongoose "`new` option deprecated" warnings and one expected 403 "Offer is not available on this device" (an offer's Platforms setting blocked that device). taskmint.me (live) is untouched.
- `delivery-postback-clean` (tip `5834c06`) is pushed and contained in `merge-main-test`. The 27 files changed on both sides vs `main` (list above) still need a line-by-line review against taskmint.me; Harun compares staging with taskmint.me before anything goes live.
- Staging checks for Harun: Daily Bonus progress bar on the header line; admin Approve Click; Live Feed updates without refresh; Goodpicks History shows "Abgeschlossen" and all platform icons.

### Fixes made since the last handoff (all committed, all in `merge-main-test`)
- **Admin "Approve Click" hang** (infinite spinner): root cause was the `Transaction` `post('save')` hook (daily-bonus timer) writing the User outside the reward DB transaction, which deadlocks on a real replica set. Fixed in `backend/models/Transaction.js` (`initDailyBonusTimer`, uses `doc.$session()`). It only triggered when the user's daily-bonus timer was unset or older than 24h, so it could hit any reward. Test: `backend/tests/phase36-transaction-hook-session.test.js`. Reproduced and verified on a real in-memory MongoDB replica set (see "Tooling").
- Approve Click earlier failed with a CastError because the route populated `offerId`; fixed in `getDirectOfferRewardIdentity` (`backend/services/tracking/conversionService.js`). Test `phase33`.
- **Live Feed in real time:** `backend/utils/earningFeed.js` (`broadcastNewEarning`, shared `scrubTransaction` for private users) is called from `processReward`, the offerwall route and custom-offer approvals; the frontend already listened for the socket event `newEarning`. Test `phase34`.
- **Click cap hides offers:** `isClickCapReached` (`clickService.js`); `GET /api/direct-offers` hides capped offers from users who have not started them (started users still see them). Test `phase35`.
- **Duplicate-start UX:** completed offers (postback, manual approved, chargebacked manual) no longer return the advertiser URL (`alreadyCompleted`); tests `phase31`, `phase32`.
- **Manual proof popup:** proof area stays visible after start (`rememberManualOfferStarted`), "Start Offer Again" is a secondary button, uploaded-image preview opens via portal, language comes from live i18n (stale `window.__taskmintCurrentLang` removed).
- **Cards/popup (client requests):** no status badge on Featured cards (reward only), no "Offer click recorded." banner, no Click ID line, popup no longer stretches (`height: auto`).
- **English fallback** for missing offer text in any language (`getOfferDisplayText`/`getGoalDisplayText` in `offerTranslations.js`; the admin editor stays strict).
- **Goodpicks History:** server `lifecycle`; History rows show one badge per supported platform (`GoodpicksPlatformBadges.jsx`).
- **Verified dry run (real in-memory Mongo), 3-step postback offer:** after step 1 and 2 `lifecycle` is `started`, after step 3 `completed` (wallet = sum of steps, History source returns it as completed). Replaying a txn, or a new txn for a finished step, answers `1` but credits nothing; an unknown `event_type` answers `0`. Note: the postback answers `1` for duplicates too, so check wallet and Postback Logs.

### Tooling note
- Repo tests use fakes (no real DB). DB-level bugs (transactions, locks) were reproduced with `mongodb-memory-server` installed in a temp folder outside the repo (`MongoMemoryReplSet`, then run the real route handler). Do not add it to the repo without asking.
- Test totals vary by branch; re-run `npm test` (backend) and `node --test tests/*.test.js` + `npm run build` (frontend) and record exact numbers here. Last seen on `delivery-postback-clean` before the merge: backend 543 pass / 4 fail, frontend 3 known `locale-support` failures.

### Harun: current conversation state
- **Existing Fiverr order:** it is long overdue and the user asked Harun to release it. Harun says he will close it only after the whole project is finished, and fears the user may withdraw. The user's position: not leaving, no advance payment was ever requested for the new work, only the old order's release. Recommended: agree a short final acceptance checklist so "done" is defined and no new extras creep in. A German reply was drafted in chat; confirm whether it was sent.
- **Pending request from Harun:** a step-by-step guide to create a multi-step offer and test its postback. Written (German Word file): `C:\Users\farru\Documents\TaskMint-Multi-Step-Anleitung.docx` (on the home laptop, not in the repo; if needed, ask Claude to recreate it from the admin Postback panel and `frontend/src/utils/postbackGuide.js`). Per-step example URLs in the admin show the secret as `{OFFER_SECRET}`; the full URL with the real secret comes from "Show & Copy Advertiser Postback URL". Every step needs a new `txn_id`; `event_type` = Goal Key (or the partner Event ID).
- **New features (not started):** Cash Reward Spin, Pack Opening, Collection Album. Facts from Harun: rewards are always coins; one spin per day if the user has at least $5 qualifying earnings that day; one pack per $5 qualifying revenue (held and approved count, bonuses do not); 3 random cards per pack; 100 cards (50 Common, 30 Rare, 20 Super Rare); duplicates do not add progress; completing the album pays $250 cash once per user; rarity odds 69.16 / 29.64 / 1.20 %, meant to give an average completion near $10,000; only the probabilities need an admin page (cards and images are static); the designer provides the Rive animation, album design and 100 PNGs; Harun will show the page designs on his host. My simulation with his odds: mean about $10,000, median about $9,400, fastest 10% under about $6,200, fastest simulated user about $2,800 (a lucky user can win the $250 early).
- **Still unanswered by Harun:** what "$5 qualifying revenue" means (user coins at 1000 coins = $1, or the advertiser payout), whether the 3 cards of a pack must differ in rarity, what happens to packs when a reward is reversed, the time zone for "one day", how the $250 is paid out, and the spin prizes and odds.
- **Pricing:** the user's day rate is $25; estimate 13 to 19 working days; floor $625 (probabilities admin page included), target $750. Quotes discussed: $850, then $700 (spin $180 + packs/album/admin $520), then a final draft of $650. Harun says his budget is very small, rejects "reduced scope" and upfront payment, and has not named a budget. Payment only through Fiverr escrow. Do not start coding before scope and payment are agreed.
- **Other:** Harun asked for the user's website (itskode.com; the user is in Pakistan and runs a UK-registered company, mainly for payment gateways), asked for an email identity check (the user must check their inbox and reply with their name), and suspects AI-written messages (advice: answer honestly that a translation/writing tool is used; decisions and work are the user's).

### Next steps
1. The user sends Harun the guide, the short reply about the order, and decides the final price.
2. When Harun gives a budget and answers the questions: agree scope and payment in writing, then build the features (server-side random, idempotent, logged; pack eligibility from credited conversions only; probabilities in an admin page).
3. Harun compares `merge-main-test` on staging with taskmint.me; fix the differences; go live only after his explicit approval.
4. Re-run all tests and record exact totals.

## Session of 2026-11-26 (LATEST: read this first)

### The rule from Harun (changes everything about the frontend)
- taskmint.me (`origin/main`) is the client's live site and has many frontend improvements made by a separate designer/developer while we worked on postback. **Harun wants his frontend exactly as it is on main; only our backend/postback work (and the minimum frontend needed to use it) may be added.** He found, on staging, that Footer (legal links cut off in French and other languages, banner text not translated, rows not on one line), Landing hero cards (baked images instead of translated text), and other pages were the old versions. He is afraid that deploying our branch overwrites his improvements. Never do a "whole branch" overwrite; never change his design without being told.
- Why it happened: an earlier merge of `main` was reverted (`a5b64cf`), so git thought main's newer changes were already merged. The only reliable way is a 3-way merge with the explicit old fork point `30e729c` as the base (`git merge-file base ours theirs`, all three normalised to LF).

### What was done (commit `df0d169` on `merge-main-test`, pushed to origin)
- Worked in a separate worktree `C:\Users\farru\Documents\GitHub\GPT-merge-test` (branch `merge-main-test`, same branch the staging server runs). Recreate with `git worktree add ../GPT-merge-test merge-main-test`, then link `node_modules` with `mklink /J frontend\node_modules <main folder>\frontend\node_modules` (and backend). Remove with `git worktree remove`. The folder `GPT-main` stays on `delivery-postback-clean`.
- Classification of every `frontend/src` file that differed from main:
  - **Taken unchanged from main (design):** `Footer.jsx`, `Landing.jsx`, `LanguageToggle.jsx`, `i18n/i18n.js`. Together with files already restored earlier, these are now **identical to main**: Footer, Landing, DailyBonus, Header, Wallet, Leaderboard, Affiliates, VipPage, Policies, LanguageToggle.
  - **Our new files (30, not on main):** admin Direct Offers / Postback Logs / Conversions / Providers / Testing Guides pages, `GoodpicksHistoryAction`, `GoodpicksPlatformBadges`, `OfferQrSection`, `offerLifecycle`, `offerTranslations`, `earningDisplay`, `postbackGuide`, etc.
  - **19 main files with our feature wiring (small): ** `Home` (108 changed lines), `Earn` (162), `GoodpicksModal` (532), `DirectOfferCard` (361), `OfferCards` (174, custom-offer start), `ProofUploadView` (137), `LiveEarningsBar` (67), `OfferwallModal` (85), `AdminOfferwalls` (337, conversion wording), `Profile` (54), `notificationLocalizer` (51), `TransactionHistory` (17), `App` (12, admin routes), `AdminLayout` (11, menu), `AdminGoodpicksOffers` (11, notice), `WithdrawalModal` (9), `AdminSettings` (8), `PublicProfileModal` (6), `LiveEarningsTicker` (3). In shared files main's style wins; our direct-offer / History / lifecycle code stays. Harun should get this list.
- **Locale files:** main's files are the base; only our still-used feature keys were added (`offers.*`, `goodpicks.*`, `withdraw.giftCardHint`, `profile.*`); 7 unused keys of ours were dropped. For en/de/fr/ur main's ~40 keys that our files lacked (e.g. `nextTopEarnerTitle`, `nextTopEarnerDesc`, `changeToLightMode`) came back.
- **`i18n.js` is main's** (fallback to English for UI keys like taskmint.me). Our `localeRegistry.js` stays but is used only by the admin offer editor (`AdminDirectOffers` imports `ENABLED_LOCALE_CODES`).
- **Backend:** main's changes that were missing were restored: `Settings.supportEmail`, and the Es/Ru/Pt/It/Pl/Tr fields for Goodpicks offers and legal pages in `routes/admin.js` and `routes/public.js` (conflicts kept our test-helper export and the `earningTypes` import).
- **Bugs fixed on the way:** Live Feed popup now shows only the completed step (the "Earn" heading was removed at Harun's request); a provider event id like `fight_20_battles` shows as "Fight 20 Battles" (it showed lowercase; fix is in `resolveLiveStepLabel` in `earningDisplay.js`).
- **Tests:** backend 573 pass / 4 fail, frontend 82 pass / 4 fail, frontend build ok. The 8 failures also failed on the previous `merge-main-test`: backend "admin form explains the USD fields...", "frontend direct-offer start only opens backend returned URLs", "offerwall reward shows the provider name...", "reward calculation and wallet code are untouched..."; frontend "Add Goal render path works with English/German selected", "goal label/description state is clear per language", "registry registers every locale file...". Tests that pinned our old design (German "Schnellzugriff", Landing/Footer alts, profile `flex-end`, old goal-label chain) were updated on purpose.

### Choices deliberately left as main has them (tell Harun, he decides)
- German footer shows "Quick Links" (English term); we had made it "Schnellzugriff".
- Landing marquee shows "Gift Card" in every language (hardcoded on main); we had localised it ("Carte Cadeau").
- Live Feed hover pill says "Earnd" (typo, also on main).
- Profile "Recent Activity" alignment is main's.
- UI language fallback is main's (English fallback for missing keys); our "translation unavailable" policy now applies only to offer text via `getOfferDisplayText`.
- Images: many old unused files remain in `frontend/public/coins` (main deleted them, we left them; harmless).

### Deploy state
- `origin/merge-main-test` is at commit `dcf7377` (pushed). The staging server (`/var/www/taskmint-staging`) needs a pull, frontend rebuild (`npm run build`), and PM2 restart (`taskmint-staging-backend` and `taskmint-ssl-frontend`) to deploy `dcf7377`.
- The live URL is `https://taskmint.itskode.com/`.
- Deploy commands for staging whenever new commits are pushed:
  ```bash
  cd /var/www/taskmint-staging
  git pull --ff-only origin merge-main-test
  git log --oneline -1
  pm2 restart taskmint-staging-backend
  cd frontend && npm run build && pm2 restart taskmint-ssl-frontend
  ```
  (Never run `pm2 restart all` as unrelated services run on the same VPS).

### Fixes implemented and pushed on `merge-main-test` (commits up to `dcf7377`)
- **`13c3ad4` (Goal step label fallback):** In `offerTranslations.js` / step display, when a Goal Key was generated from the English step label, it displays the English label cleanly in German and other languages instead of showing "nicht verfügbar" or raw keys.
- **`4a635cc` (Profile popup recent activity):** Right-aligned the coins and date column in `PublicProfileModal.jsx` across both mobile and desktop viewports.
- **`c38e49a` (VIP Bronze I, Leaderboard reset, Transaction lists):**
  - **VIP Bronze I Claim:** Fixed the bug where Bronze I was automatically marked as "Claimed" without granting bonus coins. Now displays the "Claim" button properly for users reaching Bronze I.
  - **Leaderboard Reset Bug:** In `backend/routes/leaderboard.js`, midnight reset (00:00 UTC) previously queried the new empty day, resulting in 0 winners. Fixed to evaluate the ended period (day, week, month) before distributing prizes and archiving.
  - **Transaction Lists:** Unified profile transaction history and completed offer lists to display `Goodpicks · Offer - Step`.
- **`4ee1e1a` (Daily bonus & promo code qualifying earnings with Hold):**
  - Updated Daily Bonus unlock and Promo Code 7-day earning requirement so that offer earnings currently on **hold** count towards the qualification threshold (e.g. user earns 5,000 coins from a large offer with hold; daily bonus unlocks).
  - Cancelled/rejected earnings and bonus coins do not qualify.
- **`65094f2` (Platform hold on Daily, Leaderboard, and VIP bonuses; Promo codes excluded):**
  - Applied `getEarningHoldDecision(settings, rewardAmount, now)` (using the platform-wide `earningHoldConfig` threshold and holdDays) to:
    * Daily Bonus claims (`POST /api/wallet/daily-bonus` in `backend/routes/wallet.js`)
    * Leaderboard period reset prizes (`resetLeaderboard` in `backend/routes/leaderboard.js`)
    * VIP level bonus claims (`POST /api/vip/claim/:levelKey` in `backend/routes/vip.js`)
  - Promo code redemptions (`POST /api/wallet/redeem-promo`) remain instant credit (`status: 'completed'`) regardless of hold settings, per Harun's request (*"bei promo codes nein, die werden eh immer niedrig sein; ja auch hold bei bonis bitte"*).
  - Updated `backend/utils/earningTypes.js` (`BONUS_HOLDABLE_TYPES`, `EARNING_HOLD_RELEASE_TYPES`) and `backend/utils/earningHoldJob.js` so the daily hold release job (`releaseEligibleEarningHolds` / `releaseEarningHoldTransaction`) releases matured bonus holds and credits `walletBalance` once, while keeping `REAL_OFFER_EARNING_TYPES` strictly for real offer earnings (so bonuses never count toward VIP progress or leaderboard rankings).
  - Tests: `backend/tests/phase38-bonus-holds.test.js` (6 new tests). Full backend suite: **590 tests, 586 pass, 4 fail** (only the 4 pre-existing failures).
- **`3c92f13` (Profile "Completed Offers" tab includes `direct_offer_reward`):**
  - Fixed `fetchOffersData` in `frontend/src/pages/Profile.jsx` (line 2725), which previously requested `/wallet/history?type=offer_reward%2Ccustom_offer_reward&limit=50` without `%2Cdirect_offer_reward`. That caused completed Goodpicks/Direct Offers to count in the top "3 Offers Completed" card (`dashboard-stats`) while the "Completed Offers" tab stayed empty. Now includes `direct_offer_reward`.
- **`dcf7377` (Omit `"Offer details unavailable"` in transaction lists for old legacy offerwall rows):**
  - Updated `getTransactionLines` and `getTransactionText` in `frontend/src/utils/earningDisplay.js` (and `PublicProfileModal.jsx`) so old October test offerwall transactions that were stored before `offerTitle` existed show cleanly as `Offerwall: Lootably` instead of `Offerwall: Lootably · Offer details unavailable`.

### Harun: latest feedback & pending requests (as of evening 2026-11-26)
1. **Hold on Bonuses (Daily Bonus, Leaderboard Bonus, VIP Bonus):**
   - **DONE (`65094f2`)**: Pushed to `origin/merge-main-test`. Ready to pull and restart `taskmint-staging-backend` on staging.
2. **Dummy Offerwalls Removal:**
   - Harun requested removing dummy / design-only offerwall placeholders from the Earn page so only real working offerwalls (**Goodpicks** and **Lootably**) remain visible. (Can be disabled in Admin -> Offerwalls).

### Next steps
1. **Deploy `65094f2` to Staging:**
   - Run `git pull --ff-only origin merge-main-test` and `pm2 restart taskmint-staging-backend` on `/var/www/taskmint-staging`.
2. **Offerwalls Display:**
   - Disable non-live offerwalls in Admin -> Offerwalls (or ensure only Goodpicks and Lootably appear on Earn).
3. **Client Verification:**
   - Send Harun confirmation that Bonus Hold (for Daily, Leaderboard, and VIP bonuses, excluding Promo Codes) is now live on staging alongside the earlier fixes.

## Working rules used in this project
- Do not commit, push or deploy without being asked.
- Do not touch reward calculation, holds, reversal/idempotency, click identity, or manual-offer logic unless that is the task.
- Report test results with exact totals and name remaining failures.
