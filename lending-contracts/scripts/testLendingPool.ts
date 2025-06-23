import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { SimpleLendingPool__factory, MockRecessionNO__factory, MockUSDT__factory } from "../typechain-types";

dotenv.config();

const RPC_URL = process.env.RPC_URL!;
const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const LENDING_POOL_ADDRESS = process.env.LENDING_POOL_ADDRESS!;
const MOCK_TOKEN = process.env.MOCK_TOKEN!;
const MOCK_USDT_ADDRESS = process.env.MOCK_USDT_ADDRESS!;

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("🧪 Testing SimpleLendingPool with Mock Tokens...\n");

  // Initialize contracts
  const lendingPool = SimpleLendingPool__factory.connect(LENDING_POOL_ADDRESS, wallet);
  const mockToken = MockRecessionNO__factory.connect(MOCK_TOKEN, wallet);
  const mockUSDT = MockUSDT__factory.connect(MOCK_USDT_ADDRESS, wallet);

  // Check balances
  const noBalance = await mockToken.balanceOf(wallet.address);
  const usdtBalance = await mockUSDT.balanceOf(wallet.address);
  
  console.log(`💰 Balances:`);
  console.log(`   NO2025: ${ethers.formatUnits(noBalance, 18)}`);
  console.log(`   Mock USDT: ${ethers.formatUnits(usdtBalance, 18)}`);

  // Get initial pool info
  const initialPoolInfo = await lendingPool.getPoolInfo();
  console.log(`\n📊 Initial Pool Info:`);
  console.log(`   Total Collateral: ${ethers.formatUnits(initialPoolInfo.totalCollateralAmount, 18)} NO2025`);
  console.log(`   Total Borrowed: ${ethers.formatUnits(initialPoolInfo.totalBorrowedAmount, 18)} mUSDT`);
  console.log(`   Available Liquidity: ${ethers.formatUnits(initialPoolInfo.availableLiquidity, 18)} mUSDT`);
  console.log(`   Utilization Rate: ${initialPoolInfo.utilizationRate.toString()}%`);
  console.log(`   Current Rate: ${initialPoolInfo.currentRate.toString()} basis points`);

  // Test 1: Supply NO2025 as collateral
  console.log(`\n🔵 Test 1: Supply NO2025 as collateral`);
  const supplyAmount = ethers.parseUnits("100", 18); // 100 NO2025
  
  if (noBalance >= supplyAmount) {
    try {
      // Approve NO2025 spending
      const approveTx = await mockToken.approve(LENDING_POOL_ADDRESS, supplyAmount);
      await approveTx.wait();
      console.log(`   ✅ NO2025 approved for lending pool`);
      
      // Supply collateral
      const supplyTx = await lendingPool.supply(supplyAmount);
      await supplyTx.wait();
      console.log(`   ✅ Supplied ${ethers.formatUnits(supplyAmount, 18)} NO2025 as collateral`);
    } catch (error: any) {
      console.log(`   ❌ Supply failed: ${error.message}`);
    }
  } else {
    console.log(`   ⚠️  Insufficient NO2025 balance for supply test`);
  }

  // Get position after supply
  const positionAfterSupply = await lendingPool.getPosition(wallet.address);
  console.log(`   Position after supply:`);
  console.log(`     Collateral: ${ethers.formatUnits(positionAfterSupply.collateral, 18)} NO2025`);
  console.log(`     Borrowed: ${ethers.formatUnits(positionAfterSupply.borrow, 18)} mUSDT`);
  console.log(`     Borrowable: ${ethers.formatUnits(positionAfterSupply.borrowable, 18)} mUSDT`);

  // Test 2: Borrow Mock USDT
  console.log(`\n🟢 Test 2: Borrow Mock USDT`);
  const borrowAmount = ethers.parseUnits("50", 18); // 50 mUSDT
  
  if (positionAfterSupply.borrowable >= borrowAmount) {
    try {
      const borrowTx = await lendingPool.borrow(borrowAmount);
      await borrowTx.wait();
      console.log(`   ✅ Borrowed ${ethers.formatUnits(borrowAmount, 18)} mUSDT`);
    } catch (error: any) {
      console.log(`   ❌ Borrow failed: ${error.message}`);
    }
  } else {
    console.log(`   ⚠️  Insufficient borrowable amount (need ${ethers.formatUnits(borrowAmount, 18)} mUSDT, have ${ethers.formatUnits(positionAfterSupply.borrowable, 18)} mUSDT)`);
  }

  // Get position after borrow
  const positionAfterBorrow = await lendingPool.getPosition(wallet.address);
  console.log(`   Position after borrow:`);
  console.log(`     Collateral: ${ethers.formatUnits(positionAfterBorrow.collateral, 18)} NO2025`);
  console.log(`     Borrowed: ${ethers.formatUnits(positionAfterBorrow.borrow, 18)} mUSDT`);
  console.log(`     Borrowable: ${ethers.formatUnits(positionAfterBorrow.borrowable, 18)} mUSDT`);

  // Test 3: Repay Mock USDT
  console.log(`\n🟡 Test 3: Repay Mock USDT`);
  const repayAmount = ethers.parseUnits("25", 18); // 25 mUSDT
  
  if (positionAfterBorrow.borrow >= repayAmount) {
    try {
      // Approve Mock USDT spending
      const approveTx = await mockUSDT.approve(LENDING_POOL_ADDRESS, repayAmount);
      await approveTx.wait();
      console.log(`   ✅ Mock USDT approved for repayment`);
      
      // Repay debt
      const repayTx = await lendingPool.repay(repayAmount);
      await repayTx.wait();
      console.log(`   ✅ Repaid ${ethers.formatUnits(repayAmount, 18)} mUSDT`);
    } catch (error: any) {
      console.log(`   ❌ Repay failed: ${error.message}`);
    }
  } else {
    console.log(`   ⚠️  No debt to repay or insufficient amount`);
  }

  // Get position after repay
  const positionAfterRepay = await lendingPool.getPosition(wallet.address);
  console.log(`   Position after repay:`);
  console.log(`     Collateral: ${ethers.formatUnits(positionAfterRepay.collateral, 18)} NO2025`);
  console.log(`     Borrowed: ${ethers.formatUnits(positionAfterRepay.borrow, 18)} mUSDT`);
  console.log(`     Borrowable: ${ethers.formatUnits(positionAfterRepay.borrowable, 18)} mUSDT`);

  // Test 4: Withdraw NO2025
  console.log(`\n🔴 Test 4: Withdraw NO2025`);
  const withdrawAmount = ethers.parseUnits("25", 18); // 25 NO2025
  
  if (positionAfterRepay.collateral >= withdrawAmount) {
    try {
      const withdrawTx = await lendingPool.withdraw(withdrawAmount);
      await withdrawTx.wait();
      console.log(`   ✅ Withdrew ${ethers.formatUnits(withdrawAmount, 18)} NO2025`);
    } catch (error: any) {
      console.log(`   ❌ Withdraw failed: ${error.message}`);
    }
  } else {
    console.log(`   ⚠️  Insufficient collateral for withdrawal`);
  }

  // Final position
  const finalPosition = await lendingPool.getPosition(wallet.address);
  console.log(`\n📋 Final Position:`);
  console.log(`   Collateral: ${ethers.formatUnits(finalPosition.collateral, 18)} NO2025`);
  console.log(`   Borrowed: ${ethers.formatUnits(finalPosition.borrow, 18)} mUSDT`);
  console.log(`   Borrowable: ${ethers.formatUnits(finalPosition.borrowable, 18)} mUSDT`);

  // Final pool info
  const finalPoolInfo = await lendingPool.getPoolInfo();
  console.log(`\n📊 Final Pool Info:`);
  console.log(`   Total Collateral: ${ethers.formatUnits(finalPoolInfo.totalCollateralAmount, 18)} NO2025`);
  console.log(`   Total Borrowed: ${ethers.formatUnits(finalPoolInfo.totalBorrowedAmount, 18)} mUSDT`);
  console.log(`   Available Liquidity: ${ethers.formatUnits(finalPoolInfo.availableLiquidity, 18)} mUSDT`);
  console.log(`   Utilization Rate: ${finalPoolInfo.utilizationRate.toString()}%`);
  console.log(`   Current Rate: ${finalPoolInfo.currentRate.toString()} basis points`);

  console.log(`\n✅ Lending pool test completed!`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}); 