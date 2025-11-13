# ODX Smart Contract Deployment

This document contains the deployment information for the ODX smart contract on Sui testnet.

## Current Status

✅ **Package Built Successfully** - The ODX smart contract has been compiled and is ready for deployment.

## Prerequisites

Before deploying, ensure you have:
1. ✅ Sui CLI installed and configured (Version: 1.60.0)
2. ✅ Sui testnet environment active: `sui client active-env` returns `testnet`
3. ⚠️ Active Sui address with testnet tokens: `sui client balance`
4. ✅ Package built: `sui move build` completed successfully

## Deployment Command

Run the following command to deploy the contract:

```bash
cd /home/odeili/project_career_build/mmaga/smartcontract/odx
sui client publish --gas-budget 100000000 --skip-fetch-latest-git-deps
```

**Note**: The `--skip-fetch-latest-git-deps` flag speeds up deployment by using cached dependencies.

## Deployment Process

1. **Build the package** (already completed):
   ```bash
   sui move build --skip-fetch-latest-git-deps
   ```

2. **Publish the package**:
   ```bash
   sui client publish --gas-budget 100000000 --skip-fetch-latest-git-deps
   ```
   
   This command will:
   - Prompt you to sign the transaction (enter your password if required)
   - Upload the bytecode to Sui testnet
   - Return the Package ID and transaction details

3. **Save the Package ID** from the output for all future interactions

## Important Notes

- The publish command requires you to sign the transaction, which may prompt for a password
- Save the **Package ID** from the output - it's required for all future contract interactions
- The deployment will consume SUI tokens as gas fees

## Expected Output Structure

After successful deployment, you should see output similar to:

```
Published Objects:
  ┌──
  │ PackageID: 0x...
  │ Version: 1
  │ Digest: ...
  │ Modules: datatypes, marketplace, odx, oracle, rewards, token
  └──
```

## Package Modules

The ODX package includes the following modules:
1. **datatypes** - Shared data structures
2. **token** - IP token creation and management
3. **marketplace** - Trading functionality
4. **rewards** - Contributor tracking and reward distribution
5. **oracle** - Price calculation based on engagement metrics
6. **odx** - Main library module

## Next Steps After Deployment

1. **Save the Package ID** - This is required for all future interactions with the contract
2. **Initialize Modules** - Call the `init()` function for each module that requires initialization:
   - Token module: Creates AdminCap and TokenRegistry
   - Marketplace: Creates Marketplace object
   - Rewards: Creates RewardsRegistry and RewardConfig
   - Oracle: Creates PriceOracle and OracleAdminCap

## Interacting with the Contract

Once deployed, you can interact with the contract using:

```bash
sui client call --package <PACKAGE_ID> --module <MODULE_NAME> --function <FUNCTION_NAME>
```

## Deployment Information

**Status**: ✅ Ready for deployment (package built successfully)
**Network**: Sui Testnet
**Active Address**: `0x6df2465c7b9a88e9769a625b3af0afbf41ab61d86183d85eb5fa5b7bd0549c71`

**Package ID**: _See CONTRACT_INFO.txt after deployment_
**Deployment Transaction**: _See CONTRACT_INFO.txt after deployment_

### Quick Save Deployment Info

After running the publish command, automatically extract and save all information:

```bash
# If you saved the output to a file:
./save_deployment_info.sh <output_file>

# Or if the output is in deployment_output.txt:
./save_deployment_info.sh

# Or paste the output directly:
./save_deployment_info.sh
# Then paste your publish output and press Ctrl+D
```

This will update `CONTRACT_INFO.txt` with all package details, addresses, and commands you need.

## Quick Deployment Script

You can also use the provided deployment script:

```bash
cd /home/odeili/project_career_build/mmaga/smartcontract/odx
./deploy_contract.sh
```

This script will:
1. Build the package
2. Check your configuration
3. Publish the contract
4. Extract and save the Package ID to `DEPLOYMENT_INFO.txt`

## After Deployment

Once you have the Package ID, update this file with:
- Package ID
- Transaction Digest
- Any created object IDs (AdminCap, TokenRegistry, Marketplace, etc.)

### Extract Package Information

If you have the publish output, use the extraction script:

```bash
./extract_package_info.sh <output_file>
```

This will automatically extract and save all deployment information to `DEPLOYMENT_INFO.txt`.

### Initialize Modules

After deployment, initialize each module by calling their `init()` functions:

1. **Token Module** (creates AdminCap and TokenRegistry):
   ```bash
   sui client call --package <PACKAGE_ID> --module token --function init --gas-budget 10000000
   ```

2. **Marketplace** (creates Marketplace object):
   ```bash
   sui client call --package <PACKAGE_ID> --module marketplace --function init --gas-budget 10000000
   ```

3. **Rewards Module** (creates RewardsRegistry and RewardConfig):
   ```bash
   sui client call --package <PACKAGE_ID> --module rewards --function init --gas-budget 10000000
   ```

4. **Oracle** (creates PriceOracle and OracleAdminCap):
   ```bash
   sui client call --package <PACKAGE_ID> --module oracle --function init --gas-budget 10000000
   ```

Save the object IDs returned from each init() call for future use.

