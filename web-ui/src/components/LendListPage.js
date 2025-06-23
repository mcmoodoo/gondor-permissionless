import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const yourDeposits = [
  {
    name: 'US recession in 2025?',
    balance: '$100 / 100USDT',
    earned: '$6.18 / 6.92USDT',
    apy: '6.92%',
  },
  {
    name: 'US recession in 2025?',
    balance: '$100 / 100USDT',
    earned: '$6.18 / 6.92USDT',
    apy: '6.92%',
  },
];

const pools = [
  {
    name: 'US recession in 2025?',
    total_supply: '$2.03M',
    supply_apy: '6.92%',
    utilization_rate: '88.89%',
  },
  {
    name: 'US recession in 2025?',
    total_supply: '$2.03M',
    supply_apy: '6.92%',
    utilization_rate: '88.89%',
  },
  {
    name: 'US recession in 2025?',
    total_supply: '$2.03M',
    supply_apy: '6.92%',
    utilization_rate: '88.89%',
  },
];

export default function LendListPage() {
  const navigate = useNavigate();
  const [showDeposits, setShowDeposits] = useState(true);

  const handlePoolClick = (pool) => {
    navigate(`/lend/${encodeURIComponent(pool.name)}`);
  };

  return (
    <div className="bg-slate-100 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Your Deposits section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Your deposits</h2>
              <button
                onClick={() => setShowDeposits(!showDeposits)}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
              >
                {showDeposits ? 'Show less' : 'Show more'}
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ml-1 transition-transform transform ${showDeposits ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            <div className="flex space-x-8 text-center">
              <div>
                <div className="text-sm text-gray-500 mb-1">Total deposited</div>
                <div className="text-2xl font-bold text-gray-900">$2,500.07</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Total earned</div>
                <div className="text-2xl font-bold text-gray-900">$12.07</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Net APY</div>
                <div className="text-2xl font-bold text-gray-900">6.92%</div>
              </div>
            </div>
          </div>
          {showDeposits && (
            <div className="mt-6">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200 text-sm text-gray-500">
                    <th className="py-2 font-medium w-2/5">Pool name</th>
                    <th className="py-2 font-medium w-1/5">Balance</th>
                    <th className="py-2 font-medium w-1/5">Earned</th>
                    <th className="py-2 font-medium w-1/5">APY</th>
                    <th className="py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {yourDeposits.map((deposit, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-4">
                        <div className="flex items-center space-x-3">
                          <img src="https://polymarket-upload.s3.us-east-2.amazonaws.com/us-recession-in-2025-01ZjnLjvO4a3.jpg" alt="US recession in 2025" className="w-7 h-7 rounded-lg object-cover" />
                          <span className="font-medium text-gray-900">{deposit.name}</span>
                        </div>
                      </td>
                      <td className="py-4 text-gray-700">{deposit.balance}</td>
                      <td className="py-4 text-gray-700">{deposit.earned}</td>
                      <td className="py-4 text-gray-700">{deposit.apy}</td>
                      <td className="py-4 text-right">
                        <button className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-full transition">
                          Withdraw
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pools Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Pools</h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Search pools"
                className="bg-gray-50 border border-gray-200 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 text-sm text-gray-500">
                  <th className="py-3 font-medium">Pool name</th>
                  <th className="py-3 font-medium">Total supply</th>
                  <th className="py-3 font-medium">Supply APY</th>
                  <th className="py-3 font-medium">Utilization rate</th>
                </tr>
              </thead>
              <tbody>
                {pools.map((pool, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => handlePoolClick(pool)}>
                    <td className="py-4 flex items-center space-x-3">
                      <img src="https://polymarket-upload.s3.us-east-2.amazonaws.com/us-recession-in-2025-01ZjnLjvO4a3.jpg" alt="US recession in 2025" className="w-7 h-7 rounded-lg object-cover" />
                      <span className="font-medium text-gray-900">{pool.name}</span>
                    </td>
                    <td className="py-4 text-gray-700">{pool.total_supply}</td>
                    <td className="py-4 text-gray-700">{pool.supply_apy}</td>
                    <td className="py-4 text-gray-700">{pool.utilization_rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 