require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { rpc, nativeToScVal, scValToNative, xdr } = require('@stellar/stellar-sdk');

const app = express();
const server = http.createServer(app);

// Enable CORS so your React frontend can connect
const io = new Server(server, {
    cors: { origin: "*" }
});

// Add a root route so it shows something in the browser
app.get('/', (req, res) => {
    res.send('Backend Bridge is running!');
});

const rpcServer = new rpc.Server(process.env.SOROBAN_RPC_URL);
const contractId = process.env.CONTRACT_ID;

// Keep track of the last ledger we checked so we don't process duplicate events
let latestLedger = 0;

// The Event Polling Function
async function pollForBidEvents() {
    try {
        // If we just started, get the current latest ledger from the network
        if (latestLedger === 0) {
            const latest = await rpcServer.getLatestLedger();
            latestLedger = latest.sequence;
        }

        // Ask the network: "Did my contract emit any events since the last ledger?"
        const eventsResponse = await rpcServer.getEvents({
            startLedger: latestLedger,
            filters: [
                {
                    type: "contract",
                    contractIds: [contractId]
                }
            ]
        });

        if (eventsResponse.events && eventsResponse.events.length > 0) {
            eventsResponse.events.forEach(event => {
                try {
                    // Check if there are any topics at all
                    if (!event.topic || event.topic.length === 0) return;

                    // Helper to decode if it's a string, otherwise use as-is
                    const decodeScVal = (val) => {
                        if (typeof val === 'string') {
                            return xdr.ScVal.fromXDR(val, "base64");
                        }
                        return val; // It's already a decoded object (ChildUnion/ScVal)
                    };

                    const topic0Raw = decodeScVal(event.topic[0]);
                    let topic0Str = "";

                    // Safely try to parse topic as a native string if it's a Symbol
                    try {
                        topic0Str = scValToNative(topic0Raw);
                    } catch (e) { /* might not be a symbol, ignore */ }

                    if (topic0Str === "bid") {
                        if (event.topic.length < 2) return;

                        const bidderAddressRaw = decodeScVal(event.topic[1]);
                        const bidAmountRaw = decodeScVal(event.value);

                        const bidderAddress = scValToNative(bidderAddressRaw);
                        const bidAmount = scValToNative(bidAmountRaw);

                        const eventData = {
                            bidder: bidderAddress,
                            amount: bidAmount.toString(),
                            ledger: event.ledger
                        };

                        console.log("New Bid Detected on Chain!", eventData);
                        io.emit("new_highest_bid", eventData);

                    } else if (topic0Str === "extended") {
                        const newEndTimeRaw = decodeScVal(event.value);
                        const newEndTime = scValToNative(newEndTimeRaw);

                        console.log("Auction Extended!", newEndTime);
                        io.emit("time_extended", {
                            newEndTime: Number(newEndTime)
                        });
                    }
                } catch (e) {
                    console.error("Failed to parse event", e);
                }
            });
        }

        // Update the ledger tracker for the next loop
        const latest = await rpcServer.getLatestLedger();
        // Don't jump too far ahead if the event service is behind
        if (latest.sequence >= latestLedger) {
            latestLedger = latest.sequence;
        }

    } catch (error) {
        if (error.message && error.message.includes("startLedger must be within the ledger range")) {
            const match = error.message.match(/range: \d+ - (\d+)/);
            if (match && match[1]) {
                latestLedger = parseInt(match[1], 10);
            }
        } else {
            console.error("Error polling events:", error.message);
        }
    }

    // Loop this function every 3 seconds to keep it "real-time"
    setTimeout(pollForBidEvents, 3000);
}

// WebSocket Connection Handler
io.on('connection', (socket) => {
    console.log(`Frontend client connected: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log(`Frontend client disconnected: ${socket.id}`);
    });
});

// Start the server and the polling loop
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Backend Bridge running on port ${PORT}`);
    console.log(`Watching Contract: ${contractId} for events...`);
    pollForBidEvents();
});
