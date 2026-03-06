#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol};

// Define the state stored on the blockchain
#[contracttype]
pub enum DataKey {
    ItemName,
    HighestBid,
    HighestBidder,
    EndTime,
}

#[contract]
pub struct AuctionContract;

#[contractimpl]
impl AuctionContract {
    // Initialize the auction
    pub fn init(env: Env, item_name: Symbol, end_time: u64) {
        env.storage().instance().set(&DataKey::ItemName, &item_name);
        env.storage().instance().set(&DataKey::HighestBid, &0i128);
        env.storage().instance().set(&DataKey::EndTime, &end_time);
    }

    // The core bidding function
    pub fn place_bid(env: Env, bidder: Address, bid_amount: i128) {
        // Ensure the bidder actually signed this transaction
        bidder.require_auth();

        let current_time = env.ledger().timestamp();
        let end_time: u64 = env.storage().instance().get(&DataKey::EndTime).unwrap_or(0);
        
        if current_time >= end_time {
            panic!("The auction has already ended.");
        }

        let current_bid: i128 = env.storage().instance().get(&DataKey::HighestBid).unwrap_or(0);
        
        if bid_amount <= current_bid {
            panic!("Your bid must be higher than the current highest bid.");
        }

        // Update the ledger with the new highest bid
        env.storage().instance().set(&DataKey::HighestBid, &bid_amount);
        env.storage().instance().set(&DataKey::HighestBidder, &bidder.clone());

        // Anti-Sniping Logic: 300 seconds = 5 minutes
        // If the bid is placed within the last 5 minutes, extend the end time by 5 minutes.
        if end_time - current_time <= 300 {
            let new_end_time = end_time + 300; 
            env.storage().instance().set(&DataKey::EndTime, &new_end_time);

            let extended_topics = (symbol_short!("extended"),);
            env.events().publish(extended_topics, new_end_time);
        }

        // Emit the real-time event for your Node.js backend
        let topics = (symbol_short!("bid"), bidder);
        env.events().publish(topics, bid_amount);
    }

    // Getter functions for querying contract state
    pub fn get_highest_bid(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::HighestBid).unwrap_or(0)
    }

    pub fn get_end_time(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::EndTime).unwrap_or(0)
    }

    pub fn get_highest_bidder(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::HighestBidder)
    }
}
