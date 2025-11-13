/**
 * Frontend utilities for interacting with Walrus storage
 * These functions handle client-side operations before sending to backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Store a contribution on Walrus via backend API
 * 
 * @param contribution - Signed contribution object
 * @returns Promise with stored contribution including blob ID
 */
export async function storeContribution(contribution: Record<string, any>) {
  const response = await fetch(`${API_BASE_URL}/api/oracle/contributions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(contribution),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to store contribution: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get contributions for an IP token
 * 
 * @param ipTokenId - IP token ID
 * @param options - Query options
 * @returns Promise with contributions array
 */
export async function getContributions(
  ipTokenId: string,
  options?: {
    type?: string;
    startTime?: number;
    endTime?: number;
  }
) {
  const params = new URLSearchParams();
  if (options?.type) params.append('type', options.type);
  if (options?.startTime) params.append('startTime', options.startTime.toString());
  if (options?.endTime) params.append('endTime', options.endTime.toString());

  const url = `${API_BASE_URL}/api/oracle/contributions/${ipTokenId}${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch contributions: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get aggregated metrics for an IP token
 * 
 * @param ipTokenId - IP token ID
 * @returns Promise with metrics object
 */
export async function getMetrics(ipTokenId: string) {
  const response = await fetch(`${API_BASE_URL}/api/oracle/metrics/${ipTokenId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch metrics: ${response.statusText}`);
  }

  return response.json();
}

