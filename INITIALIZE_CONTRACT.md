# 🚀 Contract Initialization Guide

## Quick Start (5 minutes)

Your contract is deployed but needs to be initialized before it can accept bids.

### Step 1: Set up Soroban CLI identity

```bash
# Generate a new identity (if you don't have one)
soroban keys generate my-auction-key --network testnet

# Get your public key
soroban keys address my-auction-key
```

**Copy the public key** - you'll need to fund it.

### Step 2: Fund your account

Go to: https://laboratory.stellar.org/#account-creator?network=test

Paste your public key and click "Get test network lumens"

### Step 3: Initialize the contract

```bash
# Set auction to end 1 hour from now
END_TIME=$(($(date +%s) + 3600))

soroban contract invoke \
  --id CB2MNE6RRXQBVQSA62EZLBIAZQIINYCUV2KZYJKCVZ7LJ45BH3MOYUD7 \
  --source my-auction-key \
  --network testnet \
  -- \
  init \
  --item_name NFT_ITEM \
  --end_time $END_TIME
```

### Step 4: Test it!

```bash
# Start your backend
cd backend
node index.js

# In another terminal, start frontend
cd frontend
npm run dev
```

Open http://localhost:5173 and place a bid - it should work now!

---

## Troubleshooting

### "error: Account not found"
Your account needs XLM. Go back to Step 2 and fund it.

### "error: soroban: command not found"
Install Soroban CLI:
```bash
cargo install --locked soroban-cli --features opt
```

### "Transaction failed"
Check if the contract is already initialized:
```bash
soroban contract invoke \
  --id CB2MNE6RRXQBVQSA62EZLBIAZQIINYCUV2KZYJKCVZ7LJ45BH3MOYUD7 \
  --source my-auction-key \
  --network testnet \
  -- \
  get_end_time
```

If it returns a number > 0, it's already initialized!

---

## What This Does

The `init` function sets up:
- Item name: "NFT_ITEM"
- Highest bid: 0
- End time: 1 hour from now
- Highest bidder: (none yet)

After initialization, users can place bids through the frontend!
