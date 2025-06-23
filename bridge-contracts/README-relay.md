# Bridge Relay Service

A WebSocket-based relay service that listens for `TokensLocked` events on Polygon and automatically mints equivalent tokens on BNB Chain.

## Architecture

```
Polygon Chain (ERC1155)  →  WebSocket Listener  →  BNB Chain (ERC20)
     PolygonBridge      →     Relay Service     →     BnbBridge
```

## Features

- **Real-time Event Detection**: Uses WebSocket RPC to listen for `TokensLocked` events
- **Cross-chain Minting**: Automatically triggers token minting on BNB Chain  
- **Nonce Deduplication**: Prevents double-minting with processed nonce tracking
- **Block Confirmations**: Waits for confirmations to reduce reorg risk
- **Auto-reconnection**: Handles WebSocket disconnections gracefully
- **Gas Management**: Dynamic gas price estimation with safety buffers
- **Error Handling**: Comprehensive error handling and retry logic

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# RPC Endpoints
POLYGON_WSS_RPC=wss://polygon-mainnet.g.alchemy.com/v2/your-alchemy-key
BNB_RPC=https://bsc-dataseed1.binance.org

# Contract Addresses  
POLYGON_BRIDGE_ADDRESS=0x...
BNB_BRIDGE_ADDRESS=0x...

# Relay Wallet Private Key
RELAY_PRIVATE_KEY=0x...
```

### 3. Prepare Relay Wallet

- Create a new wallet for the relay service
- Fund it with BNB for gas fees (recommend at least 0.1 BNB)
- Add the wallet address as an authorized bridge in `BnbBridge.addBridge()`

### 4. Start the Service

Development mode (auto-restart):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Configuration Details

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `POLYGON_WSS_RPC` | WebSocket RPC endpoint for Polygon | `wss://polygon-mainnet.g.alchemy.com/v2/key` |
| `BNB_RPC` | HTTP RPC endpoint for BNB Chain | `https://bsc-dataseed1.binance.org` |
| `POLYGON_BRIDGE_ADDRESS` | Address of PolygonBridge contract | `0x123...` |
| `BNB_BRIDGE_ADDRESS` | Address of BnbBridge contract | `0x456...` |
| `RELAY_PRIVATE_KEY` | Private key of relay wallet | `0x789...` |

### WebSocket Providers

Recommended providers:
- **Alchemy**: `wss://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY`
- **Infura**: `wss://polygon-mainnet.infura.io/ws/v3/YOUR_KEY`
- **QuickNode**: `wss://polygon.quicknode.pro/YOUR_KEY`

## How It Works

### Event Detection
```javascript
bridgeContract.on("TokensLocked", async (user, tokenId, amount, destinationAddress, nonce, event) => {
  // Process the event
});
```

### Cross-chain Relay Process

1. **Event Detected**: WebSocket listener catches `TokensLocked` event
2. **Validation**: Check if nonce already processed (prevent double-spend)
3. **Confirmation Wait**: Wait for block confirmations (default: 3 blocks)
4. **Mint Transaction**: Call `mintTokens()` on BNB Chain
5. **Confirmation**: Wait for mint transaction confirmation
6. **Logging**: Log successful relay operation

### Safety Features

- **Nonce Tracking**: Both local cache and on-chain verification
- **Block Confirmations**: Waits for confirmations before processing
- **Gas Buffers**: Adds 20% gas limit buffer and 10% gas price buffer
- **Auto-reconnection**: Reconnects WebSocket if connection drops
- **Graceful Shutdown**: Handles SIGINT/SIGTERM signals

## Monitoring

The service provides detailed console logging:

```
🚀 Initializing Bridge Relay Service...
✅ Bridge Relay Service initialized successfully
📡 Polygon Bridge: 0x123...
🌉 BNB Bridge: 0x456...  
👤 Relay Address: 0x789...
👂 Starting to listen for TokensLocked events...
🎯 Event listener active. Waiting for TokensLocked events...

🔒 TokensLocked Event Detected:
  👤 User: 0xabc...
  🪙 Token ID: 1
  💰 Amount: 1000
  📍 Destination: 0xdef...
  🎯 Nonce: 42
  📦 Block: 12345678
  🔗 TX Hash: 0x987...

⏳ Waiting for 3 confirmations...
✅ Confirmed after 3 blocks
🌉 Relaying to BNB Chain...
📤 Mint transaction sent: 0x654...
✅ Tokens minted successfully on BNB Chain!
```

## Troubleshooting

### Common Issues

**"Missing required environment variables"**
- Ensure all required variables are set in `.env` file

**"WebSocket connection failed"**  
- Check if WSS RPC endpoint is correct and accessible
- Verify your API key has sufficient credits

**"Not authorized bridge"**
- Make sure relay wallet address is authorized via `BnbBridge.addBridge()`

**"Insufficient funds"**
- Fund the relay wallet with BNB for gas fees

**"Nonce already processed"**
- This is normal - prevents double-minting. Event was already processed.

### Performance Optimization

For high-volume scenarios:
- Use dedicated RPC endpoints
- Increase gas price buffers during network congestion
- Monitor wallet balance and set up automatic funding
- Consider running multiple relay instances with different wallets

## Security Considerations

- Keep relay private key secure and never commit to version control
- Use environment variables for all sensitive data
- Monitor relay wallet for unusual activity
- Regularly rotate relay wallet if needed
- Use hardware wallets or key management services for production

## Development

To add new features or modify the relay logic:

1. The main service logic is in `relay-service.js`
2. Event handling is in `handleTokensLocked()` method  
3. Minting logic is in `relayToBnbChain()` method
4. Reconnection logic is in `handleReconnection()` method

```bash
# Install dev dependencies
npm install --dev

# Run in development mode with auto-restart
npm run dev
```