# ODX Oracle Service

The oracle aggregates activity about anime/manga/comic IPs from Web2 sources and Walrus, validates with Nautilus, and reports engagement metrics to Sui smart contracts to drive token pricing.

## What This Directory Contains

- `src/providers/reddit.js`: Fetches recent Reddit posts for each IP
- `src/providers/instagram.js`: Fetches recent Instagram hashtag media (requires tokens)
- `src/orchestrator.js`: One-cycle orchestrator to collect, store, and update on-chain
- `src/index.js`: Scheduler entrypoint to run periodically
- `scripts/test-oracle.js`: Script to run a single test cycle and print results

## How It Works

1. List IP tokens via backend `GET /api/contract/tokens?detailed=true`
2. Collect external posts for each IP name (Reddit, optional Instagram)
3. Store posts as Walrus contributions through backend `POST /api/oracle/contributions`
4. Trigger combined metrics update `POST /api/oracle/update/:ipTokenId?includeExternal=true&name=<IP>`
   - Backend aggregates Walrus user data + Nautilus external metrics and writes on-chain

## Environment

Create `oracle/.env` and set:

- `BACKEND_BASE_URL` (default `http://localhost:3000/api`)
- `UPDATE_INTERVAL_MS` (default `3600000`)
- `ENABLE_REDDIT` (default `true`), `ENABLE_INSTAGRAM` (default `false`)
- `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID` for Instagram provider

Backend requires its own `.env` including `ADMIN_PRIVATE_KEY` and contract object IDs for on-chain updates.

## Run

1. Start backend:
   - `cd backend`
   - `npm run start:no-publisher`
2. Run oracle once:
   - `cd oracle`
   - `npm start`
3. Test script:
   - `node scripts/test-oracle.js`

## Next Steps

- Add X/Twitter, YouTube, TikTok providers
- Persist dedup state for external IDs across restarts
- Rate-limit and retry logic for each provider
- Expand Nautilus signatures verification path on-chain
- Add unit tests and CI for providers/orchestrator