#!/bin/bash

# Initialize the auction contract
# Usage: ./scripts/init-contract.sh

CONTRACT_ID="CB2MNE6RRXQBVQSA62EZLBIAZQIINYCUV2KZYJKCVZ7LJ45BH3MOYUD7"

# Set auction to end 1 hour from now
END_TIME=$(($(date +%s) + 3600))

echo "Initializing contract: $CONTRACT_ID"
echo "End time: $(date -r $END_TIME)"
echo ""

# You need to replace YOUR_IDENTITY with your Soroban CLI identity name
# If you don't have one, create it with: soroban keys generate YOUR_NAME --network testnet

soroban contract invoke \
  --id $CONTRACT_ID \
  --source YOUR_IDENTITY \
  --network testnet \
  -- \
  init \
  --item_name NFT_ITEM \
  --end_time $END_TIME

echo ""
echo "✅ Contract initialized!"
echo "You can now place bids from the frontend."
