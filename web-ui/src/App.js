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
      <h1 className="text-3xl font-bold mb-4">Spend</h1>
      <p className="text-lg text-gray-600">This is the Spend page. (Design me!)</p>
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
