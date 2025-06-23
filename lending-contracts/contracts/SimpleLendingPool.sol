// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IPolymarketOracle {
    function peek() external view returns (uint256);
}

contract SimpleLendingPool is ReentrancyGuard, Ownable {
    IERC20 public immutable collateralToken; // NO2025
    IERC20 public immutable borrowToken; // USDT
    
    // Lending parameters
    uint256 public constant COLLATERALIZATION_RATIO = 2e18; // 2x, 18 decimals
    uint256 public constant LIQUIDATION_THRESHOLD = 150; // 150% = 1.5x
    uint256 public constant LIQUIDATION_PENALTY = 5; // 5%
    
    // Price oracle (simple fixed price for now, easily replaceable)
    uint256 public constant PRECISION = 1e18;
    address public oracle;
    
    // Dynamic interest rate parameters
    uint256 public constant BASE_RATE = 500; // 5% base rate (500 basis points)
    uint256 public constant RATE_SLOPE = 1000; // 10% slope (1000 basis points)
    uint256 public constant OPTIMAL_UTILIZATION = 800000; // 80% optimal utilization
    
    struct Position {
        uint256 collateralAmount;
        uint256 borrowAmount;
        uint256 lastUpdateTime;
    }
    
    mapping(address => Position) public positions;
    uint256 public totalCollateral;
    uint256 public totalBorrowed;
    uint256 public totalReserves;
    uint256 public lastGlobalUpdateTime;
    
    event Supply(address indexed user, uint256 amount);
    event Borrow(address indexed user, uint256 amount);
    event Repay(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event Liquidate(address indexed user, address indexed liquidator, uint256 collateralAmount, uint256 repayAmount);
    event InterestAccrued(uint256 totalBorrowed, uint256 totalReserves);
    
    constructor(address _collateralToken, address _borrowToken, address _oracle) Ownable(msg.sender) {
        collateralToken = IERC20(_collateralToken);
        borrowToken = IERC20(_borrowToken);
        oracle = _oracle;
        lastGlobalUpdateTime = block.timestamp;
    }
    
    // Add initial liquidity (owner only)
    function addInitialLiquidity(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        require(borrowToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        totalReserves += amount;
    }
    
    function supply(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(collateralToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        positions[msg.sender].collateralAmount += amount;
        totalCollateral += amount;
        
        emit Supply(msg.sender, amount);
    }
    
    function borrow(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(getBorrowableAmount(msg.sender) >= amount, "Insufficient borrowable amount");
        require(borrowToken.balanceOf(address(this)) >= amount, "Insufficient liquidity");
        
        // Accrue interest before borrowing
        accrueInterest();
        
        positions[msg.sender].borrowAmount += amount;
        totalBorrowed += amount;
        
        require(borrowToken.transfer(msg.sender, amount), "Transfer failed");
        
        emit Borrow(msg.sender, amount);
    }
    
    function repay(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(positions[msg.sender].borrowAmount >= amount, "Repay amount exceeds borrow");
        require(borrowToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        // Accrue interest before repaying
        accrueInterest();
        
        positions[msg.sender].borrowAmount -= amount;
        totalBorrowed -= amount;
        
        emit Repay(msg.sender, amount);
    }
    
    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(positions[msg.sender].collateralAmount >= amount, "Insufficient collateral");
        
        // Check if withdrawal would make position unsafe
        uint256 newCollateral = positions[msg.sender].collateralAmount - amount;
        uint256 borrowAmount = positions[msg.sender].borrowAmount;
        
        if (borrowAmount > 0) {
            require(getCollateralizationRatio(newCollateral, borrowAmount) >= COLLATERALIZATION_RATIO, "Position would be unsafe");
        }
        
        positions[msg.sender].collateralAmount = newCollateral;
        totalCollateral -= amount;
        
        require(collateralToken.transfer(msg.sender, amount), "Transfer failed");
        
        emit Withdraw(msg.sender, amount);
    }
    
    function liquidate(address user) external nonReentrant {
        Position storage position = positions[user];
        require(position.borrowAmount > 0, "No debt to liquidate");
        
        uint256 collateralizationRatio = getCollateralizationRatio(position.collateralAmount, position.borrowAmount);
        require(collateralizationRatio < LIQUIDATION_THRESHOLD, "Position not liquidatable");
        
        uint256 price = getOraclePrice();
        uint256 repayAmount = position.borrowAmount;
        uint256 liquidatedCollateral = (repayAmount * PRECISION) / price;
        
        // Apply liquidation penalty
        uint256 penalty = (liquidatedCollateral * LIQUIDATION_PENALTY) / 100;
        uint256 totalLiquidatedCollateral = liquidatedCollateral + penalty;
        
        require(totalLiquidatedCollateral <= position.collateralAmount, "Insufficient collateral for liquidation");
        
        // Transfer borrow tokens from liquidator
        require(borrowToken.transferFrom(msg.sender, address(this), repayAmount), "Repay transfer failed");
        
        // Update position
        position.borrowAmount = 0;
        position.collateralAmount -= totalLiquidatedCollateral;
        totalBorrowed -= repayAmount;
        totalCollateral -= totalLiquidatedCollateral;
        
        // Transfer collateral to liquidator
        require(collateralToken.transfer(msg.sender, totalLiquidatedCollateral), "Collateral transfer failed");
        
        emit Liquidate(user, msg.sender, totalLiquidatedCollateral, repayAmount);
    }
    
    function getBorrowableAmount(address user) public view returns (uint256) {
        Position storage position = positions[user];
        if (position.collateralAmount == 0) return 0;
        
        uint256 price = getOraclePrice();
        uint256 collateralValue = (position.collateralAmount * price) / PRECISION;
        uint256 maxBorrow = (collateralValue * 1e18) / COLLATERALIZATION_RATIO;
        
        if (position.borrowAmount >= maxBorrow) return 0;
        return maxBorrow - position.borrowAmount;
    }
    
    function getCollateralizationRatio(uint256 collateral, uint256 borrow) public view returns (uint256) {
        if (borrow == 0) return type(uint256).max;
        uint256 price = getOraclePrice();
        return (collateral * price * 1e18) / (borrow * PRECISION);
    }
    
    function getPosition(address user) external view returns (uint256 collateral, uint256 borrow, uint256 borrowable) {
        Position storage position = positions[user];
        collateral = position.collateralAmount;
        borrow = position.borrowAmount;
        borrowable = getBorrowableAmount(user);
    }
    
    function getPoolInfo() external view returns (
        uint256 totalCollateralAmount, 
        uint256 totalBorrowedAmount, 
        uint256 availableLiquidity,
        uint256 utilizationRate,
        uint256 currentRate
    ) {
        totalCollateralAmount = totalCollateral;
        totalBorrowedAmount = totalBorrowed;
        availableLiquidity = borrowToken.balanceOf(address(this));
        utilizationRate = getUtilizationRate();
        currentRate = getCurrentRate();
    }
    
    function getUtilizationRate() public view returns (uint256) {
        uint256 totalSupply = totalBorrowed + totalReserves;
        if (totalSupply == 0) return 0;
        return (totalBorrowed * 1000000) / totalSupply; // 6 decimals
    }
    
    function getCurrentRate() public view returns (uint256) {
        uint256 utilization = getUtilizationRate();
        
        if (utilization <= OPTIMAL_UTILIZATION) {
            // Linear increase from base rate to base + slope
            return BASE_RATE + (utilization * RATE_SLOPE) / OPTIMAL_UTILIZATION;
        } else {
            // Exponential increase after optimal utilization
            uint256 excessUtilization = utilization - OPTIMAL_UTILIZATION;
            uint256 excessRate = (excessUtilization * RATE_SLOPE * 2) / (1000000 - OPTIMAL_UTILIZATION);
            return BASE_RATE + RATE_SLOPE + excessRate;
        }
    }
    
    function accrueInterest() internal {
        if (totalBorrowed == 0) return;
        
        uint256 rate = getCurrentRate();
        uint256 timeElapsed = block.timestamp - lastGlobalUpdateTime;
        
        if (timeElapsed > 0) {
            uint256 interest = (totalBorrowed * rate * timeElapsed) / (365 days * 10000); // 4 decimals for rate
            totalBorrowed += interest;
            totalReserves += interest;
            
            emit InterestAccrued(totalBorrowed, totalReserves);
        }
        
        lastGlobalUpdateTime = block.timestamp;
    }
    
    // Owner functions for pool management
    function withdrawReserves(uint256 amount) external onlyOwner {
        require(amount <= totalReserves, "Insufficient reserves");
        totalReserves -= amount;
        require(borrowToken.transfer(owner(), amount), "Transfer failed");
    }
    
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
    
    // Oracle replacement function (for future use)
    function setOracle(address newOracle) external onlyOwner {
        oracle = newOracle;
    }
    
    function getOraclePrice() public view returns (uint256) {
        // Returns price with 8 decimals, scale to 18 decimals for internal math
        uint256 price8 = IPolymarketOracle(oracle).peek();
        require(price8 > 0, "Oracle price not set");
        return price8 * 1e10; // scale 8 -> 18 decimals
    }
    
    /**
     * @dev Mint collateral tokens directly to the pool and credit them as collateral for a user.
     * Can only be called by the contract owner (or trusted minter).
     * The pool must have approval to transferFrom the minter.
     */
    function mintAndSupplyFor(address user, uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        require(collateralToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        positions[user].collateralAmount += amount;
        totalCollateral += amount;
        emit Supply(user, amount);
    }
} 