# Nautilus & Walrus Integration Plan for ODX

## Overview

This document outlines the integration of **Nautilus Oracle** and **Walrus Storage** to create a comprehensive, verifiable data pipeline for ODX that combines:
- **User Contributions** (stored on Walrus) - User-generated engagement data
- **External Truth Sources** (verified via Nautilus) - Provable metrics from external APIs

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ODX Data Pipeline                            │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐         ┌──────────────────────┐
│   User Contributions │         │  External Data APIs  │
│   (Frontend)         │         │  (MyAnimeList, etc.) │
└──────────┬───────────┘         └──────────┬───────────┘
           │                                │
           │ Signs with wallet              │
           ▼                                ▼
┌──────────────────────┐         ┌──────────────────────┐
│   Walrus Storage     │         │  Nautilus Enclave    │
│   - User ratings     │         │  - Fetches external  │
│   - Memes/posts      │         │  - Signs data        │
│   - Predictions      │         │  - Returns verified  │
│   - Stakes           │         │    metrics           │
└──────────┬───────────┘         └──────────┬───────────┘
           │                                │
           │                                │
           └────────────┬───────────────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │   Oracle Service      │
            │   (Backend)           │
            │                       │
            │ 1. Query Walrus       │
            │    contributions      │
            │ 2. Call Nautilus      │
            │    for external data  │
            │ 3. Combine metrics    │
            │ 4. Verify signatures  │
            │ 5. Aggregate          │
            └───────────┬───────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │   Smart Contracts     │
            │   (Sui)               │
            │                       │
            │ - Verify Nautilus     │
            │   signatures          │
            │ - Update metrics      │
            │ - Calculate price     │
            │ - Update order book   │
            └───────────────────────┘
```

## Data Flow

### 1. User Contributions (Walrus)
- Users create contributions (ratings, memes, predictions, stakes)
- Contributions are signed with wallet
- Stored on Walrus (decentralized, immutable)
- Indexed by IP token ID

### 2. External Truth Sources (Nautilus)
- Oracle service calls Nautilus enclave
- Enclave fetches data from external APIs:
  - MyAnimeList API
  - AniList API
  - MangaDex API
  - Other fandom data sources
- Enclave signs the data cryptographically
- Returns signed metrics to oracle service

### 3. Combined Metrics
- Oracle combines:
  - **Walrus metrics**: User engagement (ratings, memes, predictions, stakes)
  - **Nautilus metrics**: External truth (popularity, ratings, view counts, etc.)
- Creates comprehensive metrics:
  - Average rating (user + external)
  - Total contributors (user count)
  - External popularity score
  - Growth rate (user engagement + external trends)
  - Prediction accuracy (user predictions vs actual outcomes)

### 4. Price Calculation
- Uses combined metrics for price calculation:
  ```
  price = base_price * (1 + growth_factor)
  
  growth_factor = (
    user_engagement_growth * 0.6 +  // 60% weight on user data
    external_popularity_growth * 0.4  // 40% weight on external truth
  ) * multiplier
  ```
- Price reflects both:
  - Community engagement (Walrus)
  - Market reality (Nautilus)

## Implementation Plan

### Phase 1: Nautilus Enclave Setup
1. Create Nautilus enclave service
2. Configure external API endpoints (MyAnimeList, AniList)
3. Implement data fetching and signing
4. Deploy enclave and register on-chain

### Phase 2: Backend Integration
1. Create Nautilus service in backend
2. Add endpoints to call Nautilus enclave
3. Update aggregation service to combine Walrus + Nautilus data
4. Store Nautilus metrics alongside Walrus data

### Phase 3: Smart Contract Updates
1. Add Nautilus signature verification
2. Update metrics structure to include external data
3. Update price calculation to use combined metrics
4. Add on-chain verification of Nautilus attestations

### Phase 4: Frontend Updates
1. Display verified metrics from both sources
2. Show "Truth Source" indicators
3. Display external popularity data
4. Show combined price calculation breakdown

## Benefits

### For Sponsors (Nautilus & Walrus)
- **Nautilus**: Demonstrates secure, verifiable off-chain computation
- **Walrus**: Shows decentralized storage for user data
- Both are **essential** to ODX's value proposition

### For Users
- **Transparent**: Can verify both user and external data
- **Accurate**: Prices reflect real market conditions
- **Trustworthy**: External data is cryptographically verified

### For Platform
- **Robust**: Multiple data sources prevent manipulation
- **Verifiable**: All data can be independently verified
- **Comprehensive**: Combines community engagement with market reality

## Technical Details

### Nautilus Enclave Endpoints
- `POST /process_data` - Fetch and sign external data
- `GET /health_check` - Health check
- `GET /get_attestation` - Get attestation document

### External Data Sources
- MyAnimeList API: Ratings, popularity, member counts
- AniList API: Ratings, favorites, trending
- MangaDex API: View counts, ratings, popularity

### Combined Metrics Structure
```typescript
{
  // User metrics (from Walrus)
  user_average_rating: number,
  user_total_contributors: number,
  user_total_engagements: number,
  user_growth_rate: number,
  
  // External metrics (from Nautilus)
  external_average_rating: number,
  external_popularity_score: number,
  external_member_count: number,
  external_trending_score: number,
  
  // Combined metrics
  combined_rating: number,
  combined_popularity: number,
  combined_growth_rate: number,
  
  // Verification
  nautilus_signature: string,
  nautilus_timestamp: number,
  walrus_verified: boolean,
}
```

