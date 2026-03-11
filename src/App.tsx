import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AlertsPage from "./pages/AlertsPage";
import SlowQueriesPage from "./pages/SlowQueriesPage";
import DatabasesPage from "./pages/DatabasesPage";
import ThresholdsPage from "./pages/ThresholdsPage";
import ServersPage from "./pages/ServersPage";
import ServerDetailPage from "./pages/ServerDetailPage";
import DatabaseDetailPage from "./pages/DatabaseDetailPage";
import ZabbixConfigPage from "./pages/ZabbixConfigPage";
import NotificationsPage from "./pages/NotificationsPage";
import BackupsPage from "./pages/BackupsPage";
import ReportsPage from "./pages/ReportsPage";
import AutomationsPage from "./pages/AutomationsPage";
import AppSidebar from "./components/AppSidebar";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedLayout = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 p-3 sm:p-6 overflow-auto min-w-0 pt-[calc(theme(spacing.14)+0.75rem)] sm:pt-6">{children}</main>
    </div>
  );
};

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedLayout><DashboardPage /></ProtectedLayout>} />
      <Route path="/servers" element={<ProtectedLayout><ServersPage /></ProtectedLayout>} />
      <Route path="/servers/:id" element={<ProtectedLayout><ServerDetailPage /></ProtectedLayout>} />
      <Route path="/databases" element={<ProtectedLayout><DatabasesPage /></ProtectedLayout>} />
      <Route path="/databases/:id" element={<ProtectedLayout><DatabaseDetailPage /></ProtectedLayout>} />
      <Route path="/alerts" element={<ProtectedLayout><AlertsPage /></ProtectedLayout>} />
      <Route path="/slow-queries" element={<ProtectedLayout><SlowQueriesPage /></ProtectedLayout>} />
      <Route path="/thresholds" element={<ProtectedLayout><ThresholdsPage /></ProtectedLayout>} />
      <Route path="/backups" element={<ProtectedLayout><BackupsPage /></ProtectedLayout>} />
      <Route path="/zabbix" element={<ProtectedLayout><ZabbixConfigPage /></ProtectedLayout>} />
      <Route path="/reports" element={<ProtectedLayout><ReportsPage /></ProtectedLayout>} />
      <Route path="/automations" element={<ProtectedLayout><AutomationsPage /></ProtectedLayout>} />
      <Route path="/notifications" element={<ProtectedLayout><NotificationsPage /></ProtectedLayout>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
