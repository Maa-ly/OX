# Fixing InsufficientGas Error

## Problem
You're getting `InsufficientGas` error even though you have 2.99 SUI. This happens when the gas budget is too low for the actual transaction cost.

## Solution 1: Increase Gas Budget

Try with a higher gas budget:

```bash
# Try with 0.2 SUI (200 million MIST)
sui client publish --gas-budget 200000000 --skip-fetch-latest-git-deps --verify-deps

# Or even higher if needed
sui client publish --gas-budget 500000000 --skip-fetch-latest-git-deps --verify-deps
```

## Solution 2: Let Sui Auto-Calculate Gas

Remove the gas budget flag and let Sui calculate it automatically:

```bash
sui client publish --skip-fetch-latest-git-deps --verify-deps
```

## Solution 3: Use Gas Object Explicitly

If you have multiple gas objects, specify one:

```bash
# First, check your gas objects
sui client gas

# Then use a specific gas object
sui client publish --gas-budget 200000000 --gas <GAS_OBJECT_ID> --skip-fetch-latest-git-deps --verify-deps
```

## Solution 4: Merge Gas Coins

If you have multiple small gas coins, merge them:

```bash
# Check your gas objects
sui client gas

# Merge gas coins (if you have multiple)
sui client merge-coin --primary-coin <COIN1_ID> --coin-to-merge <COIN2_ID> --gas-budget 10000000
```

## Recommended Command

Try this first (higher gas budget):

```bash
cd /home/odeili/project_career_build/mmaga/smartcontract/odx
sui client publish --gas-budget 200000000 --skip-fetch-latest-git-deps --verify-deps 2>&1 | tee publish_output.txt
```

If that still fails, try without gas budget (let Sui auto-calculate):

```bash
sui client publish --skip-fetch-latest-git-deps --verify-deps 2>&1 | tee publish_output.txt
```

## Understanding Gas Budget

- `100000000` MIST = 0.1 SUI
- `200000000` MIST = 0.2 SUI  
- `500000000` MIST = 0.5 SUI

Publishing a contract with 6 modules can require more gas than 0.1 SUI, especially with verification enabled.

## After Successful Publish

Once it works, save the output:

```bash
./save_deployment_info.sh publish_output.txt
```

