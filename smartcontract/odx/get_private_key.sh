#!/bin/bash
# Helper script to get private key for token creation

echo "To get your private key for token creation, run:"
echo ""
echo "  sui keytool export --key-identity <your-key-identity>"
echo ""
echo "Or if you have it in your .env file, you can use:"
echo "  export SUI_PRIVATE_KEY=\$(grep ADMIN_PRIVATE_KEY .env | cut -d '=' -f2)"
echo ""
echo "Then run:"
echo "  node create_tokens.js <PACKAGE_ID> <ADMIN_CAP_ID> <TOKEN_REGISTRY_ID>"


