# ODX Frontend Architecture

## Wallet Interactions & Contract Calls

### Overview

The ODX frontend supports two approaches for interacting with smart contracts:

1. **Backend API (Server-side signing)**: Uses admin keypair stored on backend
2. **Frontend Wallet (Client-side signing)**: Uses user's connected wallet

### When to Use Each Approach

#### Backend API (`/api/contract/*`)
- **Use for**: Admin operations that need to run server-side
- **Pros**: No wallet popup, automated operations, secure keypair storage
- **Cons**: Requires admin keypair configuration, not user-controlled
- **Example**: Automated oracle updates, batch token creation

#### Frontend Wallet (`lib/utils/contract.ts`)
- **Use for**: User-initiated operations that require wallet signatures
- **Pros**: User controls their wallet, transparent transactions, wallet popups
- **Cons**: Requires wallet connection, user must approve each transaction
- **Example**: Creating buy/sell orders, user contributions

### IP Token Creation Flow

#### Option 1: Backend API (Current Implementation)
```typescript
// Backend uses admin keypair
POST /api/contract/tokens
{
  "name": "Chainsaw Man",
  "symbol": "CSM",
  ...
}
```

**Flow:**
1. Frontend sends request to backend
2. Backend uses `ADMIN_PRIVATE_KEY` to sign transaction
3. Backend submits transaction to Sui
4. Returns transaction digest and token ID

**Use Case**: Automated token creation, admin dashboard operations

#### Option 2: Frontend Wallet (New Implementation)
```typescript
// Frontend uses connected wallet
import { createIPToken } from '@/lib/utils/contract';
import { useWallet } from '@suiet/wallet-kit';

const wallet = useWallet();
const result = await createIPToken({
  name: "Chainsaw Man",
  symbol: "CSM",
  ...
}, wallet);
```

**Flow:**
1. User connects wallet (Suiet Wallet Kit)
2. Frontend builds transaction
3. Wallet popup appears for user to sign
4. User approves transaction
5. Transaction submitted to Sui
6. Returns transaction digest and token ID

**Use Case**: Admin manually creating tokens via frontend, user-controlled operations

### Important Notes

⚠️ **IP Token Creation is ADMIN ONLY**
- The smart contract requires `AdminCap` to create tokens
- Only the admin wallet can successfully create tokens
- Regular users will get a transaction error if they try

### File Structure

```
frontend/lib/utils/
├── contract.ts          # Write operations (requires wallet)
├── contract-read.ts     # Read operations (no wallet needed)
├── signing.ts           # Contribution signing utilities
├── sui.ts              # Sui client utilities
└── constants.ts        # Contract addresses and constants
```

### Example Usage

#### Creating a Token (Frontend Wallet)
```typescript
'use client';

import { useWallet } from '@suiet/wallet-kit';
import { createIPToken } from '@/lib/utils/contract';

export default function CreateTokenPage() {
  const wallet = useWallet();

  const handleCreateToken = async () => {
    if (!wallet.connected) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      // This will trigger a wallet popup
      const result = await createIPToken({
        name: "Chainsaw Man",
        symbol: "CSM",
        description: "A young man who merges with a dog-like devil",
        category: 0, // 0=anime, 1=manga, 2=manhwa
        reservePoolSize: 50000,
      }, wallet);

      console.log('Token created!', result.tokenId);
      alert(`Token created successfully! ID: ${result.tokenId}`);
    } catch (error) {
      console.error('Failed to create token:', error);
      alert('Failed to create token. Make sure you have AdminCap.');
    }
  };

  return (
    <button onClick={handleCreateToken} disabled={!wallet.connected}>
      Create IP Token
    </button>
  );
}
```

#### Reading Token Info (No Wallet)
```typescript
import { getTokenInfo, getAllTokenIds } from '@/lib/utils/contract-read';

// No wallet needed - read-only operation
const tokenInfo = await getTokenInfo('0xabc123...');
const allTokens = await getAllTokenIds();
```

#### Creating Buy Order (Frontend Wallet)
```typescript
import { useWallet } from '@suiet/wallet-kit';
import { createBuyOrder } from '@/lib/utils/contract';

const wallet = useWallet();

// This will trigger wallet popup
const result = await createBuyOrder({
  ipTokenId: '0xabc123...',
  price: 1500000000, // 1.5 SUI (scaled by 1e9)
  quantity: 100,
  paymentCoinId: '0xdef456...', // Coin object ID
}, wallet);
```

### Wallet Connection

All write operations require wallet connection:

```typescript
import { useWallet } from '@suiet/wallet-kit';

const wallet = useWallet();

if (!wallet.connected) {
  // Show connect button
  return <ConnectButton />;
}

// Wallet is connected, can perform operations
const result = await createIPToken(params, wallet);
```

### Error Handling

```typescript
try {
  const result = await createIPToken(params, wallet);
} catch (error) {
  if (error.message.includes('AdminCap')) {
    alert('Only admin can create tokens');
  } else if (error.message.includes('user rejected')) {
    alert('Transaction was cancelled');
  } else {
    alert(`Error: ${error.message}`);
  }
}
```

### Security Considerations

1. **Admin Operations**: AdminCap and OracleAdminCap should be carefully managed
2. **Wallet Security**: Users should never share their private keys
3. **Transaction Verification**: Always verify transaction details in wallet popup
4. **Error Messages**: Don't expose sensitive information in error messages

### Testing

To test frontend wallet interactions:
1. Connect a wallet with admin privileges (has AdminCap)
2. Try creating a token - should see wallet popup
3. Approve transaction - should succeed
4. Try with non-admin wallet - should fail with clear error

