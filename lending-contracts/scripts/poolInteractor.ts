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

class PoolInteractor {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private lendingPool: any;
  private mockToken: any;
  private mockUSDT: any;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.wallet = new ethers.Wallet(PRIVATE_KEY, this.provider);
    this.lendingPool = SimpleLendingPool__factory.connect(LENDING_POOL_ADDRESS, this.wallet);
    this.mockToken = MockRecessionNO__factory.connect(MOCK_TOKEN, this.wallet);
    this.mockUSDT = MockUSDT__factory.connect(MOCK_USDT_ADDRESS, this.wallet);
  }

  private async log(message: string) {
    console.log(message);
  }

  private async clearScreen() {
    console.clear();
  }

  private async showHeader() {
    await this.clearScreen();
    console.log("🏦 NO2025 Lending Pool - Interactive Terminal");
    console.log("=".repeat(60));
    console.log(`Wallet: ${this.wallet.address}`);
    console.log(`Pool: ${LENDING_POOL_ADDRESS}`);
    console.log(`Time: ${new Date().toLocaleString()}`);
    console.log("=".repeat(60));
  }

  async showBalances() {
    const noBalance = await this.mockToken.balanceOf(this.wallet.address);
    const usdtBalance = await this.mockUSDT.balanceOf(this.wallet.address);
    
    console.log("\n💰 WALLET BALANCES:");
    console.log(`   NO2025: ${ethers.formatUnits(noBalance, 18)}`);
    console.log(`   Mock USDT: ${ethers.formatUnits(usdtBalance, 18)}`);
  }

  async showPosition() {
    const position = await this.lendingPool.getPosition(this.wallet.address);
    
    console.log("\n📋 YOUR POSITION:");
    console.log(`   Collateral: ${ethers.formatUnits(position.collateral, 18)} NO2025`);
    console.log(`   Borrowed: ${ethers.formatUnits(position.borrow, 18)} mUSDT`);
    console.log(`   Borrowable: ${ethers.formatUnits(position.borrowable, 18)} mUSDT`);
    
    if (position.borrow > 0n) {
      const ratio = await this.lendingPool.getCollateralizationRatio(position.collateral, position.borrow);
      console.log(`   Collateralization Ratio: ${ratio.toString()}%`);
      
      if (ratio < 150n) {
        console.log(`   ⚠️  WARNING: Position is liquidatable!`);
      } else if (ratio < 200n) {
        console.log(`   ⚠️  WARNING: Position is below safe threshold!`);
      } else {
        console.log(`   ✅ Position is safe`);
      }
    }
  }

  async showPoolInfo() {
    const poolInfo = await this.lendingPool.getPoolInfo();
    
    console.log("\n📊 POOL INFORMATION:");
    console.log(`   Total Collateral: ${ethers.formatUnits(poolInfo.totalCollateralAmount, 18)} NO2025`);
    console.log(`   Total Borrowed: ${ethers.formatUnits(poolInfo.totalBorrowedAmount, 18)} mUSDT`);
    console.log(`   Available Liquidity: ${ethers.formatUnits(poolInfo.availableLiquidity, 18)} mUSDT`);
    console.log(`   Utilization Rate: ${poolInfo.utilizationRate.toString()}%`);
    console.log(`   Current Rate: ${poolInfo.currentRate.toString()} basis points (${(Number(poolInfo.currentRate) / 100).toFixed(2)}%)`);
  }

  async supplyCollateral() {
    console.log("\n🔵 SUPPLY NO2025 AS COLLATERAL");
    
    const noBalance = await this.mockToken.balanceOf(this.wallet.address);
    console.log(`Available NO2025: ${ethers.formatUnits(noBalance, 18)}`);
    
    const amountStr = await question("Enter amount of NO2025 to supply: ");
    if (!amountStr || isNaN(Number(amountStr))) {
      console.log("❌ Invalid amount");
      return;
    }
    
    const amount = ethers.parseUnits(amountStr, 18);
    
    if (amount > noBalance) {
      console.log("❌ Insufficient NO2025 balance");
      return;
    }
    
    try {
      console.log("Approving NO2025...");
      const approveTx = await this.mockToken.approve(this.lendingPool.getAddress(), amount);
      await approveTx.wait();
      console.log("✅ NO2025 approved");
      
      console.log("Supplying collateral...");
      const supplyTx = await this.lendingPool.supply(amount);
      await supplyTx.wait();
      console.log(`✅ Supplied ${amountStr} NO2025 as collateral`);
    } catch (error: any) {
      console.log(`❌ Supply failed: ${error.message}`);
    }
  }

  async borrowUSDT() {
    console.log("\n🟢 BORROW MOCK USDT");
    
    const position = await this.lendingPool.getPosition(this.wallet.address);
    console.log(`Borrowable amount: ${ethers.formatUnits(position.borrowable, 18)} mUSDT`);
    
    if (position.borrowable === 0n) {
      console.log("❌ No borrowable amount available");
      return;
    }
    
    const amountStr = await question("Enter amount of Mock USDT to borrow: ");
    if (!amountStr || isNaN(Number(amountStr))) {
      console.log("❌ Invalid amount");
      return;
    }
    
    const amount = ethers.parseUnits(amountStr, 18);
    
    if (amount > position.borrowable) {
      console.log("❌ Amount exceeds borrowable limit");
      return;
    }
    
    try {
      console.log("Borrowing Mock USDT...");
      const borrowTx = await this.lendingPool.borrow(amount);
      await borrowTx.wait();
      console.log(`✅ Borrowed ${amountStr} mUSDT`);
    } catch (error: any) {
      console.log(`❌ Borrow failed: ${error.message}`);
    }
  }

  async repayUSDT() {
    console.log("\n🟡 REPAY MOCK USDT");
    
    const position = await this.lendingPool.getPosition(this.wallet.address);
    const usdtBalance = await this.mockUSDT.balanceOf(this.wallet.address);
    
    console.log(`Current debt: ${ethers.formatUnits(position.borrow, 18)} mUSDT`);
    console.log(`Your balance: ${ethers.formatUnits(usdtBalance, 18)} mUSDT`);
    
    if (position.borrow === 0n) {
      console.log("❌ No debt to repay");
      return;
    }
    
    const amountStr = await question("Enter amount of Mock USDT to repay: ");
    if (!amountStr || isNaN(Number(amountStr))) {
      console.log("❌ Invalid amount");
      return;
    }
    
    const amount = ethers.parseUnits(amountStr, 18);
    
    if (amount > position.borrow) {
      console.log("❌ Amount exceeds debt");
      return;
    }
    
    if (amount > usdtBalance) {
      console.log("❌ Insufficient Mock USDT balance");
      return;
    }
    
    try {
      console.log("Approving Mock USDT...");
      const approveTx = await this.mockUSDT.approve(this.lendingPool.getAddress(), amount);
      await approveTx.wait();
      console.log("✅ Mock USDT approved");
      
      console.log("Repaying debt...");
      const repayTx = await this.lendingPool.repay(amount);
      await repayTx.wait();
      console.log(`✅ Repaid ${amountStr} mUSDT`);
    } catch (error: any) {
      console.log(`❌ Repay failed: ${error.message}`);
    }
  }

  async withdrawCollateral() {
    console.log("\n🔴 WITHDRAW NO2025");
    
    const position = await this.lendingPool.getPosition(this.wallet.address);
    console.log(`Available collateral: ${ethers.formatUnits(position.collateral, 18)} NO2025`);
    
    if (position.collateral === 0n) {
      console.log("❌ No collateral to withdraw");
      return;
    }
    
    const amountStr = await question("Enter amount of NO2025 to withdraw: ");
    if (!amountStr || isNaN(Number(amountStr))) {
      console.log("❌ Invalid amount");
      return;
    }
    
    const amount = ethers.parseUnits(amountStr, 18);
    
    if (amount > position.collateral) {
      console.log("❌ Amount exceeds available collateral");
      return;
    }
    
    try {
      console.log("Withdrawing collateral...");
      const withdrawTx = await this.lendingPool.withdraw(amount);
      await withdrawTx.wait();
      console.log(`✅ Withdrew ${amountStr} NO2025`);
    } catch (error: any) {
      console.log(`❌ Withdraw failed: ${error.message}`);
    }
  }

  async liquidatePosition() {
    console.log("\n⚡ LIQUIDATE POSITION");
    
    const userAddress = await question("Enter address to liquidate: ");
    if (!ethers.isAddress(userAddress)) {
      console.log("❌ Invalid address");
      return;
    }
    
    try {
      const position = await this.lendingPool.getPosition(userAddress);
      
      if (position.borrow === 0n) {
        console.log("❌ No debt to liquidate");
        return;
      }
      
      const ratio = await this.lendingPool.getCollateralizationRatio(position.collateral, position.borrow);
      console.log(`Position collateralization ratio: ${ratio.toString()}%`);
      
      if (ratio >= 150n) {
        console.log("❌ Position is not liquidatable (ratio >= 150%)");
        return;
      }
      
      const confirm = await question("Confirm liquidation? (y/n): ");
      if (confirm.toLowerCase() !== 'y') {
        console.log("❌ Liquidation cancelled");
        return;
      }
      
      const usdtBalance = await this.mockUSDT.balanceOf(this.wallet.address);
      if (usdtBalance < position.borrow) {
        console.log("❌ Insufficient Mock USDT balance for liquidation");
        return;
      }
      
      console.log("Approving Mock USDT for liquidation...");
      const approveTx = await this.mockUSDT.approve(this.lendingPool.getAddress(), position.borrow);
      await approveTx.wait();
      console.log("✅ Mock USDT approved");
      
      console.log("Liquidating position...");
      const liquidateTx = await this.lendingPool.liquidate(userAddress);
      await liquidateTx.wait();
      console.log(`✅ Position liquidated successfully`);
    } catch (error: any) {
      console.log(`❌ Liquidation failed: ${error.message}`);
    }
  }

  async mintMockUSDT() {
    console.log("\n🪙 MINT MOCK USDT (for testing)");
    
    const amountStr = await question("Enter amount of Mock USDT to mint: ");
    if (!amountStr || isNaN(Number(amountStr))) {
      console.log("❌ Invalid amount");
      return;
    }
    
    const amount = ethers.parseUnits(amountStr, 18);
    
    try {
      console.log("Minting Mock USDT...");
      const mintTx = await this.mockUSDT.mint(this.wallet.address, amount);
      await mintTx.wait();
      console.log(`✅ Minted ${amountStr} mUSDT to your wallet`);
    } catch (error: any) {
      console.log(`❌ Mint failed: ${error.message}`);
    }
  }

  async showMenu() {
    console.log("\n" + "=".repeat(60));
    console.log("📋 AVAILABLE ACTIONS:");
    console.log("1.  View Balances & Position");
    console.log("2.  View Pool Information");
    console.log("3.  Supply NO2025 (Collateral)");
    console.log("4.  Borrow Mock USDT");
    console.log("5.  Repay Mock USDT");
    console.log("6.  Withdraw NO2025");
    console.log("7.  Liquidate Position");
    console.log("8.  Mint Mock USDT (for testing)");
    console.log("9.  Refresh All Data");
    console.log("0.  Exit");
    console.log("=".repeat(60));
  }

  async refreshData() {
    await this.showHeader();
    await this.showBalances();
    await this.showPosition();
    await this.showPoolInfo();
  }

  async run() {
    await this.showHeader();
    await this.refreshData();
    
    while (true) {
      await this.showMenu();
      const choice = await question("Select an action (0-9): ");
      
      try {
        switch (choice) {
          case "0":
            console.log("👋 Goodbye!");
            rl.close();
            return;
          case "1":
            await this.refreshData();
            break;
          case "2":
            await this.showPoolInfo();
            break;
          case "3":
            await this.supplyCollateral();
            break;
          case "4":
            await this.borrowUSDT();
            break;
          case "5":
            await this.repayUSDT();
            break;
          case "6":
            await this.withdrawCollateral();
            break;
          case "7":
            await this.liquidatePosition();
            break;
          case "8":
            await this.mintMockUSDT();
            break;
          case "9":
            await this.refreshData();
            break;
          default:
            console.log("❌ Invalid choice. Please select 0-9.");
        }
        
        // Wait for user to see the result
        if (choice !== "0") {
          await question("\nPress Enter to continue...");
          await this.refreshData();
        }
      } catch (error: any) {
        console.log(`❌ Error: ${error.message}`);
        await question("\nPress Enter to continue...");
        await this.refreshData();
      }
    }
  }
}

async function main() {
  console.log("🚀 Starting NO2025 Lending Pool Interactor...");
  
  try {
    const interactor = new PoolInteractor();
    await interactor.run();
  } catch (error: any) {
    console.error("❌ Failed to start interactor:", error.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Interactor failed:", err);
  process.exit(1);
}); 