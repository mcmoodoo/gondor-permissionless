// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FixedOracle {
    uint256 public constant FIXED_PRICE = 1e8;

    function peek(address /*asset*/) external pure returns (uint256) {
        return FIXED_PRICE;
    }
}