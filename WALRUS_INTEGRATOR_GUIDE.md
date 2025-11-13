# Walrus Integrator Guide - ODX Project

## CRITICAL: Your Role is 70% of This Project

You are building the bridge that makes ODX work. Without proper Walrus integration, the entire platform cannot function. This document specifies what you need to build.

---

## Table of Contents

1. [Your Mission](#your-mission)
2. [Architecture Overview](#architecture-overview)
3. [What You Need to Build](#what-you-need-to-build)
4. [Data Structures & Formats](#data-structures--formats)
5. [Oracle Service Requirements](#oracle-service-requirements)
6. [Integration Points](#integration-points)
7. [Implementation Checklist](#implementation-checklist)
8. [Testing Requirements](#testing-requirements)
9. [Performance Considerations](#performance-considerations)
10. [Critical Success Factors](#critical-success-factors)

---

## Your Mission

### Primary Responsibilities

You are building the **Oracle Service** that:

1. **Reads ALL user contributions from Walrus** (ratings, memes, posts, predictions, stakes)
2. **Verifies data authenticity** using wallet signatures
3. **Aggregates comprehensive metrics** from all contribution types
4. **Updates Sui smart contracts** with calculated metrics
5. **Triggers price recalculations** based on engagement data
6. **Enables reward distribution** by tracking contributor activity

### Why This is 70% of the Project

- **Smart contracts are ready** - they're waiting for your data
- **Frontend will send data to Walrus** - but needs your service to process it
- **Token prices depend on your metrics** - no data = no price updates
- **Rewards depend on your tracking** - no attribution = no rewards
- **Platform success depends on accurate data** - your service is the source of truth

Without this service, ODX cannot function. The platform depends on accurate data aggregation and on-chain updates.

---

## Architecture Overview

### The Complete Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    ODX Complete Architecture                    │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Frontend   │
│   (Users)    │
└──────┬───────┘
       │
       │ 1. User creates contribution:
       │    - Posts meme
       │    - Makes prediction
       │    - Rates IP
       │    - Stakes on prediction
       │
       │ 2. Frontend signs data with wallet
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│                    WALRUS STORAGE                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Ratings  │  │  Memes   │  │Predictions│  │  Stakes  │  │
│  │  Posts   │  │  Shares  │  │  Reviews  │  │   etc.   │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                                                             │
│  ALL contributions stored with:                            │
│  - Wallet signatures (proof of ownership)                  │
│  - Timestamps                                              │
│  - IP token associations                                   │
│  - Content CIDs                                            │
└──────────────────────┬─────────────────────────────────────┘
                       │
                       │ 3. YOUR ORACLE SERVICE READS
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              YOUR ORACLE SERVICE (YOU BUILD THIS!)          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  1. Query Walrus by IP token ID                      │  │
│  │  2. Verify wallet signatures                         │  │
│  │  3. Aggregate ALL contribution types:                │  │
│  │     - Count ratings, calculate average               │  │
│  │     - Count memes/posts, identify viral content      │  │
│  │     - Count predictions, track accuracy              │  │
│  │     - Sum stakes, calculate confidence               │  │
│  │     - Calculate growth rates                         │  │
│  │  4. Calculate comprehensive metrics                  │  │
│  │  5. Call Sui smart contracts                         │  │
│  └──────────────────────┬───────────────────────────────┘  │
└─────────────────────────┼───────────────────────────────────┘
                          │
                          │ 4. Updates on-chain
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              SUI SMART CONTRACTS                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Oracle     │  │   Rewards    │  │  Marketplace │     │
│  │   Module     │  │   Module     │  │   Module     │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│         │ Updates metrics  │ Distributes      │ Uses price   │
│         │ Triggers price   │ rewards          │ for trading  │
│         │ calculation      │                  │              │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Token Price    │
                    │  Updates        │
                    │  Rewards Paid   │
                    │  Trading Active │
                    └─────────────────┘
```

---

## What You Need to Build

### 1. Oracle Service (Backend Application)

**Technology Stack (Recommended):**
- **Language**: Node.js, Python, or Rust (your choice)
- **Database**: For caching aggregated metrics
- **Scheduler**: Cron jobs or task queue for periodic updates
- **Sui SDK**: To interact with Sui blockchain
- **Walrus SDK/API**: To query Walrus storage

**Core Components:**

#### A. Walrus Query Service
```typescript
// Pseudocode example
class WalrusQueryService {
  // Query all contributions for an IP token
  async queryContributionsByIP(ipTokenId: string): Promise<Contribution[]>
  
  // Query by contribution type
  async queryByType(ipTokenId: string, type: ContributionType): Promise<Contribution[]>
  
  // Query by time range
  async queryByTimeRange(ipTokenId: string, startTime: number, endTime: number): Promise<Contribution[]>
  
  // Get specific contribution by CID
  async getContribution(cid: string): Promise<Contribution>
}
```

#### B. Signature Verification Service
```typescript
class SignatureVerificationService {
  // Verify wallet signature matches data
  verifySignature(data: Contribution, signature: string, wallet: string): boolean
  
  // Verify contribution hasn't been tampered with
  verifyIntegrity(contribution: Contribution): boolean
}
```

#### C. Metrics Aggregation Service
```typescript
class MetricsAggregationService {
  // Aggregate ALL contribution types
  aggregateMetrics(contributions: Contribution[]): EngagementMetrics {
    return {
      averageRating: this.calculateAverageRating(contributions),
      totalContributors: this.countUniqueContributors(contributions),
      totalEngagements: contributions.length,
      memeCount: this.countByType(contributions, 'meme'),
      postCount: this.countByType(contributions, 'post'),
      predictionCount: this.countByType(contributions, 'prediction'),
      stakeVolume: this.sumStakes(contributions),
      growthRate: this.calculateGrowthRate(contributions),
      viralContentScore: this.calculateViralScore(contributions),
      predictionAccuracy: this.calculatePredictionAccuracy(contributions)
    }
  }
}
```

#### D. Sui Smart Contract Interface
```typescript
class SuiContractInterface {
  // Update engagement metrics on-chain
  async updateEngagementMetrics(
    ipTokenId: string,
    metrics: EngagementMetrics
  ): Promise<TransactionResult>
  
  // Sync contributor data
  async syncContributorData(
    ipTokenId: string,
    contributorCount: number
  ): Promise<TransactionResult>
}
```

#### E. Scheduler/Orchestrator
```typescript
class OracleScheduler {
  // Run every hour (or configurable interval)
  async updateAllIPTokens(): Promise<void> {
    const ipTokens = await this.getAllIPTokens()
    
    for (const token of ipTokens) {
      await this.updateTokenMetrics(token.id)
    }
  }
  
  // Update metrics for single IP token
  async updateTokenMetrics(ipTokenId: string): Promise<void> {
    // 1. Query Walrus
    const contributions = await walrusService.queryContributionsByIP(ipTokenId)
    
    // 2. Verify signatures
    const verified = contributions.filter(c => 
      signatureService.verifySignature(c)
    )
    
    // 3. Aggregate metrics
    const metrics = aggregationService.aggregateMetrics(verified)
    
    // 4. Update on-chain
    await suiContract.updateEngagementMetrics(ipTokenId, metrics)
  }
}
```

---

## Data Structures & Formats

### Contribution Types You Must Handle

#### 1. Rating/Review
```json
{
  "ip_token_id": "0x4e5dddb28eb25df63cb8b3d8be8f3a16bd40e7a044e7809bc9eb19cbc9cd3e2d",
  "user_wallet": "0x6df2465c7b9a88e9769a625b3af0afbf41ab61d86183d85eb5fa5b7bd0549c71",
  "engagement_type": "rating",
  "rating": 9,
  "review_text": "Amazing anime!",
  "timestamp": 1736629200,
  "signature": "0xdef456...",
  "walrus_cid": "bafybeigdyrzt5sfp7..."
}
```

#### 2. Meme/Post
```json
{
  "ip_token_id": "0x4e5dddb28eb25df63cb8b3d8be8f3a16bd40e7a044e7809bc9eb19cbc9cd3e2d",
  "user_wallet": "0x6df...",
  "engagement_type": "meme",
  "content_cid": "bafybeigdyrzt5sfp7...",
  "caption": "When Denji meets Power",
  "tags": ["funny", "chainsaw-man"],
  "engagement_count": 150,  // Likes, shares, comments
  "timestamp": 1736629200,
  "signature": "0xdef456...",
  "walrus_cid": "bafybeigdyrzt5sfp7..."
}
```

#### 3. Episode Prediction
```json
{
  "ip_token_id": "0x4e5dddb28eb25df63cb8b3d8be8f3a16bd40e7a044e7809bc9eb19cbc9cd3e2d",
  "user_wallet": "0x6df...",
  "engagement_type": "episode_prediction",
  "prediction": "Episode 12 releases on Dec 25, 2024",
  "predicted_date": 1735084800,
  "prediction_hash": "0xabc123...",
  "stake_amount": 100,
  "timestamp": 1736629200,
  "signature": "0xdef456...",
  "walrus_cid": "bafybeigdyrzt5sfp7..."
}
```

#### 4. Token Price Prediction
```json
{
  "ip_token_id": "0x4e5dddb28eb25df63cb8b3d8be8f3a16bd40e7a044e7809bc9eb19cbc9cd3e2d",
  "user_wallet": "0x6df...",
  "engagement_type": "price_prediction",
  "prediction": "Will rise 30% this week",
  "prediction_type": "rise",
  "predicted_percentage": 30,
  "timeframe": "1_week",
  "stake_amount": 500,
  "timestamp": 1736629200,
  "signature": "0xdef456...",
  "walrus_cid": "bafybeigdyrzt5sfp7..."
}
```

#### 5. Stake on Prediction
```json
{
  "prediction_cid": "bafybeigdyrzt5sfp7...",
  "user_wallet": "0x6df...",
  "engagement_type": "stake",
  "stake_amount": 200,
  "timestamp": 1736629200,
  "signature": "0xdef456...",
  "walrus_cid": "bafybeigdyrzt5sfp7..."
}
```

---

## Oracle Service Requirements

### 1. Query Walrus Efficiently

**You Must:**
- Query all contributions for a specific IP token ID
- Filter by contribution type (rating, meme, prediction, stake)
- Query by time range (for growth rate calculations)
- Handle pagination (Walrus may return large datasets)
- Cache frequently accessed data

**Example Query Pattern:**
```typescript
// Get all contributions for "Chainsaw Man" token
const contributions = await walrus.query({
  ip_token_id: "0x4e5dddb28eb25df63cb8b3d8be8f3a16bd40e7a044e7809bc9eb19cbc9cd3e2d",
  // Optional filters:
  // engagement_type: "meme",
  // start_timestamp: 1736629200,
  // end_timestamp: 1736715600
})
```

### 2. Verify Wallet Signatures

**Critical Security Requirement:**

Every contribution MUST be verified before aggregation:

```typescript
function verifyContribution(contribution: Contribution): boolean {
  // 1. Extract the data that was signed
  const dataToVerify = {
    ip_token_id: contribution.ip_token_id,
    engagement_type: contribution.engagement_type,
    // ... all other fields except signature
  }
  
  // 2. Reconstruct the message that was signed
  const message = JSON.stringify(dataToVerify)
  
  // 3. Verify signature using wallet's public key
  return verifySignature(
    message,
    contribution.signature,
    contribution.user_wallet
  )
}
```

**Why This Matters:**
- Prevents fake contributions
- Ensures data integrity
- Required for accurate price calculation
- Required for fair reward distribution

### 3. Aggregate Comprehensive Metrics

**You Must Calculate:**

```typescript
interface EngagementMetrics {
  // Basic metrics
  average_rating: number;           // 0-10, scaled by 100 (850 = 8.50)
  total_contributors: number;        // Unique wallet addresses
  total_engagements: number;         // Total contribution count
  
  // Contribution type breakdowns
  rating_count: number;
  meme_count: number;
  post_count: number;
  episode_prediction_count: number;
  price_prediction_count: number;
  stake_count: number;
  
  // Engagement quality metrics
  viral_content_score: number;       // Memes/posts with high engagement
  prediction_accuracy: number;       // 0-10000 (scaled by 100)
  total_stake_volume: number;        // Sum of all stakes
  
  // Growth metrics
  growth_rate: number;               // Percentage, scaled by 100
  engagement_velocity: number;       // Contributions per day
  new_contributors_this_week: number;
  
  // Timestamps
  last_updated: number;              // Unix timestamp in milliseconds
}
```

**Calculation Examples:**

```typescript
// Average Rating
function calculateAverageRating(contributions: Contribution[]): number {
  const ratings = contributions
    .filter(c => c.engagement_type === 'rating')
    .map(c => c.rating)
  
  if (ratings.length === 0) return 0
  
  const sum = ratings.reduce((a, b) => a + b, 0)
  const average = (sum / ratings.length) * 100  // Scale by 100
  return Math.floor(average)
}

// Growth Rate
function calculateGrowthRate(contributions: Contribution[]): number {
  const now = Date.now()
  const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = now - (14 * 24 * 60 * 60 * 1000)
  
  const thisWeek = contributions.filter(c => 
    c.timestamp >= oneWeekAgo && c.timestamp < now
  ).length
  
  const lastWeek = contributions.filter(c => 
    c.timestamp >= twoWeeksAgo && c.timestamp < oneWeekAgo
  ).length
  
  if (lastWeek === 0) return thisWeek > 0 ? 10000 : 0  // 100% growth or 0%
  
  const growth = ((thisWeek - lastWeek) / lastWeek) * 100
  return Math.floor(growth * 100)  // Scale by 100 (e.g., 25% = 2500)
}

// Viral Content Score
function calculateViralScore(contributions: Contribution[]): number {
  const memesAndPosts = contributions.filter(c => 
    c.engagement_type === 'meme' || c.engagement_type === 'post'
  )
  
  // Weight by engagement_count (likes, shares, comments)
  const totalEngagement = memesAndPosts.reduce((sum, c) => 
    sum + (c.engagement_count || 0), 0
  )
  
  // Normalize to 0-10000 scale
  const score = Math.min(totalEngagement / 10, 10000)
  return Math.floor(score)
}

// Prediction Accuracy
function calculatePredictionAccuracy(contributions: Contribution[]): number {
  const predictions = contributions.filter(c => 
    c.engagement_type === 'episode_prediction' || 
    c.engagement_type === 'price_prediction'
  )
  
  // Check which predictions came true
  // (This requires checking actual episode release dates or price movements)
  const accurate = predictions.filter(p => checkIfAccurate(p)).length
  
  if (predictions.length === 0) return 0
  
  const accuracy = (accurate / predictions.length) * 10000  // Scale by 100
  return Math.floor(accuracy)
}
```

### 4. Update Sui Smart Contracts

**Smart Contract Function You Must Call:**

```typescript
// From oracle.move module
async function updateEngagementMetrics(
  oracle: PriceOracle,
  adminCap: OracleAdminCap,
  ipTokenId: string,
  metrics: EngagementMetrics
) {
  await suiClient.call({
    packageId: PACKAGE_ID,
    module: 'oracle',
    function: 'update_engagement_metrics',
    arguments: [
      oracle,              // Shared object
      adminCap,            // Admin capability
      ipTokenId,           // ID
      metrics.average_rating,
      metrics.total_contributors,
      metrics.total_engagements,
      metrics.prediction_accuracy,
      metrics.growth_rate
    ],
    gasBudget: 10000000
  })
}
```

**What Happens After You Call This:**
1. Smart contract updates `EngagementMetrics` struct
2. Automatically triggers `recalculate_price()`
3. Token price updates based on your metrics
4. Marketplace uses new price for trading

---

## Integration Points

### Point 1: Reading from Walrus

**Your Service Must:**
- Connect to Walrus storage (API or SDK)
- Query by IP token ID
- Handle pagination for large datasets
- Cache results to reduce queries
- Handle errors gracefully

**Query Strategy:**
```typescript
// Efficient querying pattern
async function queryAllContributions(ipTokenId: string): Promise<Contribution[]> {
  const allContributions: Contribution[] = []
  let cursor: string | null = null
  
  do {
    const result = await walrus.query({
      ip_token_id: ipTokenId,
      cursor: cursor,
      limit: 1000
    })
    
    allContributions.push(...result.contributions)
    cursor = result.nextCursor
  } while (cursor)
  
  return allContributions
}
```

### Point 2: Verifying Signatures

**You Must:**
- Verify every contribution's signature
- Reject contributions with invalid signatures
- Log verification failures for monitoring
- Handle edge cases (missing signatures, malformed data)

**Signature Verification:**
```typescript
import { verifyMessage } from '@mysten/sui.js/verify'

async function verifyContribution(contribution: Contribution): Promise<boolean> {
  try {
    // Reconstruct the message that was signed
    const message = JSON.stringify({
      ip_token_id: contribution.ip_token_id,
      engagement_type: contribution.engagement_type,
      // ... all fields except signature
    })
    
    // Verify using Sui's signature verification
    const isValid = await verifyMessage(
      message,
      contribution.signature,
      contribution.user_wallet
    )
    
    return isValid
  } catch (error) {
    console.error('Signature verification failed:', error)
    return false
  }
}
```

### Point 3: Aggregating Metrics

**You Must:**
- Process ALL contribution types
- Calculate accurate averages
- Track growth rates over time
- Identify viral content
- Calculate prediction accuracy (requires checking outcomes)

**Aggregation Pipeline:**
```typescript
async function aggregateMetricsForIP(ipTokenId: string): Promise<EngagementMetrics> {
  // 1. Query all contributions
  const allContributions = await queryAllContributions(ipTokenId)
  
  // 2. Verify signatures
  const verifiedContributions = allContributions.filter(c => 
    verifyContribution(c)
  )
  
  // 3. Calculate metrics
  const metrics: EngagementMetrics = {
    average_rating: calculateAverageRating(verifiedContributions),
    total_contributors: countUniqueContributors(verifiedContributions),
    total_engagements: verifiedContributions.length,
    meme_count: countByType(verifiedContributions, 'meme'),
    post_count: countByType(verifiedContributions, 'post'),
    episode_prediction_count: countByType(verifiedContributions, 'episode_prediction'),
    price_prediction_count: countByType(verifiedContributions, 'price_prediction'),
    stake_count: countByType(verifiedContributions, 'stake'),
    viral_content_score: calculateViralScore(verifiedContributions),
    prediction_accuracy: await calculatePredictionAccuracy(verifiedContributions),
    total_stake_volume: sumStakes(verifiedContributions),
    growth_rate: calculateGrowthRate(verifiedContributions),
    engagement_velocity: calculateVelocity(verifiedContributions),
    new_contributors_this_week: countNewContributors(verifiedContributions),
    last_updated: Date.now()
  }
  
  return metrics
}
```

### Point 4: Updating Smart Contracts

**You Must:**
- Connect to Sui network (testnet/mainnet)
- Have admin capability for oracle module
- Call `update_engagement_metrics()` function
- Handle transaction failures
- Retry on errors

**Sui Integration:**
```typescript
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client'
import { TransactionBlock } from '@mysten/sui.js/transactions'

const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') })

async function updateOnChainMetrics(
  ipTokenId: string,
  metrics: EngagementMetrics,
  oracleObjectId: string,
  adminCapId: string
): Promise<void> {
  const tx = new TransactionBlock()
  
  tx.moveCall({
    target: `${PACKAGE_ID}::oracle::update_engagement_metrics`,
    arguments: [
      tx.object(oracleObjectId),
      tx.object(adminCapId),
      tx.pure(ipTokenId),
      tx.pure(metrics.average_rating),
      tx.pure(metrics.total_contributors),
      tx.pure(metrics.total_engagements),
      tx.pure(metrics.prediction_accuracy),
      tx.pure(metrics.growth_rate)
    ]
  })
  
  const result = await suiClient.signAndExecuteTransaction({
    signer: adminKeypair,
    transactionBlock: tx,
    options: {
      showEffects: true,
      showEvents: true
    }
  })
  
  return result
}
```

---

## Implementation Checklist

### Phase 1: Setup & Infrastructure

- [ ] Set up development environment
- [ ] Install Walrus SDK/API client
- [ ] Install Sui SDK
- [ ] Set up database for caching metrics
- [ ] Set up logging and monitoring
- [ ] Configure environment variables

### Phase 2: Walrus Integration

- [ ] Implement Walrus query service
- [ ] Test querying contributions by IP token ID
- [ ] Test querying by contribution type
- [ ] Test querying by time range
- [ ] Implement pagination handling
- [ ] Add error handling and retries

### Phase 3: Signature Verification

- [ ] Implement signature verification function
- [ ] Test with valid signatures
- [ ] Test with invalid signatures
- [ ] Test with missing signatures
- [ ] Add logging for verification failures
- [ ] Optimize verification performance

### Phase 4: Metrics Aggregation

- [ ] Implement average rating calculation
- [ ] Implement contributor counting
- [ ] Implement growth rate calculation
- [ ] Implement viral content scoring
- [ ] Implement prediction accuracy tracking
- [ ] Implement stake volume calculation
- [ ] Test all aggregation functions
- [ ] Add unit tests

### Phase 5: Sui Integration

- [ ] Connect to Sui testnet
- [ ] Get oracle object ID and admin capability
- [ ] Implement `update_engagement_metrics()` call
- [ ] Test transaction submission
- [ ] Handle transaction failures
- [ ] Verify on-chain updates

### Phase 6: Scheduler & Automation

- [ ] Implement scheduler (cron or task queue)
- [ ] Set up periodic updates (hourly/daily)
- [ ] Implement update for all IP tokens
- [ ] Add monitoring and alerts
- [ ] Test end-to-end flow

### Phase 7: Testing & Optimization

- [ ] Test with real Walrus data
- [ ] Test with large datasets
- [ ] Optimize query performance
- [ ] Optimize aggregation performance
- [ ] Add caching layer
- [ ] Load testing

### Phase 8: Production Readiness

- [ ] Error handling and recovery
- [ ] Monitoring and alerting
- [ ] Documentation
- [ ] Deployment scripts
- [ ] Backup and recovery procedures

---

## Testing Requirements

### Unit Tests

Test each component independently:

```typescript
describe('Metrics Aggregation', () => {
  test('calculates average rating correctly', () => {
    const contributions = [
      { engagement_type: 'rating', rating: 8 },
      { engagement_type: 'rating', rating: 9 },
      { engagement_type: 'rating', rating: 10 }
    ]
    const avg = calculateAverageRating(contributions)
    expect(avg).toBe(900)  // 9.00 scaled by 100
  })
  
  test('handles empty contributions', () => {
    const avg = calculateAverageRating([])
    expect(avg).toBe(0)
  })
  
  test('calculates growth rate correctly', () => {
    // Test with mock timestamped contributions
  })
})
```

### Integration Tests

Test end-to-end flow:

```typescript
describe('Oracle Service Integration', () => {
  test('queries Walrus, aggregates, and updates Sui', async () => {
    // 1. Query Walrus
    const contributions = await walrusService.queryContributionsByIP(ipTokenId)
    
    // 2. Verify signatures
    const verified = contributions.filter(c => verifySignature(c))
    
    // 3. Aggregate
    const metrics = aggregateMetrics(verified)
    
    // 4. Update Sui
    const result = await updateOnChainMetrics(ipTokenId, metrics)
    
    // 5. Verify on-chain
    const onChainMetrics = await getOnChainMetrics(ipTokenId)
    expect(onChainMetrics).toMatchObject(metrics)
  })
})
```

### Performance Tests

- Test with 10,000+ contributions per IP
- Test query performance
- Test aggregation performance
- Test Sui transaction performance
- Measure end-to-end latency

---

## Performance Considerations

### 1. Query Optimization

**Problem:** Querying all contributions for 1000 IPs could be slow

**Solutions:**
- **Index by IP token ID** in Walrus queries
- **Cache frequently accessed data**
- **Incremental updates** (only process new contributions)
- **Parallel processing** for multiple IPs
- **Batch queries** when possible

### 2. Aggregation Optimization

**Problem:** Aggregating millions of contributions is computationally expensive

**Solutions:**
- **Incremental aggregation** (update metrics, don't recalculate from scratch)
- **Cached intermediate results**
- **Parallel processing** for different metric types
- **Database for storing aggregated metrics**

### 3. Sui Transaction Optimization

**Problem:** Too many on-chain updates = high gas costs

**Solutions:**
- **Batch updates** (update multiple IPs in one transaction if possible)
- **Update only when metrics change significantly**
- **Use shared objects** efficiently
- **Optimize gas usage**

### 4. Scalability

**Problem:** As platform grows, more IPs and contributions

**Solutions:**
- **Horizontal scaling** (multiple oracle instances)
- **Load balancing**
- **Queue-based processing** (RabbitMQ, Redis Queue)
- **Database sharding** if needed

---

## Critical Success Factors

### 1. Data Accuracy

**Requirements:**
- Verify every signature
- Reject invalid data
- Handle edge cases
- Log all verification failures
- Monitor data quality

**Rationale:** Incorrect metrics result in incorrect prices and platform failure.

### 2. Reliability

**Requirements:**
- 99.9% uptime target
- Automatic retries on failures
- Graceful error handling
- Monitoring and alerting
- Backup and recovery

**Rationale:** Oracle downtime prevents price updates and halts platform operations.

### 3. Performance

**Requirements:**
- Update metrics within 1 hour of new contributions
- Handle 1000+ IPs efficiently
- Process millions of contributions
- Optimize database queries
- Implement caching

**Rationale:** Slow updates result in stale prices and poor user experience.

### 4. Security

**Requirements:**
- Verify all signatures
- Protect admin keys
- Validate all inputs
- Prevent injection attacks
- Audit all code

**Rationale:** Security breaches compromise the platform.

---

## Example Implementation Timeline

### Week 1: Setup & Walrus Integration
- Day 1-2: Environment setup, install dependencies
- Day 3-4: Implement Walrus query service
- Day 5: Test Walrus queries, verify data retrieval

### Week 2: Verification & Aggregation
- Day 1-2: Implement signature verification
- Day 3-4: Implement metrics aggregation
- Day 5: Test aggregation with sample data

### Week 3: Sui Integration
- Day 1-2: Set up Sui client, get testnet access
- Day 3-4: Implement on-chain update functions
- Day 5: Test end-to-end flow on testnet

### Week 4: Scheduler & Testing
- Day 1-2: Implement scheduler and automation
- Day 3-4: Comprehensive testing
- Day 5: Performance optimization

### Week 5: Production Readiness
- Day 1-2: Monitoring and alerting
- Day 3-4: Documentation and deployment
- Day 5: Final testing and launch

---

## Key Metrics to Track

### Service Health
- Uptime percentage
- Average response time
- Error rate
- Transaction success rate

### Data Quality
- Signature verification success rate
- Invalid contribution count
- Data completeness
- Metric accuracy

### Performance
- Queries per second
- Aggregation time
- Sui transaction time
- Cache hit rate

### Business Impact
- IP tokens updated
- Price updates triggered
- Contributors tracked
- Rewards enabled

---

## Common Pitfalls to Avoid

### Do Not Skip Signature Verification
**Rationale:** Invalid data will corrupt metrics and prices.

### Do Not Update Too Frequently
**Rationale:** Wastes gas and may hit rate limits.

### Do Not Update Too Rarely
**Rationale:** Prices become stale, resulting in poor user experience.

### Do Not Ignore Errors
**Rationale:** Silent failures lead to incorrect data.

### Do Not Process Everything from Scratch
**Rationale:** Too slow; use incremental updates.

### Do Not Forget to Cache
**Rationale:** Repeated queries waste resources.

---

## Support & Resources

### Smart Contract Documentation
- See `smartcontract/odx/README.md` for contract details
- See `smartcontract/odx/sources/oracle.move` for function signatures

### Walrus Documentation
- Walrus API/SDK documentation
- Query examples and best practices

### Sui Documentation
- Sui SDK: https://docs.sui.io/build/sui-typescript-sdk
- Transaction building: https://docs.sui.io/build/programming-with-objects/ch5-ownership

### Contact
- Smart contract developer: [Your contact]
- Project lead: [Your contact]
- Technical questions: [Your contact]

---

## Final Notes

**Key Points:**
- This service represents 70% of the project
- The service bridges Walrus and Sui
- Accuracy and reliability are critical
- Performance impacts user experience
- Security is non-negotiable

---

## Quick Start Command Reference

```bash
# Install dependencies
npm install @mysten/sui.js walrus-sdk

# Set environment variables
export SUI_NETWORK=testnet
export WALRUS_API_URL=https://api.walrus.com
export ORACLE_OBJECT_ID=0x...
export ADMIN_CAP_ID=0x...

# Run oracle service
npm start

# Run tests
npm test

# Run with monitoring
npm run start:monitored
```

---


