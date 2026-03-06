require('dotenv').config({ path: '../backend/.env' });
const { 
  Keypair, 
  Contract, 
  SorobanRpc, 
  TransactionBuilder, 
  Networks, 
  Operation,
  Address,
  nativeToScVal,
  xdr
} = require('@stellar/stellar-sdk');

const contractId = process.env.CONTRACT_ID || 'CB2MNE6RRXQBVQSA62EZLBIAZQIINYCUV2KZYJKCVZ7LJ45BH3MOYUD7';
const rpcUrl = process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';

// You need to provide your secret key here (the one that deployed the contract)
const SECRET_KEY = process.env.SECRET_KEY || 'YOUR_SECRET_KEY_HERE';

async function initializeContract() {
  try {
    console.log('Initializing contract:', contractId);
    
    const server = new SorobanRpc.Server(rpcUrl);
    const sourceKeypair = Keypair.fromSecret(SECRET_KEY);
    const sourceAccount = await server.getAccount(sourceKeypair.publicKey());

    // Set auction to end 1 hour from now (3600 seconds)
    const endTime = Math.floor(Date.now() / 1000) + 3600;
    
    console.log('Setting end time to:', new Date(endTime * 1000).toLocaleString());

    // Build the init function call
    const contract = new Contract(contractId);
    
    const operation = Operation.invokeContractFunction({
      contract: contractId,
      function: 'init',
      args: [
        nativeToScVal('NFT_ITEM', { type: 'symbol' }), // item_name
        nativeToScVal(endTime, { type: 'u64' })        // end_time
      ]
    });

    let transaction = new TransactionBuilder(sourceAccount, {
      fee: '1000000',
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(operation)
      .setTimeout(300)
      .build();

    // Simulate first
    console.log('Simulating transaction...');
    const simResponse = await server.simulateTransaction(transaction);

    if (simResponse.error) {
      console.error('Simulation failed:', simResponse.error);
      return;
    }

    // Prepare the transaction with simulation results
    const preparedTransaction = SorobanRpc.assembleTransaction(
      transaction,
      simResponse
    );

    // Sign and submit
    preparedTransaction.sign(sourceKeypair);
    
    console.log('Submitting transaction...');
    const sendResponse = await server.sendTransaction(preparedTransaction);

    if (sendResponse.status === 'PENDING') {
      console.log('Transaction submitted! Hash:', sendResponse.hash);
      console.log('Waiting for confirmation...');
      
      // Wait for confirmation
      let getResponse = await server.getTransaction(sendResponse.hash);
      while (getResponse.status === 'NOT_FOUND') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        getResponse = await server.getTransaction(sendResponse.hash);
      }

      if (getResponse.status === 'SUCCESS') {
        console.log('✅ Contract initialized successfully!');
        console.log('Auction end time:', new Date(endTime * 1000).toLocaleString());
        console.log('You can now place bids from the frontend.');
      } else {
        console.error('Transaction failed:', getResponse);
      }
    } else {
      console.error('Failed to submit:', sendResponse);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

initializeContract();
