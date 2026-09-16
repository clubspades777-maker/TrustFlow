import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import NGODirectory from '@/pages/NGODirectory';
import NGODetail from '@/pages/NGODetail';
import Apply from '@/pages/Apply';
import DonorDashboard from '@/pages/DonorDashboard';
import AdminDashboard from '@/pages/AdminDashboard';
import RiskDashboard from '@/pages/RiskDashboard';
import FundraiserList from '@/pages/FundraiserList';
import FundraiserCreate from '@/pages/FundraiserCreate';
import FundraiserDetail from '@/pages/FundraiserDetail';
import ExpenseReport from '@/pages/ExpenseReport';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/ngos" element={<NGODirectory />} />
          <Route path="/ngos/:id" element={<NGODetail />} />
          <Route path="/ngos/:id/expenses" element={<ExpenseReport />} />
          <Route path="/apply" element={<Apply />} />
          <Route path="/donor" element={<DonorDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/risk" element={<RiskDashboard />} />
          <Route path="/fundraisers" element={<FundraiserList />} />
          <Route path="/fundraisers/create" element={<FundraiserCreate />} />
          <Route path="/fundraisers/:id" element={<FundraiserDetail />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App