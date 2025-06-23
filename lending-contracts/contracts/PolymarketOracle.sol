// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract PolymarketOracle is Ownable {
    uint256 public latestPrice; // 8 decimals, e.g. 0.12345678 USDC per NO share
    uint256 public lastUpdated;
    address public updater;

    event PriceUpdated(uint256 newPrice, uint256 timestamp);
    event UpdaterChanged(address indexed newUpdater);

    modifier onlyUpdater() {
        require(msg.sender == updater || msg.sender == owner(), "Not authorized");
        _;
    }

    constructor(address _updater) Ownable(msg.sender) {
        updater = _updater;
    }

    function setUpdater(address _updater) external onlyOwner {
        updater = _updater;
        emit UpdaterChanged(_updater);
    }

    function updatePrice(uint256 _newPrice) external onlyUpdater {
        require(_newPrice <= 1e8, "Price must be <= 1 USDC");
        latestPrice = _newPrice;
        lastUpdated = block.timestamp;
        emit PriceUpdated(_newPrice, block.timestamp);
    }

    function peek() external view returns (uint256) {
        return latestPrice;
    }
} 