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
        console.log("Initial supply:", gondMockToken.totalSupply());
        console.log("Deployer balance:", gondMockToken.balanceOf(msg.sender));

        vm.stopBroadcast();
    }
}