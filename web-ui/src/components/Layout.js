import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import bscLogo from '../bnb-chain-binance-smart-chain-logo.png';
import Jazzicon from 'react-jazzicon';

export default function Layout() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  let activeTab = 'borrow';
  if (location.pathname.startsWith('/lend')) {
    activeTab = 'lend';
  } else if (location.pathname.startsWith('/borrow')) {
    activeTab = 'borrow';
  } else if (location.pathname.startsWith('/spend')) {
    activeTab = 'spend';
  }

  useEffect(() => {
    checkWalletConnection();
  }, []);

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

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('MetaMask is not installed. Please install MetaMask to use this feature.');
      return;
    }
    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) {
        setWalletConnected(true);
        setWalletAddress(accounts[0]);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      if (error.code === 4001) {
        alert('Please connect your MetaMask wallet to continue.');
      } else {
        alert('Error connecting wallet. Please try again.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress('');
  };

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header/Nav */}
      <div className="px-6 py-4">
        <div className="bg-white rounded-full shadow-sm p-2 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 pl-4">Gondor°</h1>
            <div className="flex items-center space-x-2">
              <div className="flex items-center bg-gray-100 rounded-full p-1">
                <button
                  onClick={() => navigate('/lend')}
                  className={`px-4 py-1 text-sm font-medium rounded-full transition-colors ${
                    activeTab === 'lend'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'bg-transparent text-gray-600'
                  }`}
                >
                  Lend
                </button>
                <button
                  onClick={() => navigate('/borrow')}
                  className={`px-4 py-1 text-sm font-medium rounded-full transition-colors ${
                    activeTab === 'borrow'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'bg-transparent text-gray-600'
                  }`}
                >
                  Borrow
                </button>
                <button
                  onClick={() => navigate('/spend')}
                  className={`px-4 py-1 text-sm font-medium rounded-full transition-colors ${
                    activeTab === 'spend'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'bg-transparent text-gray-600'
                  }`}
                >
                  Spend
                </button>
              </div>
            </div>
            <button
              onClick={walletConnected ? disconnectWallet : connectWallet}
              disabled={isConnecting}
              className={`flex items-center space-x-2 px-6 py-2 rounded-full font-medium shadow-md transition-transform transform
                ${walletConnected
                  ? 'bg-white text-gray-900'
                  : 'bg-gradient-to-br from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white hover:scale-105'}
                disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none`}
            >
              {isConnecting ? 'Connecting...' : walletConnected ? (
                <>
                  <span className="flex items-center justify-center w-10 h-10 rounded-full bg-white mr-2">
                    <img src={bscLogo} alt="BSC" className="w-6 h-6" />
                  </span>
                  <span className="flex items-center bg-white rounded-full px-3 py-1 text-sm font-mono font-medium border border-gray-200">
                    <Jazzicon diameter={24} seed={parseInt(walletAddress.slice(2, 10), 16)} />
                    <span className="ml-2">{formatAddress(walletAddress)}</span>
                  </span>
                </>
              ) : 'Connect wallet'}
            </button>
          </div>
        </div>
      </div>
      <Outlet />
    </div>
  );
} 