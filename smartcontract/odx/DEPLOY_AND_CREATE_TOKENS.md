# Deploy Contracts and Create Tokens

This guide will help you deploy the ODX smart contracts and create all 10 anime tokens.

## Prerequisites

1. **Sui CLI installed and configured**
   ```bash
   sui --version
   sui client active-env  # Should show 'testnet'
   ```

2. **Active address with testnet SUI tokens**
   ```bash
   sui client active-address
   sui client balance
   ```

3. **Node.js installed** (for token creation script)
   ```bash
   node --version
   npm --version
   ```

4. **Sui SDK installed** (if not already)
   ```bash
   cd /path/to/your/project
   npm install @mysten/sui
   ```

## Quick Start

### Option 1: Automated Script (Recommended)

1. **Set your private key** (required for token creation):
   ```bash
   export SUI_PRIVATE_KEY="your_base64_private_key"
   # OR
   export ADMIN_PRIVATE_KEY="your_base64_private_key"
   ```
   
   To get your private key:
   ```bash
   sui keytool export --key-identity <your-key-identity>
   ```

2. **Run the deployment script**:
   ```bash
   cd smartcontract/odx
   ./deploy_and_create_tokens.sh
   ```

   This will:
   - Build the contracts
   - Deploy to testnet
   - Extract Package ID, AdminCap ID, and TokenRegistry ID
   - Create all 10 anime tokens automatically

### Option 2: Manual Steps

1. **Deploy contracts**:
   ```bash
   cd smartcontract/odx
   sui move build --skip-fetch-latest-git-deps
   sui client publish --gas-budget 100000000 --skip-fetch-latest-git-deps
   ```

2. **Extract IDs from output**:
   - Package ID: Look for "PackageID" in the output
   - AdminCap ID: Look for "AdminCap" object ID
   - TokenRegistry ID: Look for "TokenRegistry" object ID

3. **Create tokens**:
   ```bash
   export SUI_PRIVATE_KEY="your_base64_private_key"
   node create_tokens.js <PACKAGE_ID> <ADMIN_CAP_ID> <TOKEN_REGISTRY_ID>
   ```

## Tokens to be Created

All tokens will have a reserve pool size of **5000**:

1. **One Piece** (OP)
2. **Naruto / Naruto Shippuden** (NRT)
3. **Bleach** (BCH)
4. **Dragon Ball / DBZ / Super** (DBZ)
5. **Attack on Titan** (AOT)
6. **My Hero Academia** (MHA)
7. **Demon Slayer (Kimetsu no Yaiba)** (DS)
8. **Jujutsu Kaisen** (JJK)
9. **Hunter x Hunter** (HxH)
10. **Fullmetal Alchemist: Brotherhood** (FMAB)

## After Deployment

After successful deployment, you'll have:

- **Package ID**: Used for all contract interactions
- **AdminCap ID**: Required for creating tokens (owned by deployer)
- **TokenRegistry ID**: Shared object tracking all tokens
- **10 IP Tokens**: One for each anime series

## Troubleshooting

### "Could not extract Package ID"
- Check the deployment output file: `deployment_*.txt`
- Manually extract the IDs and use Option 2

### "SUI_PRIVATE_KEY not set"
- Export your private key: `export SUI_PRIVATE_KEY="your_key"`
- Or use the backend API if you have it configured

### "Insufficient gas"
- Get more testnet SUI: `sui client faucet`
- Or increase gas budget in the script

### Token creation fails
- Check that AdminCap ID is correct
- Verify you have enough gas
- Check that reserve pool size (5000) is less than total supply (200,000)

## Next Steps

After deployment and token creation:

1. **Update environment variables** in your frontend/backend:
   - `NEXT_PUBLIC_PACKAGE_ID`
   - `NEXT_PUBLIC_ADMIN_CAP_ID`
   - `NEXT_PUBLIC_TOKEN_REGISTRY_ID`

2. **Initialize other modules** (if needed):
   - Marketplace
   - Rewards Registry
   - Oracle
   - Blob Storage

3. **Test token creation** via the frontend admin panel


