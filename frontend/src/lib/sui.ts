import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client'
import { SUI_RPC_URL } from '@/constants'

export const suiClient = new SuiClient({
  url: SUI_RPC_URL,
})

