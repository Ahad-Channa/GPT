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

## Working rules used in this project
- Do not commit, push or deploy without being asked.
- Do not touch reward calculation, holds, reversal/idempotency, click identity, or manual-offer logic unless that is the task.
- Report test results with exact totals and name remaining failures.
