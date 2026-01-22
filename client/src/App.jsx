import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Materials from '@/pages/Materials';
import StockAreas from '@/pages/StockAreas';
import PurchaseRequests from '@/pages/PurchaseRequests';
import PurchaseOrders from '@/pages/PurchaseOrders';
import StockTransfers from '@/pages/StockTransfers';
import Consumption from '@/pages/Consumption';
import Returns from '@/pages/Returns';
import Vendors from '@/pages/Vendors';
import Reports from '@/pages/Reports';
import AuditLogs from '@/pages/AuditLogs';
import Projects from '@/pages/Projects';
import BOQ from '@/pages/BOQ';
import MAS from '@/pages/MAS';
import Samples from '@/pages/Samples';
import VendorComparison from '@/pages/VendorComparison';
import Challans from '@/pages/Challans';
import MER from '@/pages/MER';
import MIR from '@/pages/MIR';
import ITR from '@/pages/ITR';
import Billing from '@/pages/Billing';
import Documents from '@/pages/Documents';
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
            <Route path="stock-transfers" element={<StockTransfers />} />
            <Route path="consumption" element={<Consumption />} />
            <Route path="returns" element={<Returns />} />
            <Route path="vendors" element={<Vendors />} />
            <Route path="reports" element={<Reports />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route path="projects" element={<Projects />} />
            <Route path="boq" element={<BOQ />} />
            <Route path="mas" element={<MAS />} />
            <Route path="samples" element={<Samples />} />
            <Route path="vendor-comparison" element={<VendorComparison />} />
            <Route path="challans" element={<Challans />} />
            <Route path="mer" element={<MER />} />
            <Route path="mir" element={<MIR />} />
            <Route path="itr" element={<ITR />} />
            <Route path="billing" element={<Billing />} />
            <Route path="documents" element={<Documents />} />
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
