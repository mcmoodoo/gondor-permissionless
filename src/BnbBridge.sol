// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BnbBridge is ERC20, Ownable {
    mapping(address => bool) public bridges;
    mapping(uint256 => bool) public processedNonces;
    
    event TokensMinted(address indexed to, uint256 amount, uint256 indexed nonce);
    
    constructor(string memory name, string memory symbol) ERC20(name, symbol) Ownable(msg.sender) {}
    
    modifier onlyBridge() {
        require(bridges[msg.sender], "Not authorized bridge");
        _;
    }
    
    function addBridge(address bridge) external onlyOwner {
        bridges[bridge] = true;
    }
    
    function mintTokens(
        address to, 
        uint256 amount, 
        uint256 nonce
    ) external onlyBridge {
        require(!processedNonces[nonce], "Nonce already processed");
        
        processedNonces[nonce] = true;
        _mint(to, amount);
        
        emit TokensMinted(to, amount, nonce);
    }
}
