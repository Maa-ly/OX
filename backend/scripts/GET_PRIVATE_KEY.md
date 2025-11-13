# How to Get Your Private Key

## Method 1: Using Sui CLI (Recommended)

### Step 1: List your keys
```bash
sui keytool list
```

This will show all your key aliases. Note the alias you want to use (usually the active one).

### Step 2: Export the private key
```bash
sui keytool export <your-key-alias> --json
```

Replace `<your-key-alias>` with the actual alias from step 1.

**Example:**
```bash
sui keytool export my-key --json
```

### Step 3: Extract the private key

The output will look something like this:
```json
{
  "flag": "Ed25519",
  "value": "base64-encoded-private-key-here",
  "encoding": "base64"
}
```

Or it might be a simpler format:
```json
{
  "privateKey": "base64-encoded-private-key-here"
}
```

### Step 4: Add to .env

Copy the `value` or `privateKey` field and add it to your `backend/.env` file:

```env
ADMIN_PRIVATE_KEY=base64-encoded-private-key-here
```

## Method 2: Using the Helper Script

We've created a helper script to make this easier:

```bash
cd backend
node scripts/get-private-key.js
```

Then paste the JSON output from `sui keytool export` when prompted.

## Method 3: Manual Extraction

If you have the JSON output, you can manually extract it:

1. Copy the JSON from `sui keytool export`
2. Look for a field named `value`, `privateKey`, or `private_key`
3. Copy that base64-encoded string
4. Add it to `backend/.env` as `ADMIN_PRIVATE_KEY=<the-value>`

## Verification

After setting `ADMIN_PRIVATE_KEY`, test it:

```bash
cd backend
node scripts/test-contract.js test-config
```

This will show if the keypair was loaded successfully.

## Security Notes

⚠️ **IMPORTANT:**
- Never commit your private key to git
- Keep your `.env` file in `.gitignore`
- Don't share your private key with anyone
- Use a separate key for production vs development

## Troubleshooting

### "Admin keypair not configured"
- Make sure `ADMIN_PRIVATE_KEY` is set in `backend/.env`
- Check that the value is the base64-encoded private key (not the full JSON)
- Verify the key format matches what `sui keytool export` outputs

### "Invalid private key format"
- Make sure you're using the base64-encoded value, not the full JSON
- Try exporting again with `sui keytool export <alias> --json`
- Check that there are no extra spaces or newlines in the `.env` file

### "Keypair doesn't match expected address"
- Make sure you're using the keypair that owns the AdminCap
- Verify the address matches: `sui client active-address`
- If you deployed with a different key, use that key's private key

