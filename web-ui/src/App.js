import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import BorrowListPage from './components/BorrowListPage';
import BorrowPoolDetailsPage from './components/BorrowPoolDetailsPage';
import LendListPage from './components/LendListPage';
import LendPoolDetailsPage from './components/LendPoolDetailsPage';
import Layout from './components/Layout';

function SpendPage() {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center">
      <img
        src={require('./Screenshot 2025-06-23 at 8.51.29 PM.png')}
        alt="Spend Page Screenshot"
        className="rounded-xl "
        style={{ objectFit: 'contain' }}
      />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/lend" element={<LendListPage />} />
        <Route path="/lend/:poolId" element={<LendPoolDetailsPage />} />
        <Route path="/borrow" element={<BorrowListPage />} />
        <Route path="/borrow/:poolId" element={<BorrowPoolDetailsPage />} />
        <Route path="/spend" element={<SpendPage />} />
        <Route path="*" element={<Navigate to="/borrow" replace />} />
      </Route>
    </Routes>
  );
}
