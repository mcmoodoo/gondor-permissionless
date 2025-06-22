// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PolygonBridge is ReentrancyGuard, Ownable {
    IERC20 public token;
    
    event TokensLocked(
        address indexed user,
        uint256 amount,
        string destinationAddress,
        uint256 indexed nonce
    );
    
    mapping(uint256 => bool) public processedNonces;
    uint256 public currentNonce;
    
    constructor(address _token) Ownable(msg.sender) {
        token = IERC20(_token);
    }
    
    function lockTokens(uint256 amount, string memory destinationAddress) 
        external 
        nonReentrant 
    {
        require(amount > 0, "Amount must be positive");
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        currentNonce++;
        emit TokensLocked(msg.sender, amount, destinationAddress, currentNonce);
    }
}
