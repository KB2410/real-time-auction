import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { setAllowed, requestAccess, signTransaction } from '@stellar/freighter-api';
import { rpc, Networks, TransactionBuilder, Address, nativeToScVal, xdr, Operation, Account } from '@stellar/stellar-sdk';
import CountdownTimer from './CountdownTimer';

function App() {
  const [currentBid, setCurrentBid] = useState(0);
  const [highestBidder, setHighestBidder] = useState("No bids yet");
  const [bidInput, setBidInput] = useState("");
  const [userAddress, setUserAddress] = useState("");
  const [socketInstance, setSocketInstance] = useState(null);
  const [notification, setNotification] = useState("");

  // 1. Establish the WebSocket Connection
  useEffect(() => {
    // Connect to your Node.js backend
    const socket = io('http://localhost:3001');
    setSocketInstance(socket);

    // Listen for the specific event your backend broadcasts
    socket.on('new_highest_bid', (data) => {
      console.log("Real-time update received:", data);
      setCurrentBid(data.amount);
      setHighestBidder(data.bidder);

      // Transaction complete notification for exactly 23 XLM
      if (Number(data.amount) === 23) {
        setNotification("✅ Transaction completed for 23 XLM tokens!");
        setTimeout(() => setNotification(""), 6000);
      }
    });

    return () => socket.disconnect();
  }, []);

  // 2. Connect the Freighter Wallet
  const connectWallet = async () => {
    try {
      if (await setAllowed()) {
        const publicKey = await requestAccess();
        setUserAddress(publicKey);
      } else {
        alert("Please install the Freighter wallet extension and allow access.");
      }
    } catch (e) {
      console.error(e);
      alert("Please install the Freighter wallet extension!");
    }
  };

  // 3. Handle Bid Submission
  const handleBid = async (e) => {
    e.preventDefault();
    if (!userAddress) return alert("Connect your wallet first!");
    if (Number(bidInput) <= Number(currentBid)) return alert("Bid must be higher than current bid!");

    try {
      console.log(`Submitting bid for ${bidInput} from ${userAddress}...`);

      const rpcServer = new rpc.Server('https://soroban-testnet.stellar.org');
      const contractId = 'CB2MNE6RRXQBVQSA62EZLBIAZQIINYCUV2KZYJKCVZ7LJ45BH3MOYUD7';
      const networkPassphrase = Networks.TESTNET;

      // 1. Get the latest account sequence number for the user
      // `txBadSeq` (-5) means the transaction used an old or future sequence number. 
      // The RPC gives us the *current* sequence, and `TransactionBuilder` increments it automatically.
      const accountResponse = await rpcServer.getAccount(userAddress);

      // We store the original sequence string so we can re-use it for the rebuild
      const originalSequence = accountResponse.sequence.toString();
      const sourceAccount = new Account(userAddress, originalSequence);

      console.log(`Building with origin sequence number: ${sourceAccount.sequenceNumber()}`);

      // 2. Build the exact function call arguments
      const contractOperation = Operation.invokeHostFunction({
        func: new xdr.HostFunction.hostFunctionTypeInvokeContract(
          new xdr.InvokeContractArgs({
            contractAddress: Address.fromString(contractId).toScAddress(),
            functionName: "place_bid",
            args: [
              nativeToScVal(userAddress, { type: "address" }),
              nativeToScVal(Number(bidInput), { type: "i128" })
            ]
          })
        ),
        auth: [],
      });

      // 3. Construct the unsigned transaction
      let txBuilder = new TransactionBuilder(sourceAccount, {
        fee: '1000000', // max 10 XLM fee for Soroban deployment
        networkPassphrase,
      }).addOperation(contractOperation).setTimeout(300); // 5 minutes to sign

      // Calling build() increments the sequence number inside `sourceAccount`!
      let builtTx = txBuilder.build();

      // 4. Send it to the RPC server to get it dynamically pre-flighted with the necessary resources and auth entries
      const simResponse = await rpcServer.simulateTransaction(builtTx);

      if (simResponse.error) {
        console.error("Simulation error:", simResponse.error);
        alert("Transaction simulation failed. Check console.");
        return;
      }

      // Assemble it back with the simulation data (the transaction costs gas!)
      const simTxData = simResponse.transactionData;
      const minResourceFee = simResponse.minResourceFee || '1000000';

      let authEntries = [];
      if (simResponse.result && simResponse.result.auth) {
        authEntries = simResponse.result.auth;
      } else if (simResponse.results && simResponse.results[0] && simResponse.results[0].auth) {
        authEntries = simResponse.results[0].auth;
      }

      const opWithAuth = Operation.invokeHostFunction({
        func: new xdr.HostFunction.hostFunctionTypeInvokeContract(
          new xdr.InvokeContractArgs({
            contractAddress: Address.fromString(contractId).toScAddress(),
            functionName: "place_bid",
            args: [
              nativeToScVal(userAddress, { type: "address" }),
              nativeToScVal(Number(bidInput), { type: "i128" })
            ]
          })
        ),
        auth: authEntries,
      });

      // CRITICAL FIX: Reset the sequence number back to what it was BEFORE the first build!
      // Otherwise `TransactionBuilder` increments it a second time, resulting in a future sequence number (`txBadSeq`).
      const rebuildSourceAccount = new Account(userAddress, originalSequence);

      let rebuildBuilder = new TransactionBuilder(rebuildSourceAccount, {
        fee: minResourceFee,
        networkPassphrase,
      }).addOperation(opWithAuth).setTimeout(30).setSorobanData(simTxData.build());

      builtTx = rebuildBuilder.build();

      // 5. Ask Freighter to sign it
      const response = await signTransaction(builtTx.toXDR(), { network: 'TESTNET' });

      // Freighter v2+ might return the XDR in various formats depending on the package build
      if (response && response.error) {
        throw new Error(response.error);
      }

      let extractedXdr = "";
      if (typeof response === 'string') {
        extractedXdr = response;
      } else if (response && typeof response === 'object') {
        extractedXdr = response.signedXdr || response.signedTransaction || response.signedTx || response.xdr || "";
      }

      if (!extractedXdr) {
        throw new Error("Freighter did not return a signed XDR string. Check console.");
      }

      // 6. Submit it to the Stellar Network
      const cleanXdr = extractedXdr.trim();
      const finalTx = TransactionBuilder.fromXDR(cleanXdr, networkPassphrase);

      const sendResponse = await rpcServer.sendTransaction(finalTx);

      if (sendResponse.status === "PENDING" || sendResponse.status === "SUCCESS") {
        console.log("Transaction submitted! Hash:", sendResponse.hash);
        alert(`Bid for ${bidInput} XLM submitted! Waiting for network...`);
        // Clear input after submission
        setBidInput("");
        // The Node.js backend should pick up the event and update the UI any second now...
      } else {
        console.error("Submission failed", sendResponse);
        console.log("Full Error Object:", JSON.stringify(sendResponse.errorResult, null, 2));

        // Extract the exact contract error if possible and display it
        let errorMsg = "Transaction failed to submit.";
        if (sendResponse.errorResultXdr) {
          errorMsg += ` (Contract Reverted - XDR: ${sendResponse.errorResultXdr})`;
        } else if (sendResponse.errorResult) {
          errorMsg += ` (Error: ${JSON.stringify(sendResponse.errorResult)})`;
        }
        alert(errorMsg + " Check console for details.");
      }

    } catch (error) {
      console.error("Transaction failed:", error);
      alert(`Transaction Error: ${error.message || "See console for details"}`);
    }
  };

  return (
    <div style={{ padding: '50px', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>🚀 Live NFT Auction</h1>

      {notification && (
        <div style={{
          padding: '15px',
          backgroundColor: '#d4edda',
          color: '#155724',
          borderRadius: '5px',
          border: '1px solid #c3e6cb',
          margin: '20px auto',
          maxWidth: '400px',
          fontWeight: 'bold'
        }}>
          {notification}
        </div>
      )}

      <div style={{ margin: '20px 0' }}>
        <CountdownTimer
          initialEndTime={Math.floor(Date.now() / 1000) + 600}
          socket={socketInstance}
        />
      </div>

      {!userAddress ? (
        <button onClick={connectWallet} style={{ padding: '10px 20px', fontSize: '16px' }}>
          Connect Freighter Wallet
        </button>
      ) : (
        <p>Connected: {userAddress.slice(0, 6)}...{userAddress.slice(-4)}</p>
      )}

      <div style={{ margin: '40px 0', padding: '20px', border: '2px solid #333', borderRadius: '10px' }}>
        <h2>Current Highest Bid</h2>
        <h1 style={{ color: 'green', fontSize: '48px' }}>{currentBid} XLM</h1>
        <p>Highest Bidder: {highestBidder}</p>
      </div>

      <form onSubmit={handleBid}>
        <input
          type="number"
          value={bidInput}
          onChange={(e) => setBidInput(e.target.value)}
          placeholder="Enter bid amount"
          style={{ padding: '10px', fontSize: '16px', marginRight: '10px' }}
        />
        <button type="submit" style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}>
          Place Bid
        </button>
      </form>
    </div>
  );
}

export default App;
