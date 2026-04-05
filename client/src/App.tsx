import { Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme';
import Layout from './layouts/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import DocumentsPage from './pages/documents/DocumentsPage';
import DocumentViewPage from './pages/documents/DocumentViewPage';
import SubscriptionDashboard from './pages/account/SubscriptionDashboard';
import SMSTopUp from './pages/account/SMSTopUp';
import NotFoundPage from './pages/NotFoundPage';
import OfflineIndicator from './components/offline/OfflineIndicator';
import InstallPrompt from './components/offline/InstallPrompt';
import { useOffline } from './contexts/OfflineContext';

function App() {
  const { isOffline, queueLength, showInstallPrompt, installType, dismissInstallPrompt } = useOffline();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="documents/:id" element={<DocumentViewPage />} />
            {/* Account & Billing Management Routes */}
            <Route path="account/subscription" element={<SubscriptionDashboard />} />
            <Route path="account/sms-topup" element={<SMSTopUp />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
        
        {/* Offline components */}
        <OfflineIndicator isOffline={isOffline} queueLength={queueLength} />
        <InstallPrompt open={showInstallPrompt} installType={installType} onClose={dismissInstallPrompt} />
      </Box>
    </ThemeProvider>
  );
}

export default App;
