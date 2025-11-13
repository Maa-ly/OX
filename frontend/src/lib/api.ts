import axios from 'axios'
import { API_BASE_URL } from '@/constants'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Contribution API
export const contributionAPI = {
  // Store a new contribution
  store: async (contribution: any) => {
    const response = await api.post('/api/oracle/contributions', contribution)
    return response.data
  },

  // Get contributions for an IP token
  getByIP: async (ipTokenId: string, options?: { type?: string; startTime?: number; endTime?: number }) => {
    const params = new URLSearchParams()
    if (options?.type) params.append('type', options.type)
    if (options?.startTime) params.append('startTime', options.startTime.toString())
    if (options?.endTime) params.append('endTime', options.endTime.toString())
    
    const response = await api.get(`/api/oracle/contributions/${ipTokenId}?${params.toString()}`)
    return response.data
  },

  // Verify a contribution
  verify: async (contribution: any) => {
    const response = await api.post('/api/oracle/verify', { contribution })
    return response.data
  },
}

// Metrics API
export const metricsAPI = {
  // Get aggregated metrics for an IP token
  getByIP: async (ipTokenId: string) => {
    const response = await api.get(`/api/oracle/metrics/${ipTokenId}`)
    return response.data
  },

  // Trigger on-chain update
  update: async (ipTokenId: string) => {
    const response = await api.post(`/api/oracle/update/${ipTokenId}`)
    return response.data
  },
}

// Health API
export const healthAPI = {
  check: async () => {
    const response = await api.get('/health')
    return response.data
  },
}

