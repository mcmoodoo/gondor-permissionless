// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {BnbBridge} from "../src/BnbBridge.sol";
import {PolygonBridge} from "../src/PolygonBridge.sol";

contract AuthorizeRelayScript is Script {
    address constant POLYGON_BRIDGE_ADDRESS = 0x2aEc815125165402fd37da1a4C439255eF3b523b;
    address constant BNB_BRIDGE_ADDRESS = 0x502CBcDF1e2AfB7390Bd1E7855e8f77e5707c441;
    address constant RELAY_ADDRESS = 0x4186943CB75fA2a14427cF728C331FE627B9140c;

    function run() public {
        vm.startBroadcast();

        console.log("Authorizing relay service on both bridges...");
        console.log("Relay Address:", RELAY_ADDRESS);

        // Authorize on BNB Bridge
        BnbBridge bnbBridge = BnbBridge(BNB_BRIDGE_ADDRESS);
        if (!bnbBridge.bridges(RELAY_ADDRESS)) {
            console.log("Adding bridge authorization to BNB Bridge...");
            bnbBridge.addBridge(RELAY_ADDRESS);
        } else {
            console.log("BNB Bridge already authorized");
        }

        // Authorize on Polygon Bridge
        PolygonBridge polygonBridge = PolygonBridge(POLYGON_BRIDGE_ADDRESS);
        if (!polygonBridge.bridges(RELAY_ADDRESS)) {
            console.log("Adding bridge authorization to Polygon Bridge...");
            polygonBridge.addBridge(RELAY_ADDRESS);
        } else {
            console.log("Polygon Bridge already authorized");
        }

        console.log("Authorization complete!");

        vm.stopBroadcast();
    }
}