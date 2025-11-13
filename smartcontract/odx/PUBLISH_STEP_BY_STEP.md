# Step-by-Step: Publish and Verify Your Contract

## 📋 Prerequisites

1. ✅ Contract is built (already done)
2. ⚠️ You need SUI tokens for gas (check with `sui client balance`)
3. ⚠️ Network connection working

## 🚀 Step 1: Publish the Contract

Run this command in your terminal:

```bash
cd /home/odeili/project_career_build/mmaga/smartcontract/odx
sui client publish --gas-budget 100000000 --skip-fetch-latest-git-deps --verify-deps
```

**What will happen:**
1. The command will build and prepare your package
2. You'll be prompted to **sign the transaction** (enter your password)
3. The contract will be uploaded to Sui testnet
4. You'll see output with:
   - **Package ID** (starts with `0x...`)
   - **Transaction Digest** (long string)
   - **Published Objects** section

**Important:** Copy the entire output! You'll need it.

## 📝 Step 2: Save the Output

After publishing, save the output to a file:

```bash
# If you didn't save it, you can view recent transactions
sui client objects $(sui client active-address)
```

Or save it manually by copying the output to a file:

```bash
# Create a file with your publish output
nano publish_output.txt
# Paste the output, then save (Ctrl+X, Y, Enter)
```

## 🔍 Step 3: Extract Package Information

Once you have the output saved:

```bash
./save_deployment_info.sh publish_output.txt
```

This will extract and save:
- Package ID
- Transaction Digest
- Version
- Modules list

All saved to `CONTRACT_INFO.txt`

## ✅ Step 4: Verify on Sui Explorer

1. **Get your Transaction Digest** from the publish output

2. **Visit Sui Explorer:**
   ```
   https://suiexplorer.com/transaction/<YOUR_TRANSACTION_DIGEST>?network=testnet
   ```
   Replace `<YOUR_TRANSACTION_DIGEST>` with your actual transaction digest

3. **What you'll see:**
   - ✅ Transaction details
   - ✅ Package information
   - ✅ Source code (if verified)
   - ✅ All modules deployed

## 🔎 Step 5: Verify Package Source Code

### Option A: Using Sui CLI

```bash
# Verify by Package ID
sui client verify-source <PACKAGE_ID>

# Or verify by transaction
sui client verify-source --transaction <TRANSACTION_DIGEST>
```

### Option B: On Sui Explorer

1. Go to: https://suiexplorer.com/?network=testnet
2. Search for your Package ID
3. Click on the package
4. Check the "Source Code" tab
5. You'll see verification status

## 📦 Complete Example

Here's the complete flow:

```bash
# 1. Publish (with verification)
sui client publish \
  --gas-budget 100000000 \
  --skip-fetch-latest-git-deps \
  --verify-deps \
  2>&1 | tee publish_output.txt

# 2. Extract information
./save_deployment_info.sh publish_output.txt

# 3. View saved info
cat CONTRACT_INFO.txt

# 4. Verify on explorer (replace with your transaction digest)
echo "Visit: https://suiexplorer.com/transaction/YOUR_TX_DIGEST?network=testnet"
```

## 🎯 What Gets Verified

When you use `--verify-deps` or verify after publishing:

- ✅ **Source Code Integrity**: Ensures published bytecode matches source
- ✅ **Dependencies**: Verifies all dependencies are correct
- ✅ **Package Structure**: Confirms modules are properly structured
- ✅ **On-Chain Verification**: Makes source code visible on Sui Explorer

## ⚠️ Troubleshooting

### If publish fails with "insufficient gas":
```bash
# Get testnet tokens
sui client faucet

# Or use lower gas budget
sui client publish --gas-budget 50000000 --skip-fetch-latest-git-deps --verify-deps
```

### If verification fails:
- Make sure source code hasn't changed
- Check that you're using the correct Package ID
- Try verifying on Sui Explorer instead

### If commands hang:
- Check network connection
- Try with timeout: `timeout 60 sui client publish ...`
- Restart WSL if needed

## 📚 Next Steps After Publishing

1. ✅ Save Package ID and Transaction Digest
2. ✅ Verify on Sui Explorer
3. ✅ Initialize modules:
   - `token::init()`
   - `marketplace::init()`
   - `rewards::init()`
   - `oracle::init()`
4. ✅ Start using your contract!

## 🔗 Useful Links

- **Sui Explorer**: https://suiexplorer.com/?network=testnet
- **Sui Docs**: https://docs.sui.io
- **Testnet Faucet**: Use `sui client faucet` or Discord

