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
    this.isShuttingDown = false;
    this.eventListener = null;
  }

  async initialize() {
    try {
      console.log("🚀 Initializing Bridge Relay Service...");
      
      if (!POLYGON_BRIDGE_ADDRESS || !BNB_BRIDGE_ADDRESS || !RELAY_PRIVATE_KEY) {
        throw new Error("Missing required environment variables");
      }

      this.polygonProvider = new ethers.WebSocketProvider(POLYGON_WSS_RPC);
      this.bnbProvider = new ethers.JsonRpcProvider(BNB_RPC);
      
      this.relaySigner = new ethers.Wallet(RELAY_PRIVATE_KEY, this.bnbProvider);
      
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
      const polygonNetwork = await this.polygonProvider.getNetwork();
      console.log(`🔗 Connected to Polygon (Chain ID: ${polygonNetwork.chainId})`);
      
      const bnbNetwork = await this.bnbProvider.getNetwork();
      console.log(`🔗 Connected to BNB Chain (Chain ID: ${bnbNetwork.chainId})`);
      
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
    if (this.isShuttingDown) return;
    
    try {
      console.log("👂 Starting to listen for TokensLocked events...");
      
      this.polygonProvider.websocket.on("error", (error) => {
        console.error("🔌 WebSocket error:", error);
        if (!this.isShuttingDown) {
          this.handleReconnection();
        }
      });
      
      this.polygonProvider.websocket.on("close", () => {
        console.warn("🔌 WebSocket connection closed");
        if (!this.isShuttingDown) {
          this.handleReconnection();
        }
      });

      this.eventListener = this.polygonBridge.on("TokensLocked", async (user, tokenId, amount, destinationAddress, nonce, event) => {
        if (this.isShuttingDown) return;
        
        try {
          await this.handleTokensLocked({
            user,
            tokenId: tokenId.toString(),
            amount: amount.toString(),
            destinationAddress,
            nonce: nonce.toString(),
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash
          });
        } catch (error) {
          console.error(`❌ Error handling TokensLocked event:`, error.message);
        }
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
      if (this.processedNonces.has(nonce)) {
        console.log(`⏭️  Nonce ${nonce} already processed locally, skipping...`);
        return;
      }

      const isProcessed = await this.bnbBridge.processedNonces(nonce);
      if (isProcessed) {
        console.log(`⏭️  Nonce ${nonce} already processed on-chain, skipping...`);
        this.processedNonces.add(nonce);
        return;
      }

      if (blockNumber && typeof blockNumber === 'number') {
        await this.waitForConfirmations(blockNumber, 1);
      } else {
        console.log(`⚠️  No valid block number provided, proceeding without confirmations`);
      }

      await this.relayToBnbChain(user, amount, nonce);
      
      this.processedNonces.add(nonce);
      
    } catch (error) {
      console.error(`❌ Failed to handle TokensLocked event for nonce ${nonce}:`, error.message);
      
      if (error.code === 'NONCE_EXPIRED' || error.code === 'REPLACEMENT_UNDERPRICED') {
        console.log(`🔄 Transaction error - nonce issue detected`);
      }
    }
  }

  async waitForConfirmations(targetBlock, confirmations) {
    if (!targetBlock || typeof targetBlock !== 'number') {
      console.error(`❌ Invalid target block: ${targetBlock}`);
      return;
    }

    console.log(`⏳ Waiting for ${confirmations} confirmations from block ${targetBlock}...`);
    
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts && !this.isShuttingDown) {
      try {
        const currentBlock = await this.polygonProvider.getBlockNumber();
        console.log(`Current Block: ${currentBlock}, Target Block: ${targetBlock}`);
        
        if (currentBlock >= targetBlock + confirmations) {
          console.log(`✅ Confirmed after ${currentBlock - targetBlock} blocks`);
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
        
      } catch (error) {
        console.error(`❌ Error checking block number:`, error.message);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    if (attempts >= maxAttempts) {
      console.warn(`⚠️  Max confirmation attempts reached for block ${targetBlock}`);
    }
  }

  async relayToBnbChain(user, amount, nonce) {
    console.log(`🌉 Relaying to BNB Chain...`);
    
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries && !this.isShuttingDown) {
      try {
        const gasEstimate = await this.bnbBridge.mintTokens.estimateGas(user, amount, nonce);
        const gasLimit = gasEstimate * 120n / 100n;
        
        const feeData = await this.bnbProvider.getFeeData();
        const gasPrice = feeData.gasPrice * 110n / 100n;
        
        console.log(`⛽ Gas Limit: ${gasLimit.toString()}, Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
        
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
          return;
        } else {
          throw new Error("Transaction failed");
        }
        
      } catch (error) {
        retryCount++;
        console.error(`❌ Relay transaction failed (attempt ${retryCount}/${maxRetries}):`, error.message);
        
        if (error.code === 'INSUFFICIENT_FUNDS') {
          console.error("💸 Insufficient funds in relay wallet. Please fund the wallet.");
          throw error;
        }
        
        if (retryCount < maxRetries) {
          console.log(`🔄 Retrying in 5 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
          throw error;
        }
      }
    }
  }

  async handleReconnection() {
    if (this.isShuttingDown) return;
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("❌ Max reconnection attempts reached. Exiting...");
      process.exit(1);
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
    
    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
    
    try {
      if (this.polygonBridge) {
        this.polygonBridge.removeAllListeners();
      }
      
      this.polygonProvider = new ethers.WebSocketProvider(POLYGON_WSS_RPC);
      this.polygonBridge = new ethers.Contract(
        POLYGON_BRIDGE_ADDRESS,
        POLYGON_BRIDGE_ABI,
        this.polygonProvider
      );
      
      await this.startListening();
      
      console.log("✅ Reconnection successful");
      this.reconnectAttempts = 0;
      
    } catch (error) {
      console.error("❌ Reconnection failed:", error.message);
      if (!this.isShuttingDown) {
        this.handleReconnection();
      }
    }
  }

  async stop() {
    console.log("🛑 Stopping Bridge Relay Service...");
    this.isShuttingDown = true;
    
    if (this.polygonBridge) {
      this.polygonBridge.removeAllListeners();
    }
    
    if (this.polygonProvider && this.polygonProvider.websocket) {
      this.polygonProvider.websocket.close();
    }
    
    console.log("✅ Bridge Relay Service stopped");
  }
}

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

if (require.main === module) {
  main();
}

module.exports = BridgeRelay;