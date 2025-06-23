import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { SimpleLendingPool__factory, MockRecessionNO__factory, MockUSDT__factory } from "../typechain-types";
import * as readline from 'readline';

dotenv.config();

const RPC_URL = process.env.RPC_URL!;
const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const LENDING_POOL_ADDRESS = process.env.LENDING_POOL_ADDRESS!;
const MOCK_TOKEN = process.env.MOCK_TOKEN!;
const MOCK_USDT_ADDRESS = process.env.MOCK_USDT_ADDRESS!;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("🏦 NO2025 Lending Pool Interface (Mock Tokens)\n");

  // Initialize contracts
  const lendingPool = SimpleLendingPool__factory.connect(LENDING_POOL_ADDRESS, wallet);
  const mockToken = MockRecessionNO__factory.connect(MOCK_TOKEN, wallet);
  const mockUSDT = MockUSDT__factory.connect(MOCK_USDT_ADDRESS, wallet);

  while (true) {
    console.log("\n" + "=".repeat(50));
    console.log("📋 Available Actions:");
    console.log("1. View Balances");
    console.log("2. View Position");
    console.log("3. View Pool Info");
    console.log("4. Supply NO2025 (Collateral)");
    console.log("5. Borrow Mock USDT");
    console.log("6. Repay Mock USDT");
    console.log("7. Withdraw NO2025");
    console.log("8. Liquidate Position");
    console.log("9. Mint Mock USDT (for testing)");
    console.log("10. Exit");
    console.log("=".repeat(50));

    const choice = await question("Select an action (1-10): ");

    try {
      switch (choice) {
        case "1":
          await viewBalances(mockToken, mockUSDT, wallet);
          break;
        case "2":
          await viewPosition(lendingPool, wallet);
          break;
        case "3":
          await viewPoolInfo(lendingPool);
          break;
        case "4":
          await supplyCollateral(lendingPool, mockToken, wallet);
          break;
        case "5":
          await borrowUSDT(lendingPool, wallet);
          break;
        case "6":
          await repayUSDT(lendingPool, mockUSDT, wallet);
          break;
        case "7":
          await withdrawCollateral(lendingPool, wallet);
          break;
        case "8":
          await liquidatePosition(lendingPool, mockUSDT, wallet);
          break;
        case "9":
          await mintMockUSDT(mockUSDT, wallet);
          break;
        case "10":
          console.log("👋 Goodbye!");
          rl.close();
          return;
        default:
          console.log("❌ Invalid choice. Please select 1-10.");
      }
    } catch (error: any) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

async function viewBalances(mockToken: any, mockUSDT: any, wallet: any) {
  console.log("\n💰 Balances:");
  const noBalance = await mockToken.balanceOf(wallet.address);
  const usdtBalance = await mockUSDT.balanceOf(wallet.address);
  console.log(`   NO2025: ${ethers.formatUnits(noBalance, 18)}`);
  console.log(`   Mock USDT: ${ethers.formatUnits(usdtBalance, 18)}`);
}

async function viewPosition(lendingPool: any, wallet: any) {
  console.log("\n📋 Your Position:");
  const position = await lendingPool.getPosition(wallet.address);
  console.log(`   Collateral: ${ethers.formatUnits(position.collateral, 18)} NO2025`);
  console.log(`   Borrowed: ${ethers.formatUnits(position.borrow, 18)} mUSDT`);
  console.log(`   Borrowable: ${ethers.formatUnits(position.borrowable, 18)} mUSDT`);
  
  if (position.borrow > 0) {
    const ratio = await lendingPool.getCollateralizationRatio(position.collateral, position.borrow);
    console.log(`   Collateralization Ratio: ${ratio.toString()}%`);
  }
}

async function viewPoolInfo(lendingPool: any) {
  console.log("\n📊 Pool Information:");
  const poolInfo = await lendingPool.getPoolInfo();
  console.log(`   Total Collateral: ${ethers.formatUnits(poolInfo.totalCollateralAmount, 18)} NO2025`);
  console.log(`   Total Borrowed: ${ethers.formatUnits(poolInfo.totalBorrowedAmount, 18)} mUSDT`);
  console.log(`   Available Liquidity: ${ethers.formatUnits(poolInfo.availableLiquidity, 18)} mUSDT`);
  console.log(`   Utilization Rate: ${poolInfo.utilizationRate.toString()}%`);
  console.log(`   Current Rate: ${poolInfo.currentRate.toString()} basis points`);
}

async function supplyCollateral(lendingPool: any, mockToken: any, wallet: any) {
  console.log("\n🔵 Supply NO2025 as Collateral");
  const amountStr = await question("Enter amount of NO2025 to supply: ");
  const amount = ethers.parseUnits(amountStr, 18);
  
  console.log("Approving NO2025...");
  const approveTx = await mockToken.approve(lendingPool.getAddress(), amount);
  await approveTx.wait();
  console.log("✅ NO2025 approved");
  
  console.log("Supplying collateral...");
  const supplyTx = await lendingPool.supply(amount);
  await supplyTx.wait();
  console.log(`✅ Supplied ${amountStr} NO2025 as collateral`);
}

async function borrowUSDT(lendingPool: any, wallet: any) {
  console.log("\n🟢 Borrow Mock USDT");
  const amountStr = await question("Enter amount of Mock USDT to borrow: ");
  const amount = ethers.parseUnits(amountStr, 18);
  
  console.log("Borrowing Mock USDT...");
  const borrowTx = await lendingPool.borrow(amount);
  await borrowTx.wait();
  console.log(`✅ Borrowed ${amountStr} mUSDT`);
}

async function repayUSDT(lendingPool: any, mockUSDT: any, wallet: any) {
  console.log("\n🟡 Repay Mock USDT");
  const amountStr = await question("Enter amount of Mock USDT to repay: ");
  const amount = ethers.parseUnits(amountStr, 18);
  
  console.log("Approving Mock USDT...");
  const approveTx = await mockUSDT.approve(lendingPool.getAddress(), amount);
  await approveTx.wait();
  console.log("✅ Mock USDT approved");
  
  console.log("Repaying debt...");
  const repayTx = await lendingPool.repay(amount);
  await repayTx.wait();
  console.log(`✅ Repaid ${amountStr} mUSDT`);
}

async function withdrawCollateral(lendingPool: any, wallet: any) {
  console.log("\n🔴 Withdraw NO2025");
  const amountStr = await question("Enter amount of NO2025 to withdraw: ");
  const amount = ethers.parseUnits(amountStr, 18);
  
  console.log("Withdrawing collateral...");
  const withdrawTx = await lendingPool.withdraw(amount);
  await withdrawTx.wait();
  console.log(`✅ Withdrew ${amountStr} NO2025`);
}

async function liquidatePosition(lendingPool: any, mockUSDT: any, wallet: any) {
  console.log("\n⚡ Liquidate Position");
  const userAddress = await question("Enter address to liquidate: ");
  
  try {
    const position = await lendingPool.getPosition(userAddress);
    if (position.borrow === 0n) {
      console.log("❌ No debt to liquidate");
      return;
    }
    
    const ratio = await lendingPool.getCollateralizationRatio(position.collateral, position.borrow);
    console.log(`   Position collateralization ratio: ${ratio.toString()}%`);
    
    if (ratio >= 150n) {
      console.log("❌ Position is not liquidatable (ratio >= 150%)");
      return;
    }
    
    const confirm = await question("Confirm liquidation? (y/n): ");
    if (confirm.toLowerCase() !== 'y') {
      console.log("❌ Liquidation cancelled");
      return;
    }
    
    console.log("Approving Mock USDT for liquidation...");
    const approveTx = await mockUSDT.approve(lendingPool.getAddress(), position.borrow);
    await approveTx.wait();
    console.log("✅ Mock USDT approved");
    
    console.log("Liquidating position...");
    const liquidateTx = await lendingPool.liquidate(userAddress);
    await liquidateTx.wait();
    console.log(`✅ Position liquidated successfully`);
  } catch (error: any) {
    console.log(`❌ Liquidation failed: ${error.message}`);
  }
}

async function mintMockUSDT(mockUSDT: any, wallet: any) {
  console.log("\n🪙 Mint Mock USDT (for testing)");
  const amountStr = await question("Enter amount of Mock USDT to mint: ");
  const amount = ethers.parseUnits(amountStr, 18);
  
  console.log("Minting Mock USDT...");
  const mintTx = await mockUSDT.mint(wallet.address, amount);
  await mintTx.wait();
  console.log(`✅ Minted ${amountStr} mUSDT to your wallet`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}); 