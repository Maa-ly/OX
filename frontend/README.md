# ODX Frontend - Next.js + Sui Integration

Next.js 14 frontend for ODX - Otaku Data Exchange platform with Sui blockchain integration.

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **@mysten/dapp-kit** - Sui wallet integration (latest)
- **@mysten/sui.js** - Sui TypeScript SDK
- **@tanstack/react-query** - Data fetching and caching
- **Axios** - HTTP client for backend API

## Prerequisites

- Node.js 18+ 
- pnpm installed globally: `npm install -g pnpm`

## Quick Start

### 1. Install Dependencies

```bash
cd frontend
pnpm install
```

### 2. Set Up Environment Variables

Create `.env.local` file in the `frontend/` directory:

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

### 3. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production

```bash
pnpm build
pnpm start
```

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx         # Root layout with providers
│   │   ├── page.tsx           # Home page
│   │   └── globals.css        # Global styles (dark theme)
│   ├── components/            # React components
│   │   ├── WalletProvider.tsx # Sui wallet provider
│   │   ├── Header.tsx         # Navigation header
│   │   ├── Hero.tsx           # Hero section
│   │   ├── FeaturedIPs.tsx    # Featured IP tokens
│   │   ├── Trending.tsx       # Trending section
│   │   └── RecentActivity.tsx # Activity feed
│   ├── lib/                   # Utilities
│   │   ├── sui.ts            # Sui client setup
│   │   └── api.ts            # Backend API client
│   └── constants.ts          # Constants and config
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.js
└── postcss.config.js
```

## Sui Integration

### Wallet Connection

The app uses `@mysten/dapp-kit` for wallet integration:

- Supports all Sui wallets (Suiet, Sui Wallet, etc.)
- Automatic wallet detection
- Connect button component included
- Network configuration via environment variables

### Smart Contract Interaction

Ready to interact with Move packages:

- Package ID configuration
- Oracle module integration
- Marketplace module integration
- Transaction building helpers

## Design Theme

Dark theme with red accents (matching streaming service design):

- **Background:** Black (#000000)
- **Cards:** Dark gray (#0f0f0f)
- **Primary:** Red (#dc2626)
- **Borders:** Dark gray (#2a2a2a)
- **Text:** White with gray variants

## Environment Variables

All environment variables must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser.

See `ENV_VARIABLES.md` for complete documentation.

## API Integration

The frontend connects to the backend API at `NEXT_PUBLIC_API_BASE_URL`:

- Contribution storage and retrieval
- Metrics aggregation
- Health checks
- Oracle operations

See `src/lib/api.ts` for API client implementation.

## Development

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

### Type Checking

```bash
npx tsc --noEmit
```

## Troubleshooting

### Dependencies Not Found

Run `pnpm install` to install all dependencies.

### TypeScript Errors

These are expected before running `pnpm install`. After installation, TypeScript will have access to all type definitions.

### Wallet Not Connecting

1. Check `NEXT_PUBLIC_SUI_NETWORK` matches your wallet network
2. Ensure wallet extension is installed
3. Check browser console for errors

### Environment Variables Not Loading

1. Ensure variables start with `NEXT_PUBLIC_`
2. Restart dev server after changing `.env.local`
3. Check file is named `.env.local` (not `.env`)

## Next Steps

1. Install dependencies: `pnpm install`
2. Set environment variables in `.env.local`
3. Deploy smart contracts and update object IDs
4. Start building features:
   - IP Token detail pages
   - Contribution modals
   - Marketplace
   - User dashboard

## Documentation

- [Frontend Design Guide](../FRONTEND_DESIGN_GUIDE.md) - Complete system flow
- [Environment Variables](ENV_VARIABLES.md) - Environment setup
- [Compilation Checklist](COMPILATION_CHECKLIST.md) - Verification steps

## References

- [Sui Frontend Guide](https://docs.sui.io/guides/developer/getting-started/app-frontends)
- [Next.js Documentation](https://nextjs.org/docs)
- [Sui dApp Kit](https://github.com/MystenLabs/sui/tree/main/sdk/dapp-kit)
