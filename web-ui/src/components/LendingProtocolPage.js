import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrowserProvider, Contract, formatUnits, parseUnits } from 'ethers';
import { ChevronLeft, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import bscLogo from '../bnb-chain-binance-smart-chain-logo.png';
import Jazzicon from 'react-jazzicon';
import lendingContractAbi from '../lendingContractAbi.json';
import erc20Abi from '../erc20Abi.json';

const CONTRACT_ADDRESS = '0x50288f1E043C0E780D883a27F01e146A1AD95373';

const SUPPORTED_TOKENS = [
  {
    name: 'Tether USD',
    symbol: 'USDT',
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    image: require('../tether-logo.webp'),
    decimals: 6,
  },
  {
    name: 'USD Coin',
    symbol: 'USDC',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    image: require('../usdc.png'),
    decimals: 6,
  },
  {
    name: 'Mock Tether USD',
    symbol: 'mUSDT',
    address: '0x63d580010Dd6f555aEE3a7Ba21aF1eC2FD3FC508',
    image: require('../tether-logo.webp'),
    decimals: 6,
  },
];

export default function LendingProtocolPage() {
  const navigate = useNavigate();
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Contract data
  const [poolInfo, setPoolInfo] = useState({
    totalSupply: '0',
    totalBorrowed: '0',
    utilizationRate: '0',
    supplyRate: '0',
    borrowRate: '0'
  });
  const [userPosition, setUserPosition] = useState({
    supplied: '0',
    borrowed: '0',
    collateral: '0'
  });
  const [borrowableAmount, setBorrowableAmount] = useState('0');
  const [oraclePrice, setOraclePrice] = useState('0');
  
  // UI state
  const [activeTab, setActiveTab] = useState('supply');
  const [amount, setAmount] = useState('');
  const [tokenBalances, setTokenBalances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [networkInfo, setNetworkInfo] = useState({ chainId: null, chainName: 'Unknown' });
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    checkWalletConnection();
  }, []);

  useEffect(() => {
    if (walletConnected && walletAddress) {
      fetchContractData();
      fetchTokenBalances();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletConnected, walletAddress]);

  const checkWalletConnection = async () => {
    console.log('🔍 Checking wallet connection...');
    
    if (typeof window.ethereum === 'undefined') {
      console.log('❌ MetaMask not detected');
      setMessage({ text: 'MetaMask not detected. Please install MetaMask browser extension.', type: 'error' });
      return;
    }

    console.log('✅ MetaMask detected');
    
    try {
      // Check current network
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const chainName = getChainName(chainId);
      setNetworkInfo({ chainId, chainName });
      console.log(`🌐 Current network: ${chainName} (${chainId})`);

      // Check connected accounts
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      console.log(`👥 Connected accounts: ${accounts.length}`);
      
      if (accounts.length > 0) {
        setWalletConnected(true);
        setWalletAddress(accounts[0]);
        console.log(`✅ Wallet connected: ${accounts[0]}`);
      } else {
        console.log('⚠️ No accounts connected');
      }
    } catch (error) {
      console.error('❌ Error checking wallet connection:', error);
      setMessage({ text: `Error checking wallet: ${error.message}`, type: 'error' });
    }
  };

  const getChainName = (chainId) => {
    const chains = {
      '0x1': 'Ethereum Mainnet',
      '0x89': 'Polygon',
      '0x38': 'BSC Mainnet',
      '0x61': 'BSC Testnet',
      '0x5': 'Goerli Testnet',
      '0xaa36a7': 'Sepolia Testnet',
      '0xa': 'Optimism',
      '0xa4b1': 'Arbitrum One'
    };
    return chains[chainId] || `Unknown (${chainId})`;
  };

  const connectWallet = async () => {
    console.log('🔗 Attempting to connect wallet...');
    
    if (typeof window.ethereum === 'undefined') {
      const errorMsg = 'MetaMask is not installed. Please install MetaMask to use this feature.';
      console.log(`❌ ${errorMsg}`);
      setMessage({ text: errorMsg, type: 'error' });
      return;
    }

    setIsConnecting(true);
    try {
      console.log('📞 Requesting accounts from MetaMask...');
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      console.log(`✅ Received ${accounts.length} accounts`);
      
      if (accounts.length > 0) {
        setWalletConnected(true);
        setWalletAddress(accounts[0]);
        console.log(`✅ Wallet connected successfully: ${accounts[0]}`);
        setMessage({ text: 'Wallet connected successfully!', type: 'success' });
        
        // Update network info after connection
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        const chainName = getChainName(chainId);
        setNetworkInfo({ chainId, chainName });
        console.log(`🌐 Connected to: ${chainName} (${chainId})`);
      }
    } catch (error) {
      console.error('❌ Error connecting wallet:', error);
      if (error.code === 4001) {
        const errorMsg = 'User rejected the connection request. Please connect your MetaMask wallet to continue.';
        console.log(`⚠️ ${errorMsg}`);
        setMessage({ text: errorMsg, type: 'error' });
      } else {
        const errorMsg = `Error connecting wallet: ${error.message}`;
        console.log(`❌ ${errorMsg}`);
        setMessage({ text: errorMsg, type: 'error' });
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchContractData = async () => {
    if (!window.ethereum || !walletAddress) {
      console.log('⚠️ Cannot fetch contract data: missing ethereum or wallet address');
      return;
    }

    console.log('📊 Fetching contract data...');
    console.log(`📍 Contract address: ${CONTRACT_ADDRESS}`);
    console.log(`👤 User address: ${walletAddress}`);

    try {
      const provider = new BrowserProvider(window.ethereum);
      const contract = new Contract(CONTRACT_ADDRESS, lendingContractAbi, provider);
      console.log('✅ Contract instance created');

      // Test if contract exists
      try {
        const code = await provider.getCode(CONTRACT_ADDRESS);
        if (code === '0x') {
          throw new Error('No contract found at this address');
        }
        console.log('✅ Contract verified to exist on network');
      } catch (codeError) {
        console.error('❌ Contract verification failed:', codeError);
        setMessage({ text: `Contract not found at ${CONTRACT_ADDRESS}. Check network and contract address.`, type: 'error' });
        return;
      }

      // Fetch pool info
      console.log('📊 Fetching pool info...');
      const poolData = await contract.getPoolInfo();
      console.log('✅ Pool info received:', poolData);
      setPoolInfo({
        totalSupply: formatUnits(poolData[0], 18),
        totalBorrowed: formatUnits(poolData[1], 18),
        utilizationRate: formatUnits(poolData[2], 16),
        supplyRate: formatUnits(poolData[3], 16),
        borrowRate: formatUnits(poolData[4], 16)
      });

      // Fetch user position
      console.log('👤 Fetching user position...');
      const position = await contract.getPosition(walletAddress);
      console.log('✅ User position received:', position);
      setUserPosition({
        supplied: formatUnits(position[0], 18),
        borrowed: formatUnits(position[1], 18),
        collateral: formatUnits(position[2], 18)
      });

      // Fetch borrowable amount
      console.log('💰 Fetching borrowable amount...');
      const borrowable = await contract.getBorrowableAmount(walletAddress);
      console.log('✅ Borrowable amount received:', borrowable);
      setBorrowableAmount(formatUnits(borrowable, 18));

      // Fetch oracle price
      console.log('💲 Fetching oracle price...');
      const price = await contract.getOraclePrice();
      console.log('✅ Oracle price received:', price);
      setOraclePrice(formatUnits(price, 18));

      console.log('✅ All contract data fetched successfully');

    } catch (error) {
      console.error('❌ Error fetching contract data:', error);
      let errorMessage = 'Error fetching contract data';
      
      if (error.message.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message.includes('revert')) {
        errorMessage = 'Contract call reverted. The contract may not be properly deployed.';
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please check you are on the correct network.';
      }
      
      setMessage({ text: `${errorMessage}: ${error.message}`, type: 'error' });
    }
  };

  const fetchTokenBalances = async () => {
    if (!window.ethereum || !walletAddress) return;

    try {
      const provider = new BrowserProvider(window.ethereum);
      const balances = await Promise.all(
        SUPPORTED_TOKENS.map(async (token) => {
          try {
            const contract = new Contract(token.address, erc20Abi, provider);
            const balance = await contract.balanceOf(walletAddress);
            return {
              ...token,
              balance: formatUnits(balance, token.decimals),
            };
          } catch (e) {
            return { ...token, balance: '0.00' };
          }
        })
      );
      setTokenBalances(balances);
    } catch (error) {
      console.error('Error fetching token balances:', error);
    }
  };

  const handleTransaction = async (functionName) => {
    console.log(`🚀 Starting ${functionName} transaction...`);
    
    // Pre-flight checks
    if (!walletConnected) {
      const errorMsg = 'Wallet not connected. Please connect your wallet first.';
      console.log(`❌ ${errorMsg}`);
      setMessage({ text: errorMsg, type: 'error' });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      const errorMsg = 'Please enter a valid amount greater than 0';
      console.log(`❌ ${errorMsg}`);
      setMessage({ text: errorMsg, type: 'error' });
      return;
    }

    console.log(`💰 Amount: ${amount} ETH`);
    console.log(`👤 User: ${walletAddress}`);
    console.log(`🌐 Network: ${networkInfo.chainName} (${networkInfo.chainId})`);

    setLoading(true);
    setMessage({ text: `Preparing ${functionName} transaction...`, type: 'info' });

    try {
      console.log('🔌 Creating provider and signer...');
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, lendingContractAbi, signer);
      console.log('✅ Contract with signer created');

      // Verify contract exists
      const code = await provider.getCode(CONTRACT_ADDRESS);
      if (code === '0x') {
        throw new Error('Contract not found at this address. Please check the network and contract address.');
      }

      const amountInWei = parseUnits(amount, 18);
      console.log(`💱 Amount in Wei: ${amountInWei.toString()}`);

      // Estimate gas before sending transaction
      let gasEstimate;
      try {
        switch (functionName) {
          case 'supply':
            gasEstimate = await contract.supply.estimateGas(amountInWei);
            break;
          case 'borrow':
            gasEstimate = await contract.borrow.estimateGas(amountInWei);
            break;
          case 'repay':
            gasEstimate = await contract.repay.estimateGas(amountInWei);
            break;
          case 'withdraw':
            gasEstimate = await contract.withdraw.estimateGas(amountInWei);
            break;
          default:
            throw new Error('Invalid function name');
        }
        console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);
      } catch (gasError) {
        console.error('❌ Gas estimation failed:', gasError);
        throw new Error(`Transaction would fail: ${gasError.reason || gasError.message}`);
      }

      setMessage({ text: `Opening MetaMask for ${functionName} transaction...`, type: 'info' });
      console.log('🦊 Sending transaction to MetaMask...');

      let tx;
      switch (functionName) {
        case 'supply':
          tx = await contract.supply(amountInWei);
          break;
        case 'borrow':
          tx = await contract.borrow(amountInWei);
          break;
        case 'repay':
          tx = await contract.repay(amountInWei);
          break;
        case 'withdraw':
          tx = await contract.withdraw(amountInWei);
          break;
        default:
          throw new Error('Invalid function name');
      }

      console.log('✅ Transaction sent to network');
      console.log(`📝 Transaction hash: ${tx.hash}`);
      setMessage({ text: `Transaction submitted! Hash: ${tx.hash.substring(0, 10)}... Waiting for confirmation...`, type: 'info' });

      console.log('⏳ Waiting for transaction confirmation...');
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed!');
      console.log(`📊 Gas used: ${receipt.gasUsed.toString()}`);
      console.log(`🧾 Block number: ${receipt.blockNumber}`);

      setMessage({ text: `${functionName} transaction completed successfully! 🎉`, type: 'success' });
      
      // Refresh data
      console.log('🔄 Refreshing contract data...');
      await fetchContractData();
      await fetchTokenBalances();
      setAmount('');
      
    } catch (error) {
      console.error(`❌ Error in ${functionName} transaction:`, error);
      
      let errorMessage = `Error in ${functionName}`;
      
      if (error.code === 4001) {
        errorMessage = 'Transaction rejected by user';
        console.log('⚠️ User rejected transaction');
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for transaction';
        console.log('💸 Insufficient funds');
      } else if (error.message.includes('gas')) {
        errorMessage = 'Gas estimation failed. Transaction would likely fail.';
        console.log('⛽ Gas issue');
      } else if (error.reason) {
        errorMessage = `Transaction failed: ${error.reason}`;
        console.log(`💥 Contract revert: ${error.reason}`);
      }
      
      setMessage({ text: `${errorMessage}: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
      console.log(`🏁 ${functionName} transaction process completed`);
    }
  };

  const handleLiquidation = async (userToLiquidate) => {
    if (!walletConnected || !userToLiquidate) {
      setMessage({ text: 'Please connect wallet and enter user address', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, lendingContractAbi, signer);

      const tx = await contract.liquidate(userToLiquidate);
      setMessage({ text: 'Liquidation transaction submitted. Waiting for confirmation...', type: 'info' });
      await tx.wait();
      setMessage({ text: 'Liquidation completed successfully!', type: 'success' });
      
      await fetchContractData();
      
    } catch (error) {
      console.error('Error in liquidation:', error);
      setMessage({ text: `Error in liquidation: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const renderMessage = () => {
    if (!message.text) return null;

    const bgColor = message.type === 'error' ? 'bg-red-100 text-red-700' :
                   message.type === 'success' ? 'bg-green-100 text-green-700' :
                   'bg-blue-100 text-blue-700';

    const Icon = message.type === 'error' ? AlertTriangle :
               message.type === 'success' ? CheckCircle :
               Info;

    return (
      <div className={`rounded-lg p-4 mb-6 flex items-center space-x-2 ${bgColor}`}>
        <Icon className="w-5 h-5" />
        <span>{message.text}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate('/borrow')} className="flex items-center text-blue-600 hover:text-blue-700">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to pools
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Lending Protocol</h1>
            <button
              onClick={() => setDebugMode(!debugMode)}
              className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded-full transition-colors"
            >
              {debugMode ? 'Hide Debug' : 'Show Debug'}
            </button>
          </div>
          
          {!walletConnected ? (
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="bg-gradient-to-br from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white px-6 py-2 rounded-full font-medium shadow-md transition-transform transform hover:scale-105 disabled:opacity-50"
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          ) : (
            <div className="flex items-center space-x-2 bg-white rounded-full px-4 py-2 shadow-sm">
              <img src={bscLogo} alt="BSC" className="w-6 h-6" />
              <Jazzicon diameter={24} seed={parseInt(walletAddress.slice(2, 10), 16)} />
              <span className="font-mono text-sm">{formatAddress(walletAddress)}</span>
            </div>
          )}
        </div>

        {renderMessage()}

        {/* Debug Panel */}
        {debugMode && (
          <div className="bg-gray-900 text-green-400 rounded-xl p-4 mb-8 font-mono text-sm">
            <h3 className="text-white font-bold mb-2">Debug Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div><strong>MetaMask:</strong> {typeof window.ethereum !== 'undefined' ? '✅ Detected' : '❌ Not Found'}</div>
                <div><strong>Wallet:</strong> {walletConnected ? '✅ Connected' : '❌ Not Connected'}</div>
                <div><strong>Address:</strong> {walletAddress || 'None'}</div>
                <div><strong>Network:</strong> {networkInfo.chainName} ({networkInfo.chainId})</div>
              </div>
              <div>
                <div><strong>Contract:</strong> {CONTRACT_ADDRESS}</div>
                <div><strong>Pool Supply:</strong> {poolInfo.totalSupply} ETH</div>
                <div><strong>Pool Borrowed:</strong> {poolInfo.totalBorrowed} ETH</div>
                <div><strong>Oracle Price:</strong> ${oraclePrice}</div>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Open browser console (F12) to see detailed transaction logs
            </div>
          </div>
        )}

        {/* Protocol Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-sm text-gray-500 mb-1">Total Supply</div>
            <div className="text-2xl font-bold text-gray-900">{parseFloat(poolInfo.totalSupply).toFixed(2)} ETH</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-sm text-gray-500 mb-1">Total Borrowed</div>
            <div className="text-2xl font-bold text-gray-900">{parseFloat(poolInfo.totalBorrowed).toFixed(2)} ETH</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-sm text-gray-500 mb-1">Supply Rate</div>
            <div className="text-2xl font-bold text-green-600">{parseFloat(poolInfo.supplyRate).toFixed(2)}%</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-sm text-gray-500 mb-1">Borrow Rate</div>
            <div className="text-2xl font-bold text-red-600">{parseFloat(poolInfo.borrowRate).toFixed(2)}%</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-sm text-gray-500 mb-1">Oracle Price</div>
            <div className="text-2xl font-bold text-gray-900">${parseFloat(oraclePrice).toFixed(2)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Main Actions */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex space-x-2 mb-6">
              {['supply', 'borrow', 'repay', 'withdraw'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (ETH)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={() => handleTransaction(activeTab)}
                disabled={loading || !walletConnected || !amount}
                className="w-full bg-gradient-to-br from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white py-3 rounded-lg font-medium shadow-md transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {loading ? 'Processing...' : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
              </button>
            </div>
          </div>

          {/* User Position */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Your Position</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Supplied</span>
                <span className="font-medium text-gray-900">{parseFloat(userPosition.supplied).toFixed(6)} ETH</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Borrowed</span>
                <span className="font-medium text-gray-900">{parseFloat(userPosition.borrowed).toFixed(6)} ETH</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Collateral</span>
                <span className="font-medium text-gray-900">{parseFloat(userPosition.collateral).toFixed(6)} ETH</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Borrowable Amount</span>
                <span className="font-medium text-green-600">{parseFloat(borrowableAmount).toFixed(6)} ETH</span>
              </div>
            </div>
          </div>
        </div>

        {/* Liquidation Section */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Liquidation</h3>
          <div className="flex space-x-4">
            <input
              type="text"
              placeholder="User address to liquidate"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleLiquidation(e.target.value);
                }
              }}
            />
            <button
              onClick={(e) => {
                const input = e.target.previousElementSibling;
                handleLiquidation(input.value);
              }}
              disabled={loading || !walletConnected}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Liquidate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}