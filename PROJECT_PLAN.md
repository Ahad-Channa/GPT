# Implementation Plan: Modern MERN GPT Platform

## Technical Stack
- **Frontend**: React (Vite).
- **Styling**: TailwindCSS for modern, flexible, responsive design. 
- **Backend API**: Node.js with Express, configured as an API-first approach.
- **Authentication**: Firebase Authentication (Google OAuth & Email/Password).
- **Database**: MongoDB (Mongoose).
- **Realtime**: Socket.io (for live chat and realtime components).

## Database Schema Highlights
- Collections spanning: `Users`, `Transactions` (wallet log), `OfferwallPostbacks`, `WithdrawRequests`, `ChatMessages`, `Leaderboards`.
- Custom integration mapping Firebase user UID to Custom User Document in MongoDB.

## Implementation Details

### Wallet Logic & Offerwall 
Callbacks (postbacks) from CPX Research, AdGem, etc. hit the Express backend. The backend strictly verifies their hash signatures to guarantee authenticity. MongoDB atomic `$inc` operators process the reward to prevent concurrent bugs.

### JWT & Auth Flow
Although Firebase handles the frontend auth via Google/Email, the backend APIs will be secured by verifying the `Firebase ID Token` attached to all REST requests. This ensures custom wallet API calls and chat functions can't be spammed by unauthorized guests.

### Server Structure
- `backend/server.js`: entrypoint.
- `backend/routes/`: split into `/auth`, `/wallet`, `/offerwalls`, `/admin`, `/chat`.
- `backend/models/`: Mongoose schemas.
- `backend/middlewares/`: Firebase verification, admin checks, rate limiting.

### Client Structure
- `frontend/src/pages/`: Home, Offers, Leaderboard, Withdraw, VIP, Support, Admin.
- `frontend/src/components/`, `frontend/src/context/` (Auth provider).
