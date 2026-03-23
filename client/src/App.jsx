import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Materials from '@/pages/Materials';
import StockAreas from '@/pages/StockAreas';
import PurchaseRequests from '@/pages/PurchaseRequests';
import PurchaseRequestCreate from '@/pages/PurchaseRequestCreate';
import PurchaseOrders from '@/pages/PurchaseOrders';
import PurchaseOrdersPreview from '@/pages/PurchaseOrdersPreview';
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
import SamplePreview from '@/pages/SamplePreview';
import SampleEdit from '@/pages/SampleEdit';
import VendorComparison from '@/pages/VendorComparison';
import VendorPriceLists from '@/pages/VendorPriceLists';
import VendorPriceListCreate from '@/pages/VendorPriceListCreate';
import VendorViewPrice from '@/pages/VendorViewPrice';
import VendorPriceListView from '@/pages/VendorPriceListView';
import Challans from '@/pages/Challans';
import NewChallan from '@/pages/NewChallan';
import ChallanItemDetail from '@/pages/ChallanItemDetail';
import ChallanView from '@/pages/ChallanView';
import MER from '@/pages/MER';
import MIR from '@/pages/MIR';
import MIRCreate from '@/pages/MIRCreate';
import MIRView from '@/pages/MIRView';
import MIRPreview from '@/pages/MIRPreview';
import ITR from '@/pages/ITR';
import ITRPreview from '@/pages/ITRPreview';
import Billing from '@/pages/Billing';
import BillingInvoiceEditor from '@/pages/BillingInvoiceEditor';
import Documents from '@/pages/Documents';
import Users from '@/pages/Users';
import Profile from '@/pages/Profile';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/AuthContext';
import { ProjectProvider } from '@/contexts/ProjectContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import ProjectSelection from '@/pages/ProjectSelection';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Inventory from '@/pages/Inventory';
import AddInventory from '@/pages/AddInventory';

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <AuthProvider>
        <ProjectProvider>
          <NotificationProvider>
            <Router>
              <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/login" element={<Navigate to="/" replace />} />

                <Route path="/projects" element={
                  <ProtectedRoute>
                    <ProjectSelection />
                  </ProtectedRoute>
                } />
                <Route path="/projects/inventory/add" element={
                  <ProtectedRoute>
                    <AddInventory />
                  </ProtectedRoute>
                } />
                <Route path="/:projectId/challans/new/details" element={
                  <ProtectedRoute>
                    <ChallanItemDetail />
                  </ProtectedRoute>
                } />
                
                <Route path="/:projectId" element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Dashboard />} />
                  <Route path="materials" element={<Materials />} />
                  <Route path="stock-areas" element={<StockAreas />} />
                  <Route path="purchase-requests" element={<PurchaseRequests />} />
                  <Route path="purchase-requests/create" element={<PurchaseRequestCreate />} />
                  <Route path="purchase-orders" element={<PurchaseOrders />} />
                  <Route path="purchase-orders/preview" element={<PurchaseOrdersPreview />} />
                  <Route path="stock-transfers" element={<StockTransfers />} />
                  <Route path="consumption" element={<Consumption />} />
                  <Route path="returns" element={<Returns />} />
                  <Route path="vendors" element={<Vendors />} />
                  <Route path="vendors/:vendorId/price-lists" element={<VendorPriceLists />} />
                  <Route path="vendors/:vendorId/price-lists/create" element={<VendorPriceListCreate />} />
                  <Route path="vendors/:vendorId/view-price" element={<VendorViewPrice />} />
                  <Route path="vendors/:vendorId/price-lists/:priceListId" element={<VendorPriceListView />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="audit-logs" element={<AuditLogs />} />
                  <Route path="boq" element={<BOQ />} />
                  <Route path="mas" element={<MAS />} />
                  <Route path="samples" element={<Samples />} />
                  <Route path="samples/preview/:id" element={<SamplePreview />} />
                  <Route path="samples/edit/:id" element={<SampleEdit />} />
                  <Route path="vendor-comparison" element={<VendorComparison />} />
                  <Route path="challans" element={<Challans />} />
                  <Route path="challans/new" element={<NewChallan />} />
                  <Route path="challans/:dcId" element={<ChallanView />} />
                  <Route path="mer" element={<MER />} />
                  <Route path="mir" element={<MIR />} />
                  <Route path="mir/create" element={<MIRCreate />} />
                  <Route path="mir/:mirId/preview" element={<MIRView />} />
                  <Route path="mir/:mirId/edit" element={<MIRCreate />} />
                  <Route path="mir/preview" element={<MIRPreview />} />
                  <Route path="itr" element={<ITR />} />
                  <Route path="itr/preview" element={<ITRPreview />} />
                  <Route path="billing" element={<Billing />} />
                  <Route path="billing/invoice-editor" element={<BillingInvoiceEditor />} />
                  <Route path="documents" element={<Documents />} />
                  <Route path="users" element={<Users />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="settings" element={<Profile />} />
                  <Route path="inventory" element={<Inventory />} />
                  <Route path="inventory/add" element={<AddInventory />} />
                </Route>
              </Routes>
              <Toaster />
            </Router>
          </NotificationProvider>
        </ProjectProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
