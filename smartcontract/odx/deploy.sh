#!/bin/bash
cd /home/odeili/project_career_build/mmaga/smartcontract/odx

echo "=== Building ODX Smart Contract ==="
sui move build

echo ""
echo "=== Checking Sui Client Configuration ==="
echo "Active Environment:"
sui client active-env
echo "Active Address:"
sui client active-address
echo "Balance:"
sui client balance

echo ""
echo "=== Publishing Package ==="
sui client publish --gas-budget 100000000 > deployment_info.txt 2>&1

echo "Deployment complete. Output saved to deployment_info.txt"
cat deployment_info.txt


