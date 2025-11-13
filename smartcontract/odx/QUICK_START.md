# ODX Contract - Quick Start Guide

## 🚀 Deploy the Contract

1. **Publish the contract** (you'll need to sign the transaction):
   ```bash
   cd /home/odeili/project_career_build/mmaga/smartcontract/odx
   sui client publish --gas-budget 100000000 --skip-fetch-latest-git-deps
   ```

2. **Save the output** - Copy the entire output from the publish command

3. **Extract and save all information**:
   ```bash
   ./save_deployment_info.sh
   ```
   Then paste your publish output and press `Ctrl+D`

   OR if you saved it to a file:
   ```bash
   ./save_deployment_info.sh <your_output_file>
   ```

4. **Check CONTRACT_INFO.txt** - All package details, addresses, and commands are saved there!

## 📋 What You'll Get

After running `save_deployment_info.sh`, the `CONTRACT_INFO.txt` file will contain:

- ✅ Package ID
- ✅ Transaction Digest  
- ✅ Version
- ✅ All module names
- ✅ Initialization commands (ready to use)
- ✅ Interaction examples
- ✅ Sui Explorer link

## 🔧 Initialize Modules

After deployment, initialize each module:

```bash
# 1. Token Module
sui client call --package <PACKAGE_ID> --module token --function init --gas-budget 10000000

# 2. Marketplace
sui client call --package <PACKAGE_ID> --module marketplace --function init --gas-budget 10000000

# 3. Rewards Module
sui client call --package <PACKAGE_ID> --module rewards --function init --gas-budget 10000000

# 4. Oracle
sui client call --package <PACKAGE_ID> --module oracle --function init --gas-budget 10000000
```

Save the object IDs returned from each init() call.

## 📁 Important Files

- `CONTRACT_INFO.txt` - **Main file with all contract information**
- `DEPLOYMENT.md` - Complete deployment guide
- `save_deployment_info.sh` - Script to extract package info
- `deploy_contract.sh` - Full deployment script

## 🎯 Next Steps

1. Deploy the contract
2. Run `./save_deployment_info.sh` with the output
3. Check `CONTRACT_INFO.txt` for all details
4. Initialize modules using the commands in `CONTRACT_INFO.txt`
5. Start interacting with your contract!

