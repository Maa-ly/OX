# Frontend Compilation Checklist

## Prerequisites

1. **Node.js 18+** installed
2. **pnpm** installed globally
3. **Environment variables** set up

## Installation Steps

### 1. Install Dependencies

```bash
cd frontend
pnpm install
```

This will install:
- Next.js 14
- React 18
- @mysten/dapp-kit (Sui wallet integration)
- @mysten/sui.js (Sui SDK)
- @tanstack/react-query (required by dapp-kit)
- Tailwind CSS
- TypeScript
- All other dependencies

### 2. Set Up Environment Variables

Create `.env.local` file in `frontend/` directory:

```env
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_PACKAGE_ID=0x0000000000000000000000000000000000000000000000000000000000000000
NEXT_PUBLIC_ORACLE_OBJECT_ID=0x0000000000000000000000000000000000000000000000000000000000000000
NEXT_PUBLIC_MARKETPLACE_OBJECT_ID=0x0000000000000000000000000000000000000000000000000000000000000000
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

### 3. Verify File Structure

Ensure these files exist:

```
frontend/
├── package.json ✅
├── tsconfig.json ✅
├── next.config.js ✅
├── tailwind.config.js ✅
├── postcss.config.js ✅
├── .eslintrc.json ✅
├── .gitignore ✅
├── next-env.d.ts ✅
└── src/
    ├── app/
    │   ├── layout.tsx ✅
    │   ├── page.tsx ✅
    │   └── globals.css ✅
    ├── components/
    │   ├── WalletProvider.tsx ✅
    │   ├── Header.tsx ✅
    │   ├── Hero.tsx ✅
    │   ├── FeaturedIPs.tsx ✅
    │   ├── Trending.tsx ✅
    │   └── RecentActivity.tsx ✅
    ├── lib/
    │   ├── sui.ts ✅
    │   └── api.ts ✅
    └── constants.ts ✅
```

### 4. Compile and Run

```bash
# Development mode
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## Sui Compatibility

### Verified Components

✅ **Wallet Integration**
- Uses `@mysten/dapp-kit` (latest recommended package)
- Properly configured with `SuiClientProvider` and `WalletProvider`
- Supports all Sui wallet features

✅ **Network Configuration**
- Configurable via `NEXT_PUBLIC_SUI_NETWORK`
- Supports testnet, mainnet, devnet, localnet
- Uses official Sui RPC URLs

✅ **TypeScript Support**
- Full TypeScript configuration
- Type-safe Sui SDK usage
- Proper type definitions

✅ **Next.js 14 Compatibility**
- Uses App Router (latest Next.js pattern)
- Client components properly marked with 'use client'
- Server components for static content

## Common Issues and Fixes

### Issue: Module not found errors

**Fix:** Run `pnpm install` again to ensure all dependencies are installed.

### Issue: TypeScript errors

**Fix:** 
1. Check `tsconfig.json` paths are correct
2. Ensure `@types/*` packages are installed
3. Restart TypeScript server in your IDE

### Issue: Tailwind CSS not working

**Fix:**
1. Verify `tailwind.config.js` content paths are correct
2. Check `postcss.config.js` exists
3. Ensure `globals.css` imports Tailwind directives

### Issue: Wallet connection not working

**Fix:**
1. Check `NEXT_PUBLIC_SUI_NETWORK` matches your wallet network
2. Verify wallet extension is installed
3. Check browser console for errors

### Issue: Environment variables not loading

**Fix:**
1. Ensure variables start with `NEXT_PUBLIC_`
2. Restart dev server after changing `.env.local`
3. Check file is named `.env.local` (not `.env`)

## Verification Commands

```bash
# Check TypeScript compilation
npx tsc --noEmit

# Check Next.js build
pnpm build

# Check linting
pnpm lint

# Run development server
pnpm dev
```

## Expected Output

When running `pnpm dev`, you should see:

```
  ▲ Next.js 14.0.4
  - Local:        http://localhost:3000
  - Ready in Xs
```

The app should:
- Load without errors
- Display the home page
- Show wallet connect button
- Have dark theme with red accents

## Success Criteria

✅ No compilation errors
✅ No TypeScript errors
✅ No missing dependencies
✅ Wallet provider loads correctly
✅ All components render
✅ Tailwind CSS styles apply
✅ Environment variables load

