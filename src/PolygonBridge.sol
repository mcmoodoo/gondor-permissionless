// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PolygonBridge is ReentrancyGuard, Ownable, ERC1155Holder {
    IERC1155 public token;
    
    event TokensLocked(
        address indexed user,
        uint256 indexed tokenId,
        uint256 amount,
        string destinationAddress,
        uint256 indexed nonce
    );
    
    mapping(uint256 => bool) public processedNonces;
    uint256 public currentNonce;
    
    constructor(address _token) Ownable(msg.sender) {
        token = IERC1155(_token);
    }
    
    function lockTokens(uint256 tokenId, uint256 amount, string memory destinationAddress) 
        external 
        nonReentrant 
    {
        require(amount > 0, "Amount must be positive");
        token.safeTransferFrom(msg.sender, address(this), tokenId, amount, "");
        
        currentNonce++;
        emit TokensLocked(msg.sender, tokenId, amount, destinationAddress, currentNonce);
    }
}
