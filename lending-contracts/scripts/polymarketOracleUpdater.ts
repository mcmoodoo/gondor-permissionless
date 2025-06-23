import { ethers } from "ethers";
import fetch from "node-fetch";
import * as dotenv from "dotenv";
import { PolymarketOracle__factory } from "../typechain-types/factories/contracts/PolymarketOracle__factory";

dotenv.config();

const RPC_URL = process.env.RPC_URL!;
const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const ORACLE_ADDRESS = process.env.ORACLE_ADDRESS!;

if (!RPC_URL || !PRIVATE_KEY || !ORACLE_ADDRESS) {
  throw new Error("Missing env vars: RPC_URL, PRIVATE_KEY, ORACLE_ADDRESS");
}

const POLYMARKET_EVENT_ID = "us-recession-in-2025";
const POLYMARKET_API_URL = `https://gamma-api.polymarket.com/markets?slug=us-recession-in-2025`;

async function fetchNoPrice(): Promise<number> {
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

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const oracle = PolymarketOracle__factory.connect(ORACLE_ADDRESS, wallet);

  try {
    const price = await fetchNoPrice();
    const price8 = Math.round(price * 1e8); // 8 decimals
    console.log(`Fetched NO price: ${price} (scaled: ${price8})`);
    const tx = await oracle.updatePrice(price8);
    await tx.wait();
    console.log(`Oracle updated. Tx: ${tx.hash}`);
  } catch (err: any) {
    console.error("Error updating oracle:", err.message);
  }
}

main(); 