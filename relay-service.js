const { ethers } = require("ethers");
require("dotenv").config();

const POLYGON_WSS_RPC = process.env.POLYGON_WSS_RPC || "wss://polygon-mainnet.g.alchemy.com/v2/your-key";
const BNB_RPC = process.env.BNB_RPC || "https://bsc-dataseed1.binance.org";
const POLYGON_BRIDGE_ADDRESS = process.env.POLYGON_BRIDGE_ADDRESS;
const BNB_BRIDGE_ADDRESS = process.env.BNB_BRIDGE_ADDRESS;
const RELAY_PRIVATE_KEY = process.env.RELAY_PRIVATE_KEY;

const POLYGON_BRIDGE_ABI = [
  "event TokensLocked(address indexed user, uint256 indexed tokenId, uint256 amount, string destinationAddress, uint256 indexed nonce)"
];

const BNB_BRIDGE_ABI = [
  "function mintTokens(address to, uint256 amount, uint256 nonce) external",
  "function processedNonces(uint256) external view returns (bool)",
  "event TokensMinted(address indexed to, uint256 amount, uint256 indexed nonce)"
];

class BridgeRelay {
  constructor() {
    this.polygonProvider = null;
    this.bnbProvider = null;
    this.polygonBridge = null;
    this.bnbBridge = null;
    this.relaySigner = null;
    this.processedNonces = new Set();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000;
  }

  async initialize() {
    try {
      console.log("🚀 Initializing Bridge Relay Service...");
      
      // Validate environment variables
      if (!POLYGON_BRIDGE_ADDRESS || !BNB_BRIDGE_ADDRESS || !RELAY_PRIVATE_KEY) {
        throw new Error("Missing required environment variables");
      }

      // Setup providers
      this.polygonProvider = new ethers.WebSocketProvider(POLYGON_WSS_RPC);
      this.bnbProvider = new ethers.JsonRpcProvider(BNB_RPC);
      
      // Setup signer for BNB chain transactions
      this.relaySigner = new ethers.Wallet(RELAY_PRIVATE_KEY, this.bnbProvider);
      
      // Setup contract instances
      this.polygonBridge = new ethers.Contract(
        POLYGON_BRIDGE_ADDRESS,
        POLYGON_BRIDGE_ABI,
        this.polygonProvider
      );
      
      this.bnbBridge = new ethers.Contract(
        BNB_BRIDGE_ADDRESS,
        BNB_BRIDGE_ABI,
        this.relaySigner
      );

      // Test connections
      await this.testConnections();
      
      console.log("✅ Bridge Relay Service initialized successfully");
      console.log(`📡 Polygon Bridge: ${POLYGON_BRIDGE_ADDRESS}`);
      console.log(`🌉 BNB Bridge: ${BNB_BRIDGE_ADDRESS}`);
      console.log(`👤 Relay Address: ${await this.relaySigner.getAddress()}`);
      
    } catch (error) {
      console.error("❌ Failed to initialize Bridge Relay:", error.message);
      throw error;
    }
  }

  async testConnections() {
    try {
      // Test Polygon connection
      const polygonNetwork = await this.polygonProvider.getNetwork();
      console.log(`🔗 Connected to Polygon (Chain ID: ${polygonNetwork.chainId})`);
      
      // Test BNB connection
      const bnbNetwork = await this.bnbProvider.getNetwork();
      console.log(`🔗 Connected to BNB Chain (Chain ID: ${bnbNetwork.chainId})`);
      
      // Test relay wallet balance
      const balance = await this.bnbProvider.getBalance(await this.relaySigner.getAddress());
      console.log(`💰 Relay wallet balance: ${ethers.formatEther(balance)} BNB`);
      
      if (balance < ethers.parseEther("0.01")) {
        console.warn("⚠️  Warning: Low relay wallet balance. Consider funding the wallet.");
      }
      
    } catch (error) {
      throw new Error(`Connection test failed: ${error.message}`);
    }
  }

  async startListening() {
    try {
      console.log("👂 Starting to listen for TokensLocked events...");
      
      // Setup WebSocket connection error handlers
      this.polygonProvider.websocket.on("error", (error) => {
        console.error("🔌 WebSocket error:", error);
        this.handleReconnection();
      });
      
      this.polygonProvider.websocket.on("close", () => {
        console.warn("🔌 WebSocket connection closed");
        this.handleReconnection();
      });

      // Listen for TokensLocked events
      this.polygonBridge.on("TokensLocked", async (user, tokenId, amount, destinationAddress, nonce, event) => {
        await this.handleTokensLocked({
          user,
          tokenId: tokenId.toString(),
          amount: amount.toString(),
          destinationAddress,
          nonce: nonce.toString(),
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash
        });
      });
      
      console.log("🎯 Event listener active. Waiting for TokensLocked events...");
      
    } catch (error) {
      console.error("❌ Failed to start listening:", error.message);
      throw error;
    }
  }

  async handleTokensLocked(eventData) {
    const { user, tokenId, amount, destinationAddress, nonce, blockNumber, transactionHash } = eventData;
    
    console.log(`\n🔒 TokensLocked Event Detected:`);
    console.log(`  👤 User: ${user}`);
    console.log(`  🪙 Token ID: ${tokenId}`);
    console.log(`  💰 Amount: ${amount}`);
    console.log(`  📍 Destination: ${destinationAddress}`);
    console.log(`  🎯 Nonce: ${nonce}`);
    console.log(`  📦 Block: ${blockNumber}`);
    console.log(`  🔗 TX Hash: ${transactionHash}`);

    try {
      // Check if nonce already processed (local cache)
      if (this.processedNonces.has(nonce)) {
        console.log(`⏭️  Nonce ${nonce} already processed locally, skipping...`);
        return;
      }

      // Check if nonce already processed (on-chain)
      const isProcessed = await this.bnbBridge.processedNonces(nonce);
      if (isProcessed) {
        console.log(`⏭️  Nonce ${nonce} already processed on-chain, skipping...`);
        this.processedNonces.add(nonce);
        return;
      }

      // Wait for block confirmation (safety measure against reorgs)
      await this.waitForConfirmations(blockNumber, 1);

      // Relay to BNB chain
      await this.relayToBnbChain(user, amount, nonce);
      
      // Mark as processed
      this.processedNonces.add(nonce);
      
    } catch (error) {
      console.error(`❌ Failed to handle TokensLocked event for nonce ${nonce}:`, error.message);
      
      // Don't mark as processed if it failed, allow retry
      if (error.code === 'NONCE_EXPIRED' || error.code === 'REPLACEMENT_UNDERPRICED') {
        console.log(`🔄 Retrying with adjusted gas settings...`);
        // Could implement retry logic here
      }
    }
  }

  async waitForConfirmations(targetBlock, confirmations) {
    console.log(`⏳ Waiting for ${confirmations} confirmations...`);
    
    while (true) {
      const currentBlock = await this.polygonProvider.getBlockNumber();
      console.log(`Target Block ${targetBlock}`);
      console.log(`Current Block ${currentBlock}`);
      if (currentBlock >= targetBlock + confirmations) {
        console.log(`✅ Confirmed after ${currentBlock - targetBlock} blocks`);
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  async relayToBnbChain(user, amount, nonce) {
    console.log(`🌉 Relaying to BNB Chain...`);
    
    try {
      // Estimate gas
      const gasEstimate = await this.bnbBridge.mintTokens.estimateGas(user, amount, nonce);
      const gasLimit = gasEstimate * 120n / 100n; // Add 20% buffer
      
      // Get current gas price
      const feeData = await this.bnbProvider.getFeeData();
      const gasPrice = feeData.gasPrice * 110n / 100n; // Add 10% buffer
      
      console.log(`⛽ Gas Limit: ${gasLimit.toString()}, Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
      
      // Execute mint transaction
      const tx = await this.bnbBridge.mintTokens(user, amount, nonce, {
        gasLimit,
        gasPrice
      });
      
      console.log(`📤 Mint transaction sent: ${tx.hash}`);
      console.log(`⏳ Waiting for confirmation...`);
      
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        console.log(`✅ Tokens minted successfully on BNB Chain!`);
        console.log(`  📦 Block: ${receipt.blockNumber}`);
        console.log(`  ⛽ Gas Used: ${receipt.gasUsed.toString()}`);
        console.log(`  💰 Amount Minted: ${amount} to ${user}`);
      } else {
        throw new Error("Transaction failed");
      }
      
    } catch (error) {
      console.error(`❌ Relay transaction failed:`, error);
      
      if (error.code === 'INSUFFICIENT_FUNDS') {
        console.error("💸 Insufficient funds in relay wallet. Please fund the wallet.");
      } else if (error.reason) {
        console.error(`🔍 Revert reason: ${error.reason}`);
      }
      
      throw error;
    }
  }

  async handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("❌ Max reconnection attempts reached. Exiting...");
      process.exit(1);
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
    
    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
    
    try {
      // Remove all listeners
      this.polygonBridge.removeAllListeners();
      
      // Recreate WebSocket provider
      this.polygonProvider = new ethers.WebSocketProvider(POLYGON_WSS_RPC);
      this.polygonBridge = new ethers.Contract(
        POLYGON_BRIDGE_ADDRESS,
        POLYGON_BRIDGE_ABI,
        this.polygonProvider
      );
      
      // Restart listening
      await this.startListening();
      
      console.log("✅ Reconnection successful");
      this.reconnectAttempts = 0;
      
    } catch (error) {
      console.error("❌ Reconnection failed:", error.message);
      this.handleReconnection();
    }
  }

  async stop() {
    console.log("🛑 Stopping Bridge Relay Service...");
    
    if (this.polygonBridge) {
      this.polygonBridge.removeAllListeners();
    }
    
    if (this.polygonProvider && this.polygonProvider.websocket) {
      this.polygonProvider.websocket.close();
    }
    
    console.log("✅ Bridge Relay Service stopped");
  }
}

// Handle process signals
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT. Shutting down gracefully...');
  if (global.relayService) {
    await global.relayService.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM. Shutting down gracefully...');
  if (global.relayService) {
    await global.relayService.stop();
  }
  process.exit(0);
});

// Main execution
async function main() {
  try {
    const relayService = new BridgeRelay();
    global.relayService = relayService;
    
    await relayService.initialize();
    await relayService.startListening();
    
  } catch (error) {
    console.error("💥 Fatal error:", error.message);
    process.exit(1);
  }
}

// Start the service
if (require.main === module) {
  main();
}

module.exports = BridgeRelay;
