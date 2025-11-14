import { logger } from '../utils/logger.js';

export class AggregationService {
  /**
   * Aggregate metrics from contributions (Walrus data)
   * @param {Array} contributions - Array of verified contributions
   * @returns {Object} Aggregated metrics from user contributions
   */
  aggregateMetrics(contributions) {
    logger.info(`Aggregating metrics from ${contributions.length} contributions`);

    const metrics = {
      // Basic metrics (from Walrus - user contributions)
      average_rating: this.calculateAverageRating(contributions),
      total_contributors: this.countUniqueContributors(contributions),
      total_engagements: contributions.length,

      // Contribution type breakdowns
      rating_count: this.countByType(contributions, 'rating'),
      meme_count: this.countByType(contributions, 'meme'),
      post_count: this.countByType(contributions, 'post'),
      episode_prediction_count: this.countByType(contributions, 'episode_prediction'),
      price_prediction_count: this.countByType(contributions, 'price_prediction'),
      stake_count: this.countByType(contributions, 'stake'),

      // Engagement quality metrics
      viral_content_score: this.calculateViralScore(contributions),
      prediction_accuracy: 0, // TODO: Calculate prediction accuracy
      total_stake_volume: this.sumStakes(contributions),

      // Growth metrics
      growth_rate: this.calculateGrowthRate(contributions),
      engagement_velocity: this.calculateVelocity(contributions),
      new_contributors_this_week: this.countNewContributors(contributions),

      // Timestamps
      last_updated: Date.now(),
    };

    logger.debug('Aggregated metrics:', metrics);
    return metrics;
  }

  /**
   * Combine Walrus (user) metrics with Nautilus (external) metrics
   * Creates comprehensive metrics that reflect both community engagement and external truth
   * 
   * @param {Object} walrusMetrics - Metrics from user contributions (Walrus)
   * @param {Array} nautilusMetrics - Array of signed metrics from external sources (Nautilus)
   * @returns {Object} Combined metrics
   */
  combineMetrics(walrusMetrics, nautilusMetrics = []) {
    logger.info(`Combining Walrus metrics with ${nautilusMetrics.length} Nautilus source(s)`);

    // Aggregate external metrics from multiple sources
    const externalMetrics = this.aggregateExternalMetrics(nautilusMetrics);

    // Combine user and external metrics
    const combined = {
      // User metrics (from Walrus)
      user_average_rating: walrusMetrics.average_rating || 0,
      user_total_contributors: walrusMetrics.total_contributors || 0,
      user_total_engagements: walrusMetrics.total_engagements || 0,
      user_growth_rate: walrusMetrics.growth_rate || 0,
      user_viral_score: walrusMetrics.viral_content_score || 0,
      user_prediction_accuracy: walrusMetrics.prediction_accuracy || 0,

      // External metrics (from Nautilus)
      external_average_rating: externalMetrics.average_rating || 0,
      external_popularity_score: externalMetrics.popularity_score || 0,
      external_member_count: externalMetrics.member_count || 0,
      external_trending_score: externalMetrics.trending_score || 0,
      external_sources_count: nautilusMetrics.length,

      // Combined metrics (weighted average)
      combined_rating: this.combineRatings(
        walrusMetrics.average_rating,
        externalMetrics.average_rating,
        0.6, // 60% weight on user data, 40% on external
      ),
      combined_popularity: this.combinePopularity(
        walrusMetrics.total_engagements,
        externalMetrics.popularity_score,
        0.6,
      ),
      combined_growth_rate: this.combineGrowthRates(
        walrusMetrics.growth_rate,
        externalMetrics.trending_score,
        0.6,
      ),

      // Verification data
      nautilus_signatures: nautilusMetrics.map((m) => ({
        source: m.source,
        signature: m.signature,
        timestamp: m.timestamp,
      })),
      walrus_verified: true,
      nautilus_verified: nautilusMetrics.length > 0,

      // Timestamps
      last_updated: Date.now(),
    };

    logger.debug('Combined metrics:', combined);
    return combined;
  }

  /**
   * Aggregate metrics from multiple Nautilus sources
   * @param {Array} nautilusMetrics - Array of signed metrics from different sources
   * @returns {Object} Aggregated external metrics
   */
  aggregateExternalMetrics(nautilusMetrics) {
    if (nautilusMetrics.length === 0) {
      return {
        average_rating: 0,
        popularity_score: 0,
        member_count: 0,
        trending_score: 0,
      };
    }

    // Average ratings from all sources
    const ratings = nautilusMetrics
      .map((m) => m.metrics?.average_rating || m.metrics?.rating || 0)
      .filter((r) => r > 0);

    const averageRating = ratings.length > 0
      ? Math.floor(ratings.reduce((a, b) => a + b, 0) / ratings.length)
      : 0;

    // Sum popularity scores
    const popularityScores = nautilusMetrics
      .map((m) => m.metrics?.popularity_score || m.metrics?.popularity || 0)
      .filter((p) => p > 0);

    const popularityScore = popularityScores.length > 0
      ? Math.floor(popularityScores.reduce((a, b) => a + b, 0) / popularityScores.length)
      : 0;

    // Sum member counts
    const memberCount = nautilusMetrics.reduce(
      (sum, m) => sum + (m.metrics?.member_count || m.metrics?.members || 0),
      0
    );

    // Average trending scores
    const trendingScores = nautilusMetrics
      .map((m) => m.metrics?.trending_score || m.metrics?.trending || 0)
      .filter((t) => t > 0);

    const trendingScore = trendingScores.length > 0
      ? Math.floor(trendingScores.reduce((a, b) => a + b, 0) / trendingScores.length)
      : 0;

    return {
      average_rating: averageRating,
      popularity_score: popularityScore,
      member_count: memberCount,
      trending_score: trendingScore,
    };
  }

  /**
   * Combine user and external ratings with weights
   * @param {number} userRating - User average rating (scaled by 100)
   * @param {number} externalRating - External average rating (scaled by 100)
   * @param {number} userWeight - Weight for user data (0-1)
   * @returns {number} Combined rating (scaled by 100)
   */
  combineRatings(userRating, externalRating, userWeight = 0.6) {
    if (userRating === 0 && externalRating === 0) return 0;
    if (userRating === 0) return externalRating;
    if (externalRating === 0) return userRating;

    const combined = (userRating * userWeight) + (externalRating * (1 - userWeight));
    return Math.floor(combined);
  }

  /**
   * Combine user engagement with external popularity
   * @param {number} userEngagements - Total user engagements
   * @param {number} externalPopularity - External popularity score
   * @param {number} userWeight - Weight for user data
   * @returns {number} Combined popularity score
   */
  combinePopularity(userEngagements, externalPopularity, userWeight = 0.6) {
    // Normalize user engagements to 0-10000 scale (assuming max 100k engagements)
    const normalizedUser = Math.min((userEngagements / 100000) * 10000, 10000);
    
    if (normalizedUser === 0 && externalPopularity === 0) return 0;
    if (normalizedUser === 0) return externalPopularity;
    if (externalPopularity === 0) return normalizedUser;

    const combined = (normalizedUser * userWeight) + (externalPopularity * (1 - userWeight));
    return Math.floor(combined);
  }

  /**
   * Combine user growth rate with external trending
   * @param {number} userGrowthRate - User growth rate (scaled by 100)
   * @param {number} externalTrending - External trending score
   * @param {number} userWeight - Weight for user data
   * @returns {number} Combined growth rate (scaled by 100)
   */
  combineGrowthRates(userGrowthRate, externalTrending, userWeight = 0.6) {
    // Normalize external trending to growth rate scale
    const normalizedExternal = Math.min((externalTrending / 100) * 10000, 10000);
    
    if (userGrowthRate === 0 && normalizedExternal === 0) return 0;
    if (userGrowthRate === 0) return normalizedExternal;
    if (normalizedExternal === 0) return userGrowthRate;

    const combined = (userGrowthRate * userWeight) + (normalizedExternal * (1 - userWeight));
    return Math.floor(combined);
  }

  /**
   * Calculate average rating (scaled by 100)
   */
  calculateAverageRating(contributions) {
    const ratings = contributions
      .filter((c) => c.engagement_type === 'rating' && c.rating !== undefined)
      .map((c) => c.rating);

    if (ratings.length === 0) return 0;

    const sum = ratings.reduce((a, b) => a + b, 0);
    const average = (sum / ratings.length) * 100; // Scale by 100
    return Math.floor(average);
  }

  /**
   * Count unique contributors
   */
  countUniqueContributors(contributions) {
    const uniqueWallets = new Set(
      contributions.map((c) => c.user_wallet).filter(Boolean)
    );
    return uniqueWallets.size;
  }

  /**
   * Count contributions by type
   */
  countByType(contributions, type) {
    return contributions.filter((c) => c.engagement_type === type).length;
  }

  /**
   * Calculate growth rate (percentage scaled by 100)
   */
  calculateGrowthRate(contributions) {
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

    const thisWeek = contributions.filter(
      (c) => c.timestamp >= oneWeekAgo && c.timestamp < now
    ).length;

    const lastWeek = contributions.filter(
      (c) => c.timestamp >= twoWeeksAgo && c.timestamp < oneWeekAgo
    ).length;

    if (lastWeek === 0) return thisWeek > 0 ? 10000 : 0; // 100% growth or 0%

    const growth = ((thisWeek - lastWeek) / lastWeek) * 100;
    return Math.floor(growth * 100); // Scale by 100 (e.g., 25% = 2500)
  }

  /**
   * Calculate viral content score
   */
  calculateViralScore(contributions) {
    const memesAndPosts = contributions.filter(
      (c) => c.engagement_type === 'meme' || c.engagement_type === 'post'
    );

    const totalEngagement = memesAndPosts.reduce(
      (sum, c) => sum + (c.engagement_count || 0),
      0
    );

    // Normalize to 0-10000 scale
    const score = Math.min(totalEngagement / 10, 10000);
    return Math.floor(score);
  }

  /**
   * Sum all stakes
   */
  sumStakes(contributions) {
    return contributions.reduce((sum, c) => {
      const stake = c.stake_amount || 0;
      return sum + stake;
    }, 0);
  }

  /**
   * Calculate engagement velocity (contributions per day)
   */
  calculateVelocity(contributions) {
    if (contributions.length === 0) return 0;

    const timestamps = contributions
      .map((c) => c.timestamp)
      .filter(Boolean)
      .sort((a, b) => a - b);

    if (timestamps.length < 2) return contributions.length;

    const timeSpan = timestamps[timestamps.length - 1] - timestamps[0];
    const days = timeSpan / (24 * 60 * 60 * 1000);

    return days > 0 ? Math.floor(contributions.length / days) : contributions.length;
  }

  /**
   * Count new contributors this week
   */
  countNewContributors(contributions) {
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const thisWeekContributions = contributions.filter(
      (c) => c.timestamp >= oneWeekAgo && c.timestamp < now
    );

    const uniqueWallets = new Set(
      thisWeekContributions.map((c) => c.user_wallet).filter(Boolean)
    );

    return uniqueWallets.size;
  }
}

