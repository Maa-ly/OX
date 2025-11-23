# ODX Oracle Service

The oracle aggregates activity about anime/manga/comic IPs from Web2 sources and Walrus, validates with Nautilus, and reports engagement metrics to Sui smart contracts to drive token pricing.

## What This Directory Contains

- `src/providers/reddit.js`: Fetches recent Reddit posts for each IP
- `src/providers/instagram.js`: Fetches recent Instagram hashtag media (requires tokens)
- `src/providers/oracle-metrics.js`: Fetches metrics from project's oracle-metrics endpoint
- `src/orchestrator.js`: One-cycle orchestrator to collect, store, and update on-chain
- `src/index.js`: Scheduler entrypoint to run periodically
- `scripts/test-oracle.js`: Script to run a single test cycle and print results

## How It Works

1. List IP tokens via backend `GET /api/contract/tokens?detailed=true`
2. Fetch oracle metrics from project endpoint `GET /api/posts/oracle-metrics` (optional, enabled by default)
3. Collect external posts for each IP name (Reddit, optional Instagram)
4. Store posts as Walrus contributions through backend `POST /api/oracle/contributions`
5. Trigger combined metrics update `POST /api/oracle/update/:ipTokenId?includeExternal=true&name=<IP>`
   - Backend aggregates Walrus user data + Nautilus external metrics and writes on-chain

## Environment

Create `oracle/.env` and set:

- `BACKEND_BASE_URL` (auto-updated by test script to the available port; during local runs use `http://localhost:3004/api` if backend selects an alternate port)
- `UPDATE_INTERVAL_MS` (default `3600000`)
- `ENABLE_REDDIT` (default `true`), `ENABLE_INSTAGRAM` (default `false`), `ENABLE_ORACLE_METRICS` (default `true`)
- `ORACLE_METRICS_URL` (default `https://ox-1bq4.vercel.app/api/posts/oracle-metrics`)
- `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID` for Instagram provider

On-chain configuration (backend `.env`):

- `ADMIN_PRIVATE_KEY` (Ed25519 32-byte secret; hex or base64)
- `PACKAGE_ID`, `ORACLE_OBJECT_ID`, `ADMIN_CAP_ID` matching deployed contracts
- `ENABLE_ONCHAIN=true` to execute writes
- `DISABLE_SCHEDULER=true` for local testing to avoid concurrent runs

Backend requires its own `.env` including `ADMIN_PRIVATE_KEY` and contract object IDs for on-chain updates.

## Run

1. Start backend:
   - `cd backend`
   - `npm start`
2. Run oracle once:
   - `cd oracle`
   - `npm start`
3. Test script:
   - `node scripts/test-oracle.js`
   - The test script will auto-start the backend if `BACKEND_BASE_URL` is unreachable.
   - It discovers a healthy port in `3000–3010` and updates `oracle/.env BACKEND_BASE_URL` accordingly.

## Next Steps

- Add X/Twitter, YouTube, TikTok providers
- Persist dedup state for external IDs across restarts
- Rate-limit and retry logic for each provider
- Expand Nautilus signatures verification path on-chain
- Add unit tests and CI for providers/orchestrator

## External Sources (Web2)

- **Oracle Metrics Endpoint**: Fetches metrics from project's `/api/posts/oracle-metrics` endpoint
  - Returns posts, engagement metrics (likes, comments), and metrics grouped by IP token
  - Provides internal project activity data to complement external sources
- Reddit: search posts by IP name; aggregate counts and engagement
- Instagram: Graph API via `INSTAGRAM_ACCESS_TOKEN` and `INSTAGRAM_USER_ID`
- MyAnimeList (MAL):
  - Endpoints provide `mean` (rating), `rank`, `popularity`, `num_list_users`, `num_scoring_users`
  - Example: `https://api.myanimelist.net/v2/anime?q=naruto&limit=5&fields=id,title,mean,rank,popularity,num_list_users,num_scoring_users`
  - Requires `Authorization: Bearer <token>`; add `MAL_ACCESS_TOKEN` to `.env` and fetch with the token

Name matching:

- IP token names should match anime titles or include aliases
- Maintain per-token alias list (e.g., `One Piece` → `OP`, Japanese titles) to improve provider recall

## How The Oracle Connects

- Contributions:
  - Stored via backend `POST /api/oracle/contributions` where Walrus storage and indexing occur.
  - Indexer reads back contributions for aggregation.
- Aggregation:
  - Walrus contributions aggregated in `AggregationService`.
  - External metrics via Nautilus enclave.
- On-chain update:
  - Combined metrics posted with `POST /api/oracle/update/:ipTokenId?includeExternal=true&name=IPName`.
  - Contract write uses `oracle::update_engagement_metrics()`.
- Validation:
  - Nautilus signatures included and checked server-side; full verification performed on-chain.

## Environment

- `oracle/.env` should include:
  - `BACKEND_BASE_URL=http://localhost:3000/api`
  - `ENABLE_REDDIT=true`
  - `ENABLE_INSTAGRAM=false`
  - `ENABLE_ORACLE_METRICS=true` (default)
  - `ORACLE_METRICS_URL=https://ox-1bq4.vercel.app/api/posts/oracle-metrics` (default)
  - `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID` if Instagram is enabled
- Backend `.env` must have contract IDs and `ADMIN_PRIVATE_KEY` for on-chain writes.

## Commands

- Start backend server:
  - `cd backend && npm start`
- Install and run oracle test:
  - `cd oracle && npm install && node scripts/test-oracle.js`
- Run oracle scheduler:
  - `cd oracle && npm start` (uses `UPDATE_INTERVAL_MS`)
  