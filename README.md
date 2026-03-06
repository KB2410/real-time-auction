# 🚀 Real-Time Stellar Auction

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg) ![Network: Stellar Testnet](https://img.shields.io/badge/Network-Stellar_Testnet-blue) ![Smart Contract: Soroban](https://img.shields.io/badge/Smart_Contract-Soroban-orange)

> A decentralized, fully real-time auction platform built on the Stellar network. No page refreshes, no missed bids—just seamless WebSocket synchronization powered by Soroban smart contracts.

## 📖 The Vision

Web3 auctions are traditionally clunky. Bidders are forced to constantly refresh the page to see if they've been outbid, leading to terrible user experiences and missed opportunities.

**Real-Time Stellar Auction** solves this by introducing a robust event-listening bridge. By pairing the security of a Rust-based Soroban smart contract with the speed of WebSockets, this dApp instantly broadcasts on-chain bid events to all connected clients.

## ✨ Key Features

* **⚡ True Real-Time UI:** Built with React and `socket.io`, the frontend updates instantly across all connected devices the moment a transaction is confirmed on the ledger.
* **🛡️ Smart Contract Escrow:** Built with Rust/Soroban to ensure bids are mathematically verified, strictly enforcing end times and minimum increments.
* **🎯 Anti-Sniping Protection:** Fair play is hardcoded. Any bid placed within the final 5 minutes of the auction automatically extends the deadline by 300 seconds, preventing bots from stealing last-second wins.
* **🔐 Freighter Integration:** Seamless Web3 wallet connection for secure transaction signing directly in the browser.

## 🏗️ Architecture

The application is separated into three distinct layers to ensure separation of concerns and lightning-fast state synchronization:

1. **The Source of Truth (Soroban Contract):** Manages state, validates bids, and emits `bid` and `extended` events.
2. **The Bridge (Node.js/Express):** Polls the Stellar RPC node for contract events and pushes them to clients via WebSockets.
3. **The Client (React/Vite):** Listens to the WebSocket stream and updates the UI dynamically without HTTP polling.

## 💻 Tech Stack

* **Blockchain:** Stellar Network, Soroban SDK (Rust)
* **Backend:** Node.js, Express, Socket.io, `@stellar/stellar-sdk`
* **Frontend:** React, Vite, Socket.io-client, `@stellar/freighter-api`

## 🚀 Quick Start (Run Locally)

### Prerequisites
* [Node.js](https://nodejs.org/) (v18+)
* [Rust](https://rustup.rs/) and the `wasm32-unknown-unknown` target
* [Soroban CLI](https://soroban.stellar.org/docs/getting-started/setup)
* Freighter Wallet Browser Extension

### 1. Clone the Repository
```bash
git clone https://github.com/KB2410/real-time-auction.git
cd real-time-auction
```

### 2. Deploy the Smart Contract
```bash
cd contracts/auction
soroban contract build
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/auction.wasm \
  --source YOUR_SECRET_KEY \
  --network testnet
```
*Save the returned CONTRACT_ID for the next step.*

**IMPORTANT: Initialize the contract before first use:**
```bash
# Set auction to end 1 hour from now
END_TIME=$(($(date +%s) + 3600))

soroban contract invoke \
  --id YOUR_CONTRACT_ID \
  --source YOUR_SECRET_KEY \
  --network testnet \
  -- \
  init \
  --item_name NFT_ITEM \
  --end_time $END_TIME
```

See [INITIALIZE_CONTRACT.md](./INITIALIZE_CONTRACT.md) for detailed instructions.

### 3. Start the Backend Bridge
```bash
cd ../../backend
npm install
# Create a .env file and add your CONTRACT_ID and SOROBAN_RPC_URL
node index.js
```

### 4. Start the Frontend Application
```bash
cd ../frontend
npm install
npm run dev
```
*The application will be available at `http://localhost:5173`.*

## 📋 Submission Information

### Contract Details
- **Deployed Contract Address**: `CB2MNE6RRXQBVQSA62EZLBIAZQIINYCUV2KZYJKCVZ7LJ45BH3MOYUD7`
- **Network**: Stellar Testnet
- **Transaction Hash**: `[Add your transaction hash from Stellar Explorer here]`
- **Stellar Explorer Link**: `https://stellar.expert/explorer/testnet/contract/CB2MNE6RRXQBVQSA62EZLBIAZQIINYCUV2KZYJKCVZ7LJ45BH3MOYUD7`

### Wallet Integration
The application supports Freighter Wallet with seamless transaction signing.

![Wallet Connection Screenshot](./docs/wallet-screenshot.png)
*Screenshot showing wallet connection options*

## 🎥 Demo

**Live Demo**: [Add your Vercel/Netlify deployment link here] *(Optional)*

**Video Demo**: [Link to your 2-minute side-by-side YouTube demo video here]

## 🏆 What Makes This Special

Unlike traditional auction platforms that rely on constant page refreshes or inefficient polling, this project demonstrates:

* **Real-world Web3 UX:** Bridging the gap between blockchain immutability and modern user expectations
* **Production-ready architecture:** Clean separation between contract logic, event streaming, and UI
* **Fair play mechanics:** Anti-sniping logic that can't be bypassed, ensuring equal opportunity for all bidders

## 📄 License

MIT

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/KB2410/real-time-auction/issues).

---

Built with ❤️ for the Stellar ecosystem
