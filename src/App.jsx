import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import OfflineBanner from './components/OfflineBanner';
import Chatbot from './components/Chatbot';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Receipts from './pages/Receipts';
import Deliveries from './pages/Deliveries';
import Transfers from './pages/Transfers';
import Adjustments from './pages/Adjustments';
import BlockchainLedger from './pages/BlockchainLedger';
import Analytics from './pages/Analytics';

// Protected Route Guard
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Role-Based Route Guard
const RoleGuard = ({ children, roles }) => {
  const { user, profile } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const userRole = profile?.role || 'staff';
  if (!roles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-slate-900 dark:bg-slate-900 light:bg-gray-50 text-white dark:text-white light:text-gray-900 selection:bg-accent selection:text-white transition-colors duration-300">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Protected Routes — Everyone */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
              <Route path="/deliveries" element={<ProtectedRoute><Deliveries /></ProtectedRoute>} />
              <Route path="/transfers" element={<ProtectedRoute><Transfers /></ProtectedRoute>} />

              {/* Admin + Manager only */}
              <Route path="/receipts" element={<RoleGuard roles={['admin', 'manager']}><Receipts /></RoleGuard>} />
              <Route path="/blockchain" element={<RoleGuard roles={['admin', 'manager']}><BlockchainLedger /></RoleGuard>} />
              <Route path="/analytics" element={<RoleGuard roles={['admin', 'manager']}><Analytics /></RoleGuard>} />

              {/* Admin only */}
              <Route path="/adjustments" element={<RoleGuard roles={['admin']}><Adjustments /></RoleGuard>} />

              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </Router>
        <OfflineBanner />
        <Chatbot />
        <Toaster position="top-right" toastOptions={{
          style: {
            background: '#1e293b',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)'
          }
        }} />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
