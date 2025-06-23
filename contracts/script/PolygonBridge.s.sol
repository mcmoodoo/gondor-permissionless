// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {PolygonBridge} from "../src/PolygonBridge.sol";

contract PolygonBridgeScript is Script {
    PolygonBridge public polygonBridge;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        // Deploy with a placeholder token address - update this to actual token address
        address tokenAddress = 0x3200610BE7fc0e2EebEB92D005e261Cc23453B66;
        polygonBridge = new PolygonBridge(tokenAddress);

        vm.stopBroadcast();
    }
}
