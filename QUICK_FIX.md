# 🔧 Quick Fix: Contract Not Initialized

## The Problem

Your contract is deployed but not initialized. The `place_bid` function requires the contract to be initialized first with the `init` function.

**Error**: `UnreachableCodeReached` - This happens because `end_time` is 0, so the contract thinks the auction has already ended.

## The Solution

You need to call the `init` function once to set up the auction.

### Option 1: Using Soroban CLI (Recommended)

1. **Check if you have a Soroban identity**:
   ```bash
   soroban keys ls
   ```

2. **If you don't have one, create it**:
   ```bash
   soroban keys generate my-key --network testnet
   soroban keys address my-key
   ```

3. **Fund your account** (if needed):
   - Go to https://laboratory.stellar.org/#account-creator?network=test
   - Paste your public key and click "Get test network lumens"

4. **Initialize the contract**:
   ```bash
   # Set auction to end 1 hour from now
   END_TIME=$(($(date +%s) + 3600))
   
   soroban contract invoke \
     --id CB2MNE6RRXQBVQSA62EZLBIAZQIINYCUV2KZYJKCVZ7LJ45BH3MOYUD7 \
     --source my-key \
     --network testnet \
     -- \
     init \
     --item_name NFT_ITEM \
     --end_time $END_TIME
   ```

5. **Verify it worked**:
   ```bash
   # Check the current highest bid (should return 0)
   soroban contract invoke \
     --id CB2MNE6RRXQBVQSA62EZLBIAZQIINYCUV2KZYJKCVZ7LJ45BH3MOYUD7 \
     --source my-key \
     --network testnet \
     -- \
     get_highest_bid
   ```

### Option 2: Add a getter function and initialize from frontend

If you want to avoid CLI, you can add getter functions to your contract and initialize from the frontend. But Option 1 is faster for now.

## After Initialization

Once initialized, your frontend will work! Try placing a bid again:

1. Refresh your frontend at http://localhost:5173
2. Connect Freighter wallet
3. Place a bid (any amount > 0)
4. It should work now! ✅

## Why This Happened

The contract has two functions:
- `init` - Must be called once to set up the auction
- `place_bid` - Can be called multiple times to place bids

You deployed the contract but never called `init`, so all the storage values (end_time, highest_bid, etc.) are uninitialized.

## Alternative: Redeploy with Auto-Init

If you want to avoid this in the future, you can modify the contract to auto-initialize on first bid, but for now, just run the init command above.
