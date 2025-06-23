import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { PolymarketOracle__factory } from "../typechain-types/factories/contracts/PolymarketOracle__factory";

dotenv.config();

const RPC_URL = process.env.RPC_URL!;
const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const ORACLE_ADDRESS = process.env.ORACLE_ADDRESS!;

if (!RPC_URL || !PRIVATE_KEY || !ORACLE_ADDRESS) {
  throw new Error("Missing env vars: RPC_URL, PRIVATE_KEY, ORACLE_ADDRESS");
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const oracle = PolymarketOracle__factory.connect(ORACLE_ADDRESS, wallet);

  console.log("🔍 Testing PolymarketOracle...");
  console.log(`Oracle Address: ${ORACLE_ADDRESS}`);
  console.log(`Wallet Address: ${wallet.address}`);
  console.log("=".repeat(50));

  // Test 1: Check current oracle state
  console.log("\n📊 Test 1: Current Oracle State");
  try {
    const currentPrice = await oracle.latestPrice();
    const lastUpdated = await oracle.lastUpdated();
    const updater = await oracle.updater();
    
    console.log(`Current Price: ${currentPrice} (${ethers.formatUnits(currentPrice, 8)} USDC)`);
    console.log(`Last Updated: ${new Date(Number(lastUpdated) * 1000).toLocaleString()}`);
    console.log(`Updater: ${updater}`);
    console.log(`Is Wallet Updater: ${updater === wallet.address}`);
  } catch (error: any) {
    console.error("❌ Error reading oracle state:", error.message);
  }

  // Test 2: Fetch current price from Polymarket API
  console.log("\n🌐 Test 2: Fetching Current Price from Polymarket");
  try {
    const response = await fetch('https://gamma-api.polymarket.com/markets?slug=us-recession-in-2025');
    if (!response.ok) throw new Error(`API request failed: ${response.status}`);
    
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error("Invalid API response");
    
    const market = data[0];
    const prices = JSON.parse(market.outcomePrices);
    const noPrice = Number(prices[1]); // [YES, NO]
    
    console.log(`API Response - YES: ${prices[0]} USDC, NO: ${prices[1]} USDC`);
    console.log(`NO Price from API: ${noPrice} USDC`);
    console.log(`NO Price (8 decimals): ${Math.round(noPrice * 1e8)}`);
  } catch (error: any) {
    console.error("❌ Error fetching from Polymarket API:", error.message);
  }

  // Test 3: Test price update (if wallet is updater)
  console.log("\n🔄 Test 3: Testing Price Update");
  try {
    const updater = await oracle.updater();
    if (updater !== wallet.address) {
      console.log("⚠️  Wallet is not the updater, skipping update test");
    } else {
      // Fetch fresh price
      const response = await fetch('https://gamma-api.polymarket.com/markets?slug=us-recession-in-2025');
      const data = await response.json();
      const market = data[0];
      const prices = JSON.parse(market.outcomePrices);
      const noPrice = Number(prices[1]);
      const price8 = Math.round(noPrice * 1e8);
      
      console.log(`Updating price to: ${noPrice} USDC (${price8} in 8 decimals)`);
      
      const tx = await oracle.updatePrice(price8);
      await tx.wait();
      
      console.log(`✅ Price updated successfully! Tx: ${tx.hash}`);
      
      // Verify the update
      const newPrice = await oracle.latestPrice();
      const newLastUpdated = await oracle.lastUpdated();
      
      console.log(`New Price: ${newPrice} (${ethers.formatUnits(newPrice, 8)} USDC)`);
      console.log(`New Last Updated: ${new Date(Number(newLastUpdated) * 1000).toLocaleString()}`);
    }
  } catch (error: any) {
    console.error("❌ Error updating price:", error.message);
  }

  // Test 4: Test peek function
  console.log("\n👀 Test 4: Testing Peek Function");
  try {
    const peekPrice = await oracle.peek();
    console.log(`Peek Price: ${peekPrice} (${ethers.formatUnits(peekPrice, 8)} USDC)`);
    
    const latestPrice = await oracle.latestPrice();
    console.log(`Latest Price: ${latestPrice} (${ethers.formatUnits(latestPrice, 8)} USDC)`);
    
    if (peekPrice === latestPrice) {
      console.log("✅ Peek function returns correct price");
    } else {
      console.log("❌ Peek function returns different price");
    }
  } catch (error: any) {
    console.error("❌ Error testing peek function:", error.message);
  }

  console.log("\n" + "=".repeat(50));
  console.log("🏁 Oracle testing complete!");
}

main().catch(console.error); 