# TaskMint: project handoff (for a new Claude chat or a new developer)

Read this first, then continue. Last updated 2026-11-24.

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
- Nothing from this session is committed. Uncommitted on `delivery-postback-clean`: `PublicProfileModal.jsx`, `DirectOfferCard.jsx`, `OfferCards.jsx`, `TransactionHistory.jsx`, `earningDisplay.js`, `frontend/tests/cover-image-upload.test.js` (plus earlier uncommitted items listed below).

### CRITICAL: do not overwrite taskmint.me with this branch yet
- The client (Harun, German only) found design differences between taskmint.me (`main`) and the staging host, and fears hidden, unagreed design changes and old bugs coming back. Rule from him: **never change design without being told; keep taskmint.me's look.**
- Verified: `merge-main-test` does NOT contain all of `main`'s newer UI. Example `frontend/src/pages/DailyBonus.jsx`: `main` has the newer mobile fixes (`clamp(12px,3.2vw,14px)`, `truncate`, `shrink-0`, `min-w-0`, progress bar on the header line); the merge test has the older version. Cause: an earlier merge of `main` was reverted (`a5b64cf`), so git treats those `main` changes as already merged and does not bring them back. `git diff --stat origin/main origin/merge-main-test -- frontend/src` still shows 76 files different; some are my intended features, some are lost `main` fixes.
- Known visible diffs of my branch vs `main` on offer cards: (1) coin pill background was yellow `rgba(255,243,214)` from old commit `6a19804`, `main` uses `rgba(249,247,241)`; I restored `main`'s colour in `DirectOfferCard.jsx` and `OfferCards.jsx` (uncommitted). (2) Number format: `main` shows `4.200` (`toLocaleString('de-DE')`), my branch uses `formatOfferAmount(..., language)` (shows `4,200` in English). Not changed yet; ask the user/Harun. (3) `main` shows an "In Progress/Pending" status pill on clicked cards; my branch shows only the reward. Not changed yet.
- Required next step (agreed in principle, not started): build a per-file comparison against `origin/main` in three groups: (a) my intended features to keep, (b) `main` fixes lost in the merge to restore (use `git apply -R --3way` on the `a5b64cf` revert hunks or take `main`'s version of the file), (c) pure design differences to reset to `main` unless Harun approves. Then build + tests in the test worktree, deploy to staging, let Harun compare staging against taskmint.me, and only after his approval go live. Never merge to `main` or deploy to taskmint.me without the user's explicit go-ahead.

### Restored on the test branch (files from `main` that must stay)
`backend/utils/fraudMultiAccount.js`, `User.js` (banReason, bannedAt), `Settings.js` (supportEmail), `authMiddleware.js`, `routes/auth.js` (enforceMultiAccountCheck), admin ban route sets banReason/bannedAt/fraudStatus, `BannedAccountModal.jsx`, `AdminSupportEmail.jsx`, `App.jsx`, `AuthContext.jsx`, `AuthModal.jsx`, `AdminLayout.jsx`; `Landing.jsx` got `isEs/isRu/isPt/isIt/isPl/isTr`.

### Offerwall crediting risk (decision still open)
`main`'s adapter registry is fail-closed: CPX, AdGem, Torox, AdToWall, Revu, PrimeEarn, Ayet postbacks will not credit coins until verified adapters exist (only Lootably if `OFFERWALL_ADAPTER_<ID>_ENABLED` env flags are set). Either finish verified adapters or keep the legacy path before any live deploy. Do not enable providers or invent rates.

### Done this session (all uncommitted unless noted)
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
Rollback: `git checkout delivery-postback-clean`, reinstall, rebuild, restart the same two processes. The profile alignment fix and the transaction-lines change are NOT on `merge-main-test`; commit them on `delivery-postback-clean` first, then bring them into the test branch.

### Communication rules
- The user speaks Roman Urdu: explain to the user in Roman Urdu. Harun only reads German: anything meant for him must be written in German, copy-paste ready, short and polite. Harun is picky about unrequested design changes; always say exactly what changed.

## Working rules used in this project
- Do not commit, push or deploy without being asked.
- Do not touch reward calculation, holds, reversal/idempotency, click identity, or manual-offer logic unless that is the task.
- Report test results with exact totals and name remaining failures.
