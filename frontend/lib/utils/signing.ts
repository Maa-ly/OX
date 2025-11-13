/**
 * Frontend utilities for signing contributions
 * These functions should run in the browser with user's wallet
 * 
 * Uses Suiet Wallet Kit - import useWallet from '@suiet/wallet-kit' in your component
 */

/**
 * Sign a contribution object with the user's wallet
 * This should be called from the frontend after user connects wallet
 * 
 * @param contribution - Contribution data to sign (without signature)
 * @param wallet - Wallet object from useWallet() hook from @suiet/wallet-kit
 * @returns Promise<string> - Signature string
 */
export async function signContribution(
  contribution: Record<string, any>,
  wallet: { signPersonalMessage: (params: { message: Uint8Array }) => Promise<{ signature: string }> }
): Promise<string> {
  // Remove any existing signature and walrus_cid (added after signing)
  const dataToSign = { ...contribution };
  delete dataToSign.signature;
  delete dataToSign.walrus_cid;

  // Convert to JSON string and then to bytes
  const message = JSON.stringify(dataToSign);
  const messageBytes = new TextEncoder().encode(message);

  // Sign with wallet using Suiet Wallet Kit
  const result = await wallet.signPersonalMessage({
    message: messageBytes,
  });
  return result.signature;
}

/**
 * Create a contribution object ready for signing
 * 
 * @param params - Contribution parameters
 * @returns Contribution object without signature
 */
export function createContribution(params: {
  ip_token_id: string;
  engagement_type: 'rating' | 'meme' | 'prediction' | 'review' | 'vote' | 'stake';
  user_wallet: string;
  rating?: number;
  prediction?: string;
  content_cid?: string;
  caption?: string;
  review?: string;
  stake?: number;
  timestamp?: number;
}): Record<string, any> {
  const contribution: Record<string, any> = {
    ip_token_id: params.ip_token_id,
    engagement_type: params.engagement_type,
    user_wallet: params.user_wallet,
    timestamp: params.timestamp || Date.now(),
  };

  // Add type-specific fields
  if (params.rating !== undefined) {
    contribution.rating = params.rating;
  }
  if (params.prediction) {
    contribution.prediction = params.prediction;
  }
  if (params.content_cid) {
    contribution.content_cid = params.content_cid;
  }
  if (params.caption) {
    contribution.caption = params.caption;
  }
  if (params.review) {
    contribution.review = params.review;
  }
  if (params.stake !== undefined) {
    contribution.stake = params.stake;
  }

  return contribution;
}

