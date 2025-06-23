import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import bscLogo from '../bnb-chain-binance-smart-chain-logo.png';
import Jazzicon from 'react-jazzicon';
import { BrowserProvider, Contract, formatUnits } from 'ethers';
import erc20Abi from '../erc20Abi.json';

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

export default function LendPoolDetailsPage() {
  const navigate = useNavigate();
  const { poolId } = useParams();
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [tokenBalances, setTokenBalances] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState(SUPPORTED_TOKENS[0]);
  const [depositAmount, setDepositAmount] = useState('');
  const depositValue = 199.22;
  const apy = 6.92;
  const projectedEarnings = 13.84;

  React.useEffect(() => {
    checkWalletConnection();
  }, []);

  React.useEffect(() => {
    if (walletConnected && walletAddress) {
      fetchTokenBalances(walletAddress);
    }
  }, [walletConnected, walletAddress]);

  const checkWalletConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletConnected(true);
          setWalletAddress(accounts[0]);
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    }
  };

  const fetchTokenBalances = async (address) => {
    if (!window.ethereum) return;
    const provider = new BrowserProvider(window.ethereum);
    const balances = await Promise.all(
      SUPPORTED_TOKENS.map(async (token) => {
        try {
          const contract = new Contract(token.address, erc20Abi, provider);
          const balance = await contract.balanceOf(address);
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
    const firstWithBalance = balances.find(t => parseFloat(t.balance) > 0) || balances[0];
    setSelectedToken(firstWithBalance);
  };

  // Calculate the dynamic value for the small number under the deposit field
  const depositMinusOnePercent = depositAmount && !isNaN(parseFloat(depositAmount))
    ? (parseFloat(depositAmount) * 0.99999).toFixed(2)
    : '0.00';

  // Helper to handle percentage button click
  const handlePercentClick = (percent) => {
    const balance = parseFloat(selectedToken.balance || '0');
    if (balance > 0) {
      setDepositAmount((balance * percent).toFixed(2));
    } else {
      setDepositAmount('0.00');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Back button */}
        <button onClick={() => navigate('/lend')} className="flex items-center text-blue-600 hover:text-blue-700 mb-6">
          <span className="w-4 h-4 mr-1">&#8592;</span>
          Back to pools
        </button>

        <h2 className="text-xl font-bold text-gray-900 mb-4">Pool info: {decodeURIComponent(poolId)}</h2>
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
                <img src="https://polymarket-upload.s3.us-east-2.amazonaws.com/us-recession-in-2025-01ZjnLjvO4a3.jpg" alt="US recession in 2025" className="w-10 h-10 rounded-lg object-cover" />
              <h3 className="text-lg font-semibold text-gray-900">{decodeURIComponent(poolId)}</h3>
            </div>
            <div className="flex items-center divide-x divide-gray-200">
              <div className="text-center pr-6">
                <div className="text-sm text-gray-500 mb-1">Total supply</div>
                <div className="text-2xl font-bold text-gray-900">$2.03M</div>
              </div>
              <div className="text-center px-6">
                <div className="text-sm text-gray-500 mb-1">Supply APY</div>
                <div className="text-2xl font-bold text-gray-900">6.92%</div>
              </div>
              <div className="text-center pl-6">
                <div className="text-sm text-gray-500 mb-1">Utilization rate</div>
                <div className="text-2xl font-bold text-gray-900">88.89%</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Lend & Earn Section */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Lend & Earn</h3>
            {/* Wallet balance pill at top right */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-900 font-medium text-base">Your wallet balance</span>
              <div className="relative">
                <button
                  type="button"
                  className="flex items-center bg-gray-100 rounded-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  onClick={() => setDropdownOpen((open) => !open)}
                >
                  <img src={selectedToken.image} alt={selectedToken.symbol} className="w-6 h-6 rounded-full mr-2" />
                  <span className="font-medium text-gray-900 mr-2">{selectedToken.symbol}</span>
                  <span className="font-semibold text-green-700">{parseFloat(selectedToken.balance || 0).toFixed(2)}</span>
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-10">
                    {tokenBalances.map((token) => (
                      <button
                        key={token.symbol}
                        className="flex items-center w-full px-4 py-2 hover:bg-gray-100 focus:outline-none"
                        onClick={() => {
                          setSelectedToken(token);
                          setDropdownOpen(false);
                        }}
                      >
                        <img src={token.image} alt={token.symbol} className="w-6 h-6 rounded-full mr-2" />
                        <span className="font-medium text-gray-900 mr-2">{token.symbol}</span>
                        <span className="text-gray-700">{parseFloat(token.balance || 0).toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Deposit card, styled as in screenshot */}
            <div className="bg-white rounded-xl shadow border border-gray-100 p-6 mb-4 flex flex-col">
              <span className="text-gray-900 font-semibold text-lg mb-4">Deposit</span>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-1.5">
                  <img src={selectedToken.image} alt={selectedToken.symbol} className="w-7 h-7 rounded-full mr-2" />
                  <span className="font-medium text-gray-900 text-base">{selectedToken.symbol}</span>
                </div>
                <div className="text-right flex items-end">
                  <span className="text-3xl font-bold text-gray-900 mr-1">
                    <input
                      type="text"
                      value={depositAmount}
                      onChange={e => {
                        // Only allow numbers and a single dot
                        const val = e.target.value.replace(/[^0-9.]/g, '');
                        // Prevent multiple dots
                        const parts = val.split('.');
                        const safeVal = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : val;
                        setDepositAmount(safeVal);
                      }}
                      className={`bg-transparent border-none focus:outline-none focus:ring-0 text-right w-24 ml-1 text-3xl font-bold ${!depositAmount || parseFloat(depositAmount) === 0 ? 'text-gray-400' : 'text-gray-900'}`}
                      placeholder="0.00"
                      inputMode="decimal"
                      autoComplete="off"
                    />
                  </span>
                </div>
              </div>
              <div className="text-right text-gray-400 text-base mb-2">
                 {depositMinusOnePercent}
              </div>
              <div className="flex space-x-2 mb-2">
                {[0.25, 0.5, 0.75, 1].map((fraction, idx) => (
                  <button
                    key={fraction}
                    className="flex-1 bg-blue-50 text-blue-600 font-semibold py-2 rounded-lg hover:bg-blue-100 transition"
                    onClick={() => handlePercentClick(fraction)}
                    type="button"
                  >
                    {idx < 3 ? `${fraction * 100}%` : 'MAX'}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                className="hidden" // Hide the input, value is shown in big font above
                placeholder="0.00"
              />
            </div>

            {/* Deposit stats card */}
            <div className="bg-white rounded-xl shadow border border-gray-100 p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-500">Deposit value</span>
                <span className="font-medium text-gray-900">${depositValue}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-500">APY</span>
                <span className="font-medium text-gray-900">{apy}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Projected Earnings / Year (USD)</span>
                <span className="font-medium text-gray-900">{projectedEarnings}</span>
              </div>
            </div>
            <button className="w-full bg-gradient-to-br from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white py-3 rounded-full font-semibold text-lg shadow-md transition-transform transform hover:scale-105">
              Deposit
            </button>
          </div>

          {/* Supply Overview Section */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Supply overview</h3>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-sm text-gray-500 mb-1">Total supply</div>
                  <div className="text-2xl font-bold text-gray-900">$2.03M</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500 mb-1">Total borrowed</div>
                  <div className="text-2xl font-bold text-gray-900">6.92%</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500 mb-1">Available liquidity</div>
                  <div className="text-2xl font-bold text-gray-900">88.89%</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500 mb-1">Borrow APR</div>
                  <div className="text-2xl font-bold text-gray-900">8.89%</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500 mb-1">Liquidation penalty</div>
                  <div className="text-2xl font-bold text-gray-900">88.89%</div>
                </div>
              </div>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-semibold text-gray-900">Supply APY</span>
                  <span className="text-2xl font-bold text-gray-900">6.92%</span>
                </div>
                {/* Chart placeholder */}
                <div className="bg-blue-50 rounded-xl h-48 flex items-center justify-center">
                  <span className="text-blue-400 font-medium">[Chart Placeholder]</span>
                </div>
                <div className="flex justify-end space-x-2 mt-4">
                  <button className="px-4 py-1 rounded-lg bg-blue-100 text-blue-600 font-medium">1 week</button>
                  <button className="px-4 py-1 rounded-lg bg-blue-100 text-blue-600 font-medium">1 month</button>
                  <button className="px-4 py-1 rounded-lg bg-blue-500 text-white font-medium">1 year</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 