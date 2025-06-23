import { ethers } from "ethers";
import fetch from "node-fetch";
import * as dotenv from "dotenv";
import { PolymarketOracle__factory } from "../typechain-types/factories/contracts/PolymarketOracle__factory";

dotenv.config();

const RPC_URL = process.env.RPC_URL!;
const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const ORACLE_ADDRESS = process.env.ORACLE_ADDRESS!;
const UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

if (!RPC_URL || !PRIVATE_KEY || !ORACLE_ADDRESS) {
  throw new Error("Missing env vars: RPC_URL, PRIVATE_KEY, ORACLE_ADDRESS");
}

const POLYMARKET_API_URL = `https://gamma-api.polymarket.com/markets?slug=us-recession-in-2025`;

class OracleDaemon {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private oracle: any;
  private isRunning: boolean = false;
  private updateCount: number = 0;
  private lastPrice: number = 0;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.wallet = new ethers.Wallet(PRIVATE_KEY, this.provider);
    this.oracle = PolymarketOracle__factory.connect(ORACLE_ADDRESS, this.wallet);
  }

  async fetchNoPrice(): Promise<number> {
    const res = await fetch(POLYMARKET_API_URL);
    if (!res.ok) throw new Error(`Failed to fetch Polymarket API: ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error("Invalid API response: empty array");
    const market = data[0];
    if (!market.outcomePrices) throw new Error("No outcomePrices in market data");
    const prices = JSON.parse(market.outcomePrices);
    if (!Array.isArray(prices) || prices.length < 2) throw new Error("Invalid outcomePrices array");
    const noPrice = Number(prices[1]); // [YES, NO]
    if (isNaN(noPrice)) throw new Error("Invalid NO price");
    return noPrice;
  }

  async updateOracle(): Promise<void> {
    try {
      const price = await this.fetchNoPrice();
      const price8 = Math.round(price * 1e8);
      
      // Check if price has changed significantly (more than 0.1%)
      const currentPrice = await this.oracle.latestPrice();
      const priceDiff = Math.abs(price8 - Number(currentPrice));
      const priceChangePercent = (priceDiff / Number(currentPrice)) * 100;
      
      if (priceChangePercent < 0.1) {
        console.log(`⏭️  Price change too small (${priceChangePercent.toFixed(3)}%), skipping update`);
        return;
      }

      console.log(`📈 Updating oracle: ${ethers.formatUnits(currentPrice, 8)} → ${price} USDC`);
      
      const tx = await this.oracle.updatePrice(price8);
      await tx.wait();
      
      this.updateCount++;
      this.lastPrice = price8;
      
      console.log(`✅ Oracle updated! Tx: ${tx.hash}`);
      console.log(`📊 Total updates: ${this.updateCount}`);
      
    } catch (error: any) {
      console.error(`❌ Error updating oracle: ${error.message}`);
    }
  }

  async start(): Promise<void> {
    console.log("🚀 Starting Polymarket Oracle Daemon...");
    console.log(`Oracle Address: ${ORACLE_ADDRESS}`);
    console.log(`Wallet Address: ${this.wallet.address}`);
    console.log(`Update Interval: ${UPDATE_INTERVAL / 1000} seconds`);
    console.log("=".repeat(60));

    // Check initial oracle state
    try {
      const currentPrice = await this.oracle.latestPrice();
      const lastUpdated = await this.oracle.lastUpdated();
      const updater = await this.oracle.updater();
      
      console.log(`Current Oracle Price: ${ethers.formatUnits(currentPrice, 8)} USDC`);
      console.log(`Last Updated: ${new Date(Number(lastUpdated) * 1000).toLocaleString()}`);
      console.log(`Updater: ${updater}`);
      
      if (updater !== this.wallet.address) {
        console.error("❌ Wallet is not the oracle updater!");
        return;
      }
      
      this.lastPrice = currentPrice;
    } catch (error: any) {
      console.error(`❌ Error reading oracle state: ${error.message}`);
      return;
    }

    this.isRunning = true;
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down oracle daemon...');
      this.isRunning = false;
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down oracle daemon...');
      this.isRunning = false;
      process.exit(0);
    });

    // Start the update loop
    while (this.isRunning) {
      try {
        await this.updateOracle();
      } catch (error: any) {
        console.error(`❌ Unexpected error: ${error.message}`);
      }
      
      // Wait for next update
      if (this.isRunning) {
        console.log(`⏰ Next update in ${UPDATE_INTERVAL / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, UPDATE_INTERVAL));
      }
    }
  }
}

// Start the daemon
const daemon = new OracleDaemon();
daemon.start().catch(console.error); 