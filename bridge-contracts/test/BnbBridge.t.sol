// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Test, console} from "forge-std/Test.sol";
import {BnbBridge} from "../src/BnbBridge.sol";

contract BnbBridgeTest is Test {
    BnbBridge public bridge;
    address public owner = address(0x1);
    address public user = address(0x2);
    address public relayService = address(0x3);

    function setUp() public {
        vm.startPrank(owner);
        bridge = new BnbBridge("TestToken", "TEST");
        bridge.addBridge(relayService);
        vm.stopPrank();
    }

    function test_burnTokens() public {
        uint256 mintAmount = 1000 * 10**18;
        uint256 burnAmount = 500 * 10**18;
        
        vm.prank(relayService);
        bridge.mintTokens(user, mintAmount, 1);
        
        assertEq(bridge.balanceOf(user), mintAmount);
        
        vm.prank(user);
        bridge.burnTokens(burnAmount, "0x1234567890123456789012345678901234567890");
        
        assertEq(bridge.balanceOf(user), mintAmount - burnAmount);
        assertEq(bridge.burnNonce(), 1);
    }

    function test_burnTokens_revertsOnZeroAmount() public {
        vm.prank(user);
        vm.expectRevert("Amount must be greater than 0");
        bridge.burnTokens(0, "0x1234567890123456789012345678901234567890");
    }

    function test_burnTokens_revertsOnEmptyAddress() public {
        vm.prank(user);
        vm.expectRevert("Invalid polygon address");
        bridge.burnTokens(100, "");
    }

    function test_burnTokens_revertsOnInsufficientBalance() public {
        vm.prank(user);
        vm.expectRevert("Insufficient balance");
        bridge.burnTokens(100, "0x1234567890123456789012345678901234567890");
    }
}