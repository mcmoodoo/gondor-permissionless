// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BnbBridge is ERC20, Ownable {
    mapping(address => bool) public bridges;
    mapping(uint256 => bool) public processedNonces;
    uint256 public burnNonce;
    
    event TokensMinted(address indexed to, uint256 amount, uint256 indexed nonce);
    event TokensBurned(address indexed from, uint256 amount, string polygonAddress, uint256 indexed nonce);
    
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
    
    function burnTokens(uint256 amount, string memory polygonAddress) external {
        require(amount > 0, "Amount must be greater than 0");
        require(bytes(polygonAddress).length > 0, "Invalid polygon address");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        burnNonce++;
        _burn(msg.sender, amount);
        
        emit TokensBurned(msg.sender, amount, polygonAddress, burnNonce);
    }
}
