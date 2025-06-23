I've got the contract on Polygon, does it emit a log? Let's call it and see? Yeah it does!

Now, let's check the owner for each the lock on Polygon and mint on Bnb! Ok, I'm the owner, but I can always transfer the ownership!

Now, let the owner add the bridge! Bridge added. Confirmed. Let's move on.

What's next? Bridging tokens? I believe so! Let's make sure the 1155 token on Polygon can be deposited, event emitted, and then manually invoke
the Bnb Bridge to mint the same amount of ERC 20 on BNB!

## Plan

### Current Smart Contract Implementation Status

#### ✅ Completed Components

1. **GondMockToken (ERC1155)** - `src/GondMockToken.sol`

   - ERC1155 token contract deployed on Polygon
   - Initial supply: 1,000,000 tokens (ID: 1)
   - Owner-controlled minting and burning capabilities
   - Token name: "GondMockToken", Symbol: "GMT"

2. **PolygonBridge** - `src/PolygonBridge.sol`

   - Handles token locking on Polygon side
   - Accepts ERC1155 tokens and locks them in the contract
   - Emits `TokensLocked` event with nonce for cross-chain tracking
   - Reentrancy protection and owner controls
   - Token address configured: `0x3200610BE7fc0e2EebEB92D005e261Cc23453B66`

3. **BnbBridge (ERC20)** - `src/BnbBridge.sol`
   - ERC20 token contract on BNB Chain
   - Bridge-controlled minting with nonce protection
   - Owner can authorize bridge addresses
   - Token name: "recessionNo", Symbol: "recNo"
   - Prevents double-spending via processed nonces mapping

#### 🔧 Current Bridge Workflow

- **Step 1**: User deposits ERC1155 tokens to PolygonBridge contract
- **Step 2**: Contract locks tokens and emits `TokensLocked` event with nonce
- **Step 3**: Off-chain relay service (manual for now) detects the event
- **Step 4**: Relay calls `mintTokens()` on BnbBridge with same amount and nonce
- **Step 5**: ERC20 tokens minted on BNB Chain to user's address

#### 🎯 Bridge Status

- Polygon lock contract: ✅ Deployed and functional
- BNB mint contract: ✅ Deployed and functional
- Owner permissions: ✅ Configured on both chains
- Bridge authorization: ✅ Added to BNB contract
- Event emission: ✅ Confirmed working on Polygon
- Cross-chain token bridging: 🔄 Ready for testing

## Reverse Bridging

✅ Reverse bridging implemented successfully! Here's what was added:

BnbBridge.sol (src/BnbBridge.sol:12,39-47):

- Added TokensBurned event
- Added burnNonce state variable
- Added burnTokens() function to burn ERC20 tokens with destination Polygon address

PolygonBridge.sol (src/PolygonBridge.sol:20-25,55-68):

- Added TokensUnlocked event
- Added bridges mapping and onlyBridge modifier
- Added unlockTokens() function to release locked ERC1155 tokens

relay-service.js (relay-service.js:143-158,303-396):

- Added TokensBurned event listener on BNB chain
- Added handleTokensBurned() to process burn events
- Added relayToPolygonChain() to unlock tokens on Polygon
- Enhanced error handling and nonce tracking for reverse operations

The complete flow now works bidirectionally:

1. Forward: Lock ERC1155 on Polygon → Mint ERC20 on BNB
2. Reverse: Burn ERC20 on BNB → Unlock ERC1155 on Polygon

Users can now call burnTokens(amount, polygonAddress) on BNB chain to trigger the reverse bridge back to their original tokens on
Polygon.
