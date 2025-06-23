# Gondor BNB Hackathon - NO2025 Lending Pool

A permissionless lending pool on BNB Chain for borrowing Mock USDT against NO2025 (MockRecessionNO) collateral.

## Overview

This project implements a simple lending pool that allows users to:
- Supply NO2025 tokens as collateral
- Borrow Mock USDT against their collateral
- Repay their debt
- Withdraw their collateral
- Liquidate undercollateralized positions

**Note:** This project uses mock tokens for testing purposes. No real money is involved.

## Contracts

### SimpleLendingPool.sol
The main lending pool contract with the following features:

**Parameters:**
- Collateralization Ratio: 200% (2x)
- Liquidation Threshold: 150% (1.5x)
- Liquidation Penalty: 5%
- Base Interest Rate: 5%
- Rate Slope: 10%
- Optimal Utilization: 80%

**Key Functions:**
- `supply(amount)` - Supply NO2025 as collateral
- `borrow(amount)` - Borrow Mock USDT against collateral
- `repay(amount)` - Repay Mock USDT debt
- `withdraw(amount)` - Withdraw NO2025 collateral
- `liquidate(user)` - Liquidate undercollateralized position
- `getPosition(user)` - Get user's position details
- `getPoolInfo()` - Get pool statistics

### MockRecessionNO.sol
A mock ERC-20 token representing the "NO" share for a Polymarket event about US recession in 2025.

### MockUSDT.sol
A mock ERC-20 token that mimics USDT on BNB Chain for testing purposes. Includes minting functionality for easy testing.

### FixedOracle.sol
A simple price oracle that returns a fixed $1 price for NO2025 (easily replaceable with a real oracle).

### PolymarketOracle.sol
A live price oracle that fetches NO2025 prices from Polymarket's prediction market. Features:
- Real-time price updates from Polymarket API
- Authorized updater system for security
- Price validation and event emission
- Compatible with the lending pool for live pricing

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env`:
```env
RPC_URL=https://bsc-dataseed.binance.org/
PRIVATE_KEY=your_private_key_here
ORACLE_ADDRESS=deployed_polymarket_oracle_address
MOCK_TOKEN=deployed_mock_token_address
MOCK_USDT_ADDRESS=deployed_mock_usdt_address
LENDING_POOL_ADDRESS=deployed_lending_pool_address
```

3. Deploy contracts:
```bash
# Deploy MockRecessionNO token and PolymarketOracle
npx hardhat run scripts/deploy.ts --network bsc

# Deploy Mock USDT and SimpleLendingPool (with oracle)
npx hardhat run scripts/deployLendingPool.ts --network bsc
```

4. Test the oracle:
```bash
# Test oracle functionality
npm run oracle:test

# Update oracle manually
npm run oracle:update

# Start automated oracle daemon (updates every 5 minutes)
npm run oracle:daemon
```

5. Test the lending pool:
```bash
npx hardhat run scripts/testLendingPool.ts --network bsc
```

6. Interactive interface:
```bash
npx hardhat run scripts/interact.ts --network bsc
```

## Oracle Management

### Manual Updates
To manually update the oracle with the latest NO price:
```bash
npm run oracle:update
```

### Automated Updates
To run the oracle daemon that automatically updates prices every 5 minutes:
```bash
npm run oracle:daemon
```

The daemon will:
- Fetch current NO price from Polymarket API
- Only update if price change is > 0.1% (to save gas)
- Log all updates and transactions
- Handle errors gracefully
- Support graceful shutdown (Ctrl+C)

### Testing Oracle
To verify the oracle is working correctly:
```bash
npm run oracle:test
```

This will test:
- Current oracle state
- API connectivity
- Price update functionality
- Peek function accuracy

## Usage

### Adding Initial Liquidity
The pool creator can add initial Mock USDT liquidity:
```solidity
lendingPool.addInitialLiquidity(amount);
```

### User Operations

1. **Supply Collateral:**
   ```solidity
   // Approve NO2025 spending
   mockToken.approve(lendingPoolAddress, amount);
   // Supply collateral
   lendingPool.supply(amount);
   ```

2. **Borrow Mock USDT:**
   ```solidity
   lendingPool.borrow(amount);
   ```

3. **Repay Debt:**
   ```solidity
   // Approve Mock USDT spending
   mockUSDT.approve(lendingPoolAddress, amount);
   // Repay debt
   lendingPool.repay(amount);
   ```

4. **Withdraw Collateral:**
   ```solidity
   lendingPool.withdraw(amount);
   ```

### Liquidation
Anyone can liquidate undercollateralized positions:
```solidity
lendingPool.liquidate(userAddress);
```

### Testing with Mock Tokens
For testing purposes, you can mint additional Mock USDT:
```solidity
mockUSDT.mint(address, amount); // Owner only
```

## Interest Rate Model

The pool uses a dynamic interest rate model:
- Base rate: 5%
- Rate increases linearly with utilization up to 80%
- Rate increases exponentially above 80% utilization
- Interest accrues continuously

## Security Features

- Reentrancy protection
- Collateralization ratio checks
- Liquidation mechanism
- Owner controls for emergency functions
- No flash loans (as requested)

## Testing Strategy

This project uses mock tokens to ensure safe testing:
- **MockRecessionNO**: Represents the NO2025 token
- **MockUSDT**: Represents USDT for borrowing/lending
- **FixedOracle**: Provides a stable $1 price for testing

This approach allows you to test all functionality without risking real funds.

## Future Improvements

- Replace fixed price oracle with real price feed
- Add more sophisticated interest rate models
- Implement governance mechanisms
- Add support for multiple collateral types
- Add flash loan functionality
- Replace mock tokens with real tokens for production

## License

MIT
