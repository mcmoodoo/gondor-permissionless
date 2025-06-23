import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { SimpleLendingPool__factory, MockUSDT__factory } from "../typechain-types";

dotenv.config();

const RPC_URL = process.env.RPC_URL!;
const PRIVATE_KEY = process.env.PRIVATE_KEY!;

// Your deployed contracts
const MOCK_TOKEN = process.env.MOCK_TOKEN!;
const ORACLE_ADDRESS = process.env.ORACLE_ADDRESS!;

// Initial liquidity amount ($100 USDT)
const INITIAL_LIQUIDITY = ethers.parseUnits("100", 18); // Mock USDT has 18 decimals

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("🚀 Deploying Mock USDT and SimpleLendingPool...\n");

  // Deploy Mock USDT first
  console.log("📦 Deploying Mock USDT...");
  const MockUSDTFactory = new MockUSDT__factory(wallet);
  const mockUSDT = await MockUSDTFactory.deploy();
  await mockUSDT.waitForDeployment();
  const mockUSDTAddress = await mockUSDT.getAddress();

  console.log(`✅ Mock USDT deployed at: ${mockUSDTAddress}`);
  console.log(`   Symbol: mUSDT`);
  console.log(`   Decimals: 18`);
  console.log(`   Initial Supply: 1,000,000 mUSDT`);

  // Deploy SimpleLendingPool with mock USDT
  console.log("\n🏦 Deploying SimpleLendingPool...");
  const SimpleLendingPoolFactory = new SimpleLendingPool__factory(wallet);
  const lendingPool = await SimpleLendingPoolFactory.deploy(MOCK_TOKEN, mockUSDTAddress, ORACLE_ADDRESS);
  await lendingPool.waitForDeployment();
  const lendingPoolAddress = await lendingPool.getAddress();

  console.log(`✅ SimpleLendingPool deployed at: ${lendingPoolAddress}`);
  console.log(`   Collateral Token: ${MOCK_TOKEN} (NO2025)`);
  console.log(`   Borrow Token: ${mockUSDTAddress} (Mock USDT)`);

  // Get pool info before adding liquidity
  const poolInfoBefore = await lendingPool.getPoolInfo();
  console.log(`\n📊 Pool Info (before liquidity):`);
  console.log(`   Total Collateral: ${poolInfoBefore.totalCollateralAmount.toString()}`);
  console.log(`   Total Borrowed: ${poolInfoBefore.totalBorrowedAmount.toString()}`);
  console.log(`   Available Liquidity: ${ethers.formatUnits(poolInfoBefore.availableLiquidity, 18)} mUSDT`);
  console.log(`   Utilization Rate: ${poolInfoBefore.utilizationRate.toString()}%`);
  console.log(`   Current Rate: ${poolInfoBefore.currentRate.toString()} basis points`);

  // Add initial liquidity
  console.log(`\n💰 Adding initial liquidity...`);
  console.log(`   Amount: ${ethers.formatUnits(INITIAL_LIQUIDITY, 18)} mUSDT`);
  
  try {
    // Check mock USDT balance
    const mockUSDTBalance = await mockUSDT.balanceOf(wallet.address);
    console.log(`   Your Mock USDT balance: ${ethers.formatUnits(mockUSDTBalance, 18)} mUSDT`);
    
    if (mockUSDTBalance < INITIAL_LIQUIDITY) {
      console.log(`   ⚠️  Warning: Insufficient Mock USDT balance for initial liquidity`);
      console.log(`   You'll need to add Mock USDT to the pool manually later`);
    } else {
      // Approve Mock USDT spending
      const approveTx = await mockUSDT.approve(lendingPoolAddress, INITIAL_LIQUIDITY);
      await approveTx.wait();
      console.log(`   ✅ Mock USDT approved for lending pool`);
      
      // Add initial liquidity
      const addLiquidityTx = await lendingPool.addInitialLiquidity(INITIAL_LIQUIDITY);
      await addLiquidityTx.wait();
      console.log(`   ✅ Initial liquidity added successfully`);
    }
  } catch (error: any) {
    console.log(`   ❌ Error adding initial liquidity: ${error.message}`);
    console.log(`   You can add liquidity manually later using addInitialLiquidity()`);
  }

  // Get pool info after adding liquidity
  const poolInfoAfter = await lendingPool.getPoolInfo();
  console.log(`\n📊 Pool Info (after liquidity):`);
  console.log(`   Total Collateral: ${poolInfoAfter.totalCollateralAmount.toString()}`);
  console.log(`   Total Borrowed: ${poolInfoAfter.totalBorrowedAmount.toString()}`);
  console.log(`   Available Liquidity: ${ethers.formatUnits(poolInfoAfter.availableLiquidity, 18)} mUSDT`);
  console.log(`   Utilization Rate: ${poolInfoAfter.utilizationRate.toString()}%`);
  console.log(`   Current Rate: ${poolInfoAfter.currentRate.toString()} basis points`);

  console.log(`\n🎯 Pool Parameters:`);
  console.log(`   Collateralization Ratio: 200% (2x)`);
  console.log(`   Liquidation Threshold: 150% (1.5x)`);
  console.log(`   Liquidation Penalty: 5%`);
  console.log(`   Base Rate: 5%`);
  console.log(`   Rate Slope: 10%`);
  console.log(`   Optimal Utilization: 80%`);

  console.log(`\n📝 Next steps:`);
  console.log(`1. Update your .env with:`);
  console.log(`   MOCK_USDT_ADDRESS=${mockUSDTAddress}`);
  console.log(`   LENDING_POOL_ADDRESS=${lendingPoolAddress}`);
  console.log(`2. Test supply/borrow/repay/withdraw operations`);
  console.log(`3. Add more Mock USDT liquidity if needed`);

  // Save the deployment info
  const fs = require('fs');
  const deploymentInfo = {
    mockUSDTAddress,
    lendingPoolAddress,
    collateralToken: MOCK_TOKEN,
    borrowToken: mockUSDTAddress,
    deployer: wallet.address,
    initialLiquidity: ethers.formatUnits(INITIAL_LIQUIDITY, 18),
    timestamp: new Date().toISOString(),
    parameters: {
      collateralizationRatio: "200%",
      liquidationThreshold: "150%",
      liquidationPenalty: "5%",
      baseRate: "5%",
      rateSlope: "10%",
      optimalUtilization: "80%"
    }
  };
  
  fs.writeFileSync('deployment.json', JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to deployment.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}); 