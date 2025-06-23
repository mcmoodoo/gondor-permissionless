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
        address tokenAddress = 0x0000000000000000000000000000000000000000;
        polygonBridge = new PolygonBridge(tokenAddress);

        vm.stopBroadcast();
    }
}
