# Frontend Environment Variables

## Required Environment Variables

All environment variables for Next.js must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser.

### Sui Network Configuration

```env
# Sui Network (testnet, mainnet, devnet, localnet)
NEXT_PUBLIC_SUI_NETWORK=testnet
```

**Default:** `testnet`  
**Options:** `testnet`, `mainnet`, `devnet`, `localnet`  
**Used in:** `src/constants.ts`, `src/components/WalletProvider.tsx`

---

### Smart Contract Configuration

These are set after deploying your smart contracts to Sui.

```env
# Move Package ID
# Get this after deploying your Move package
NEXT_PUBLIC_PACKAGE_ID=0x0000000000000000000000000000000000000000000000000000000000000000

# Oracle Object ID
# Get this after initializing the Oracle module
NEXT_PUBLIC_ORACLE_OBJECT_ID=0x0000000000000000000000000000000000000000000000000000000000000000

# Marketplace Object ID
# Get this after initializing the Marketplace module
NEXT_PUBLIC_MARKETPLACE_OBJECT_ID=0x0000000000000000000000000000000000000000000000000000000000000000
```

**Default:** All zeros (placeholder)  
**Used in:** `src/constants.ts`  
**Note:** These will be actual object IDs after smart contract deployment

---

### Backend API Configuration

```env
# Backend API Base URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

**Default:** `http://localhost:3000`  
**Used in:** `src/constants.ts`, `src/lib/api.ts`  
**Note:** Change this to your production backend URL when deploying

---

## Complete .env.local Example

Create a `.env.local` file in the `frontend/` directory:

```env
# Sui Network
NEXT_PUBLIC_SUI_NETWORK=testnet

# Smart Contract IDs (set after deployment)
NEXT_PUBLIC_PACKAGE_ID=0x0000000000000000000000000000000000000000000000000000000000000000
NEXT_PUBLIC_ORACLE_OBJECT_ID=0x0000000000000000000000000000000000000000000000000000000000000000
NEXT_PUBLIC_MARKETPLACE_OBJECT_ID=0x0000000000000000000000000000000000000000000000000000000000000000

# Backend API
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

---

## Environment-Specific Examples

### Development (Local)

```env
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_PACKAGE_ID=0x...
NEXT_PUBLIC_ORACLE_OBJECT_ID=0x...
NEXT_PUBLIC_MARKETPLACE_OBJECT_ID=0x...
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

### Production (Testnet)

```env
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_PACKAGE_ID=0x...
NEXT_PUBLIC_ORACLE_OBJECT_ID=0x...
NEXT_PUBLIC_MARKETPLACE_OBJECT_ID=0x...
NEXT_PUBLIC_API_BASE_URL=https://api.odx.example.com
```

### Production (Mainnet)

```env
NEXT_PUBLIC_SUI_NETWORK=mainnet
NEXT_PUBLIC_PACKAGE_ID=0x...
NEXT_PUBLIC_ORACLE_OBJECT_ID=0x...
NEXT_PUBLIC_MARKETPLACE_OBJECT_ID=0x...
NEXT_PUBLIC_API_BASE_URL=https://api.odx.example.com
```

---

## How to Get Smart Contract IDs

### 1. Package ID

After deploying your Move package:

```bash
sui client publish --gas-budget 100000000
```

The output will show:
```
Published Objects:
  PackageID: 0x1234567890abcdef...
```

Copy this value to `NEXT_PUBLIC_PACKAGE_ID`.

### 2. Oracle Object ID

After calling the `init` function for the Oracle module:

```bash
sui client call --package <PACKAGE_ID> --module oracle --function init --gas-budget 100000000
```

The output will show the created object ID. Copy this to `NEXT_PUBLIC_ORACLE_OBJECT_ID`.

### 3. Marketplace Object ID

After calling the `init` function for the Marketplace module:

```bash
sui client call --package <PACKAGE_ID> --module marketplace --function init --gas-budget 100000000
```

The output will show the created object ID. Copy this to `NEXT_PUBLIC_MARKETPLACE_OBJECT_ID`.

---

## Usage in Code

### Accessing Environment Variables

In Next.js, environment variables prefixed with `NEXT_PUBLIC_` are available in the browser:

```typescript
// In constants.ts
export const SUI_NETWORK = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet'
export const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '0x...'
```

### Type Safety

The constants are defined in `src/constants.ts` and used throughout the app:

```typescript
import { PACKAGE_ID, ORACLE_OBJECT_ID } from '@/constants'
```

---

## Security Notes

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Only `NEXT_PUBLIC_*` variables** are exposed to the browser
3. **Private keys should NEVER** be in frontend environment variables
4. **Smart contract IDs are public** - It's safe to expose them

---

## Verification

After setting up your `.env.local` file, verify the values are loaded:

1. Start the dev server: `pnpm dev`
2. Check the browser console for any errors
3. The wallet connection should work with the specified network
4. API calls should go to the correct backend URL

---

## Troubleshooting

### Variables not loading?

1. Make sure the file is named `.env.local` (not `.env`)
2. Restart the Next.js dev server after changing variables
3. Check that variables start with `NEXT_PUBLIC_`
4. Verify the file is in the `frontend/` directory (same level as `package.json`)

### Wrong network?

- Check `NEXT_PUBLIC_SUI_NETWORK` matches your wallet network
- Make sure your wallet is connected to the same network

### API calls failing?

- Verify `NEXT_PUBLIC_API_BASE_URL` is correct
- Check that the backend is running
- Ensure CORS is configured on the backend

