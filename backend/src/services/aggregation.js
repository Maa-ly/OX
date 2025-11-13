import { logger } from '../utils/logger.js';

export class AggregationService {
  /**
   * Aggregate metrics from contributions
   * @param {Array} contributions - Array of verified contributions
   * @returns {Object} Aggregated metrics
   */
  aggregateMetrics(contributions) {
    logger.info(`Aggregating metrics from ${contributions.length} contributions`);

    const metrics = {
      // Basic metrics
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

