# Publish and Verify ODX Smart Contract

## Step 1: Publish the Contract

Run the publish command:

```bash
cd /home/odeili/project_career_build/mmaga/smartcontract/odx
sui client publish --gas-budget 100000000 --skip-fetch-latest-git-deps
```

**What happens:**
- You'll be prompted to sign the transaction (enter your password)
- The contract will be uploaded to Sui testnet
- You'll receive a Package ID and Transaction Digest

**Save the output!** You'll need:
- Package ID (starts with `0x...`)
- Transaction Digest

## Step 2: Verify the Published Contract

### Option A: Verify During Publish (Recommended)

Add the `--verify-deps` flag to verify dependencies during publication:

```bash
sui client publish --gas-budget 100000000 --skip-fetch-latest-git-deps --verify-deps
```

### Option B: Verify After Publish

After publishing, you can verify the package:

```bash
# Verify the package
sui client verify-source <PACKAGE_ID>
```

Or verify a specific transaction:

```bash
# Verify by transaction digest
sui client verify-source --transaction <TRANSACTION_DIGEST>
```

### Option C: View on Sui Explorer (Visual Verification)

1. Get your transaction digest from the publish output
2. Visit: `https://suiexplorer.com/transaction/<TRANSACTION_DIGEST>?network=testnet`
3. You'll see:
   - Package details
   - All modules
   - Source code verification status
   - Transaction details

## Step 3: Save All Information

After publishing, extract and save all details:

```bash
# Save the publish output to a file first
sui client publish --gas-budget 100000000 --skip-fetch-latest-git-deps > publish_output.txt 2>&1

# Then extract the information
./save_deployment_info.sh publish_output.txt
```

This will update `CONTRACT_INFO.txt` with:
- Package ID
- Transaction Digest
- All module information
- Verification links

## Step 4: Verify Package on Sui Explorer

1. Go to: https://suiexplorer.com/?network=testnet
2. Search for your Package ID or Transaction Digest
3. Click on the package to see:
   - ✅ Source code
   - ✅ All modules
   - ✅ Verification status
   - ✅ Transaction history

## Complete Publish Command with Verification

```bash
# Publish with dependency verification
sui client publish \
  --gas-budget 100000000 \
  --skip-fetch-latest-git-deps \
  --verify-deps \
  2>&1 | tee publish_output.txt

# Extract and save information
./save_deployment_info.sh publish_output.txt

# View the saved information
cat CONTRACT_INFO.txt
```

## What Gets Verified

When you verify a package, Sui checks:
- ✅ Source code matches the published bytecode
- ✅ Dependencies are correct
- ✅ Package integrity
- ✅ Module structure

## Troubleshooting Verification

If verification fails:
- Make sure you're using the same source code
- Check that dependencies match
- Ensure the package was published successfully
- Try verifying on Sui Explorer instead

## Next Steps After Publishing

1. ✅ Save Package ID and Transaction Digest
2. ✅ Verify on Sui Explorer
3. ✅ Initialize modules (token, marketplace, rewards, oracle)
4. ✅ Start interacting with your contract!

