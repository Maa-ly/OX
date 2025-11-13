# How to Get Your Package ID

If you've already published the contract, here are ways to find your Package ID:

## Method 1: From Publish Output

If you have the publish command output, run:

```bash
./extract_package_info.sh <output_file>
```

Or paste the output directly:
```bash
./extract_package_info.sh
# Then paste your publish output and press Ctrl+D
```

## Method 2: From Transaction Digest

If you have the transaction digest, query it:

```bash
sui client transaction <TRANSACTION_DIGEST>
```

Look for "Published Objects" section with the Package ID.

## Method 3: Check Your Objects

List all objects owned by your address:

```bash
sui client objects $(sui client active-address)
```

Look for objects with type containing "Package" or your package name.

## Method 4: Sui Explorer

1. Go to https://suiexplorer.com/?network=testnet
2. Search for your address: `0x6df2465c7b9a88e9769a625b3af0afbf41ab61d86183d85eb5fa5b7bd0549c71`
3. Look for recent transactions
4. Find the "publish" transaction
5. The Package ID will be in the transaction details

## What the Output Should Look Like

After successful publish, you should see something like:

```
Published Objects:
  ┌──
  │ PackageID: 0x1234567890abcdef...
  │ Version: 1
  │ Digest: ABC123...
  │ Modules: datatypes, marketplace, odx, oracle, rewards, token
  └──
```

## Once You Have the Package ID

Update `DEPLOYMENT.md` with:
- Package ID
- Transaction Digest  
- Any created object IDs

Then you can initialize the modules!

