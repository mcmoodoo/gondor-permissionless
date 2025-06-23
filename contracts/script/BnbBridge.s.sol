// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {BnbBridge} from "../src/BnbBridge.sol";

contract BnbBridgeScript is Script {
    BnbBridge public bnbBridge;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        bnbBridge = new BnbBridge("recessionNo", "recNo");

        vm.stopBroadcast();
    }
}
