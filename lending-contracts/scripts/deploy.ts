import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { MockRecessionNO__factory } from "../typechain-types";
import { PolymarketOracle__factory } from "../typechain-types/factories/contracts/PolymarketOracle__factory";

dotenv.config();

const RPC_URL = process.env.RPC_URL!;
const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const EOA = process.env.EOA!;

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  // Deploy MockRecessionNO
  const MockRecessionNOFactory = new MockRecessionNO__factory(wallet);
  const mockToken = await MockRecessionNOFactory.deploy();
  await mockToken.waitForDeployment();
  const mockTokenAddress = await mockToken.getAddress();
  console.log(`MockRecessionNO deployed at: ${mockTokenAddress}`);

  // Deploy PolymarketOracle
  const PolymarketOracleFactory = new PolymarketOracle__factory(wallet);
  const oracle = await PolymarketOracleFactory.deploy(wallet.address); // owner is updater for now
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log(`PolymarketOracle deployed at: ${oracleAddress}`);

  // Mint 1,000 tokens to EOA
  const mintAmount = ethers.parseUnits("1000", 18);
  const mintTx = await mockToken.mint(EOA, mintAmount);
  await mintTx.wait();
  console.log(`Minted 1,000 MockRecessionNO to ${EOA}`);

  // Check balance
  const balance = await mockToken.balanceOf(EOA);
  console.log(`EOA balance: ${ethers.formatUnits(balance, 18)} NO2025`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}); 