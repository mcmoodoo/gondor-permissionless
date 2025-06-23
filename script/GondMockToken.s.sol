// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {GondMockToken} from "../src/GondMockToken.sol";

contract GondMockTokenScript is Script {
    GondMockToken public gondMockToken;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        gondMockToken = new GondMockToken();
        
        console.log("GondMockToken deployed to:", address(gondMockToken));
        console.log("Token name:", gondMockToken.name());
        console.log("Token symbol:", gondMockToken.symbol());
        console.log("Deployer balance for token ID 1:", gondMockToken.balanceOf(msg.sender, gondMockToken.TOKEN_ID()));
        console.log("Initial supply constant:", gondMockToken.INITIAL_SUPPLY());

        vm.stopBroadcast();
    }
}