// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockUSDT is ERC20, Ownable {
    uint8 private _decimals = 18; // USDT on BNB Chain has 18 decimals
    
    constructor() ERC20("Mock USDT", "mUSDT") Ownable(msg.sender) {
        // Mint initial supply to deployer
        _mint(msg.sender, 1000000 * 10**18); // 1M USDT
    }
    
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    
    // Mint function for testing (owner only)
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    // Burn function for testing
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
} 