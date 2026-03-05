import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/error-boundary";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Patients from "@/pages/patients";
import Owners from "@/pages/owners";
import Appointments from "@/pages/appointments";
import Records from "@/pages/records";
import Lab from "@/pages/lab";
import Login from "@/pages/login";
import UserManagement from "@/pages/user-management";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminBackup from "@/pages/admin-backup";
import AdminFees from "@/pages/admin-fees";
import AdminBilling from "@/pages/admin-billing";
import AdminRoles from "@/pages/admin-roles";
import EstimatesPage from "@/pages/estimates";
import AdminUserRights from "@/pages/admin-user-rights";
import AdminData from "@/pages/admin-data";

import AdminSettings from "@/pages/admin-settings";
import AdminLabSettings from "@/pages/admin-lab-settings";
import DesignStudioPage from "@/pages/design-studio-page";
import InventoryPage from "@/pages/inventory";
import AccountsPage from "@/pages/accounts";
import SuppliersPage from "@/pages/suppliers";
import PurchaseOrdersPage from "@/pages/purchase-orders";
import StockReportPage from "@/pages/stock-report";
import PurchaseReportPage from "@/pages/purchase-report";
import ActivityLogPage from "@/pages/activity-log";

function Router() {
  const { hasPermission } = useAuth();
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/patients" component={Patients} />
      <Route path="/owners" component={Owners} />
      <Route path="/appointments" component={Appointments} />
      {hasPermission("medical_records.view", "medical_records.manage") && (
        <>
          <Route path="/records" component={Records} />
          <Route path="/lab" component={Lab} />
        </>
      )}
      {hasPermission("user_management.view", "user_management.manage") && (
        <Route path="/users" component={UserManagement} />
      )}
      {hasPermission("inventory.view", "inventory.manage") && (
        <>
          <Route path="/inventory" component={InventoryPage} />
          <Route path="/suppliers" component={SuppliersPage} />
          <Route path="/purchase-orders" component={PurchaseOrdersPage} />
        </>
      )}
      {hasPermission("reports.view", "inventory.view", "inventory.manage") && (
        <>
          <Route path="/reports/stock" component={StockReportPage} />
          <Route path="/reports/purchase" component={PurchaseReportPage} />
        </>
      )}
      {hasPermission("accounts.view", "accounts.manage") && (
        <Route path="/accounts" component={AccountsPage} />
      )}
      {hasPermission("billing.view", "billing.manage", "billing.create", "billing.edit") && (
        <>
          <Route path="/billing" component={AdminBilling} />
          <Route path="/estimates" component={EstimatesPage} />
        </>
      )}
      {hasPermission("admin_dashboard.view") && (
        <>
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/backup" component={AdminBackup} />
          <Route path="/admin/fees" component={AdminFees} />
          <Route path="/admin/roles" component={AdminRoles} />
          <Route path="/admin/user-rights" component={AdminUserRights} />
          <Route path="/admin/settings" component={AdminSettings} />
          <Route path="/admin/lab-settings" component={AdminLabSettings} />
          <Route path="/admin/design-studio/:type" component={DesignStudioPage} />
          {hasPermission("data.erase") && (
            <Route path="/admin/data" component={AdminData} />
          )}
        </>
      )}
      {hasPermission("activity_log.view") && (
        <Route path="/activity-log" component={ActivityLogPage} />
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 p-2 border-b bg-background sticky top-0 z-50">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            <ErrorBoundary>
              <Router />
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-md" />
          <Skeleton className="w-32 h-4" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ErrorBoundary>
            <AppContent />
          </ErrorBoundary>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
