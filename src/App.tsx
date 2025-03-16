import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Returns from './pages/Returns';
import ReturnRate from './pages/ReturnRate';
import NetSales from './pages/NetSales';
import AuthCallback from './pages/AuthCallback';
import { useAuthStore } from './store/authStore';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/api/auth/callback" element={<AuthCallback />} />
        <Route path="/" element={ <PrivateRoute> <Layout /> </PrivateRoute> }>
          <Route index element={<Dashboard />} />
          <Route path="returns" element={<Returns />} />
          <Route path="net_sales" element={<NetSales />} />
          <Route path="return_rate" element={<ReturnRate />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;