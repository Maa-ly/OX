# Quick Guide: Get Your Private Key

## Fastest Method

1. **List your keys:**
   ```bash
   sui keytool list
   ```

2. **Export your active key:**
   ```bash
   sui keytool export $(sui client active-address | head -1) --json
   ```
   
   Or if that doesn't work, use the alias:
   ```bash
   sui keytool export <your-key-alias> --json
   ```

3. **Copy the `value` or `privateKey` field** from the JSON output

4. **Add to `backend/.env`:**
   ```env
   ADMIN_PRIVATE_KEY=<paste-the-value-here>
   ```

5. **Test it:**
   ```bash
   cd backend
   node scripts/quick-test.js
   ```

## Example Output

When you run `sui keytool export`, you'll get something like:
```json
{
  "flag": "Ed25519",
  "value": "aBc123XyZ...base64-encoded-key...",
  "encoding": "base64"
}
```

Just copy the `value` part (the long base64 string) and put it in your `.env` file.

## Need More Help?

See `backend/scripts/GET_PRIVATE_KEY.md` for detailed instructions.
