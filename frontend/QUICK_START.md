# Quick Start Guide

## Installation

```bash
cd frontend
pnpm install
```

## Environment Setup

Create `.env.local` file:

```env
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_PACKAGE_ID=0x0000000000000000000000000000000000000000000000000000000000000000
NEXT_PUBLIC_ORACLE_OBJECT_ID=0x0000000000000000000000000000000000000000000000000000000000000000
NEXT_PUBLIC_MARKETPLACE_OBJECT_ID=0x0000000000000000000000000000000000000000000000000000000000000000
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

## Run Development Server

```bash
pnpm dev
```

Open http://localhost:3000

## Build for Production

```bash
pnpm build
pnpm start
```

## Verify Compilation

```bash
# Type check
npx tsc --noEmit

# Build check
pnpm build
```

