'use client'

import { SuiClientProvider, WalletProvider as DappKitWalletProvider } from '@mysten/dapp-kit'
import { getFullnodeUrl } from '@mysten/sui.js/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { SUI_NETWORK } from '@/constants'

const network = SUI_NETWORK as 'testnet' | 'mainnet' | 'devnet' | 'localnet'

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider
        networks={{
          [network]: {
            url: getFullnodeUrl(network),
          },
        }}
        defaultNetwork={network}
      >
        <DappKitWalletProvider
          features={['sui:signAndExecuteTransactionBlock', 'sui:signMessage']}
          enableUnsafeBurner={network === 'testnet' || network === 'devnet'}
        >
          {children}
        </DappKitWalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  )
}

