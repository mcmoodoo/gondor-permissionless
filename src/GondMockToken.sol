// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GondMockToken is ERC1155, Ownable {
    uint256 public constant TOKEN_ID = 1;
    uint256 public constant INITIAL_SUPPLY = 1000000 * 10**18; // 1 million tokens
    
    constructor() ERC1155("") Ownable(msg.sender) {
        _mint(msg.sender, TOKEN_ID, INITIAL_SUPPLY, "");
    }
    
    function mint(address to, uint256 id, uint256 amount, bytes calldata data) external onlyOwner {
        _mint(to, id, amount, data);
    }
    
    function mintBatch(address to, uint256[] calldata ids, uint256[] calldata amounts, bytes calldata data) external onlyOwner {
        _mintBatch(to, ids, amounts, data);
    }
    
    function burn(address from, uint256 id, uint256 amount) external {
        require(from == msg.sender || isApprovedForAll(from, msg.sender), "Caller is not token owner or approved");
        _burn(from, id, amount);
    }
    
    function burnBatch(address from, uint256[] calldata ids, uint256[] calldata amounts) external {
        require(from == msg.sender || isApprovedForAll(from, msg.sender), "Caller is not token owner or approved");
        _burnBatch(from, ids, amounts);
    }
    
    function name() public pure returns (string memory) {
        return "GondMockToken";
    }
    
    function symbol() public pure returns (string memory) {
        return "GMT";
    }
}