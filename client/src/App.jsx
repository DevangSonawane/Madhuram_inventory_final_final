import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Materials from '@/pages/Materials';
import StockAreas from '@/pages/StockAreas';
import PurchaseRequests from '@/pages/PurchaseRequests';
import PurchaseOrders from '@/pages/PurchaseOrders';
import InwardEntry from '@/pages/InwardEntry';
import MaterialRequests from '@/pages/MaterialRequests';
import StockTransfers from '@/pages/StockTransfers';
import PersonStock from '@/pages/PersonStock';
import Consumption from '@/pages/Consumption';
import Returns from '@/pages/Returns';
import BusinessPartners from '@/pages/BusinessPartners';
import Reports from '@/pages/Reports';
import AuditLogs from '@/pages/AuditLogs';
import Settings from '@/pages/Settings';
import Support from '@/pages/Support';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="materials" element={<Materials />} />
            <Route path="stock-areas" element={<StockAreas />} />
            <Route path="purchase-requests" element={<PurchaseRequests />} />
            <Route path="purchase-orders" element={<PurchaseOrders />} />
            <Route path="inward-entry" element={<InwardEntry />} />
            <Route path="material-requests" element={<MaterialRequests />} />
            <Route path="stock-transfers" element={<StockTransfers />} />
            <Route path="person-stock" element={<PersonStock />} />
            <Route path="consumption" element={<Consumption />} />
            <Route path="returns" element={<Returns />} />
            <Route path="business-partners" element={<BusinessPartners />} />
            <Route path="reports" element={<Reports />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route path="settings" element={<Settings />} />
            <Route path="support" element={<Support />} />
          </Route>
        </Routes>
        <Toaster />
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
