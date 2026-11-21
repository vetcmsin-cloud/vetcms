import { Switch, Route, Redirect } from "wouter";
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
import NewInvoiceTerminal from "@/components/NewInvoiceTerminal";
import NewPurchaseTerminal from "@/components/NewPurchaseTerminal";
import NewPurchaseOrderTerminal from "@/components/NewPurchaseOrderTerminal";
import { NewExpenseTerminal } from "@/components/NewExpenseTerminal";
import { lazy, Suspense } from "react";
import { IdleSessionGuard } from "@/components/idle-session-guard";

// Lazy-load all page components to prevent module-graph hangs
const NotFound = lazy(() => import("@/pages/not-found"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Patients = lazy(() => import("@/pages/patients"));
const Owners = lazy(() => import("@/pages/owners"));
const Appointments = lazy(() => import("@/pages/appointments"));
const Records = lazy(() => import("@/pages/records"));
const Lab = lazy(() => import("@/pages/lab"));
const Login = lazy(() => import("@/pages/login"));
const UserManagement = lazy(() => import("@/pages/user-management"));
const AdminDashboard = lazy(() => import("@/pages/admin-dashboard"));
const AdminBackup = lazy(() => import("@/pages/admin-backup"));
const AdminFees = lazy(() => import("@/pages/admin-fees"));
const AdminBilling = lazy(() => import("@/pages/admin-billing"));
const AdminRoles = lazy(() => import("@/pages/admin-roles"));
const EstimatesPage = lazy(() => import("@/pages/estimates"));
const AdminUserRights = lazy(() => import("@/pages/admin-user-rights"));
const AdminData = lazy(() => import("@/pages/admin-data"));
const AdminSettings = lazy(() => import("@/pages/admin-settings"));
const AdminLabSettings = lazy(() => import("@/pages/admin-lab-settings"));
const AdminMedicalSettings = lazy(() => import("@/pages/admin-medical-settings"));
const AdminInventorySettings = lazy(() => import("@/pages/admin-inventory-settings"));
const AdminAccountsSettings = lazy(() => import("@/pages/admin-accounts-settings"));
const AdminFinancialYear = lazy(() => import("@/pages/admin-financial-year"));
const AdminVouchers = lazy(() => import("@/pages/admin-vouchers"));
const AdminGeneralSettings = lazy(() => import("@/pages/admin-general-settings"));
const DesignStudioPage = lazy(() => import("@/pages/design-studio-page"));
const InventoryPage = lazy(() => import("@/pages/inventory"));
const AccountsPage = lazy(() => import("@/pages/accounts"));
const SuppliersPage = lazy(() => import("@/pages/suppliers"));
const PurchaseOrdersPage = lazy(() => import("@/pages/purchase-orders"));
const PurchasesPage = lazy(() => import("@/pages/purchases"));
const StockReportPage = lazy(() => import("@/pages/stock-report"));
const PurchaseReportPage = lazy(() => import("@/pages/purchase-report"));
const ReportsDashboard = lazy(() => import("@/pages/reports-dashboard"));
const CustomerVisitReportPage = lazy(() => import("@/pages/customer-visit-report"));
const ActivityLogPage = lazy(() => import("@/pages/activity-log"));
const OpLedger = lazy(() => import("@/pages/op-ledger"));
const PublicReportViewer = lazy(() => import("@/pages/public-report-viewer"));
const PlatformAdmin = lazy(() => import("@/pages/platform-admin"));

function PageLoader() {
  return (
    <div className="min-h-[200px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-md" />
        <Skeleton className="w-24 h-3" />
      </div>
    </div>
  );
}

function Router() {
  const { hasPermission } = useAuth();
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/">
          <Dashboard />
        </Route>
        <Route path="/login">
          <Redirect to="/" />
        </Route>
        <Route path="/patients" component={Patients} />
        <Route path="/owners" component={Owners} />
        <Route path="/appointments" component={Appointments} />
        {hasPermission("medical_records.view", "medical_records.manage") && (
          <>
            <Route path="/records" component={Records} />
            <Route path="/lab" component={Lab} />
          </>
        )}
        {hasPermission("inventory.view", "inventory.manage") && (
          <Route path="/inventory" component={InventoryPage} />
        )}
        {hasPermission("inventory.view", "inventory.manage", "purchase.view", "purchase.manage") && (
          <Route path="/suppliers" component={SuppliersPage} />
        )}
        {hasPermission("purchase.view", "purchase.manage") && (
          <>
            <Route path="/purchase-orders" component={PurchaseOrdersPage} />
            <Route path="/purchases" component={PurchasesPage} />
          </>
        )}
        {hasPermission("reports.view") && (
          <>
            <Route path="/reports" component={ReportsDashboard} />
            <Route path="/reports/stock" component={StockReportPage} />
            <Route path="/reports/purchase" component={PurchaseReportPage} />
            <Route path="/reports/customer-visit" component={CustomerVisitReportPage} />
          </>
        )}
        {hasPermission("accounts.view", "accounts.manage") && (
          <Route path="/accounts" component={AccountsPage} />
        )}
        {hasPermission("billing.view", "billing.manage", "billing.create", "billing.edit") && (
          <>
            <Route path="/billing" component={AdminBilling} />
            <Route path="/estimates" component={EstimatesPage} />
            <Route path="/op-ledger" component={OpLedger} />
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
            <Route path="/admin/medical-settings" component={AdminMedicalSettings} />
            <Route path="/admin/inventory-settings" component={AdminInventorySettings} />
            <Route path="/admin/accounts-settings" component={AdminAccountsSettings} />
            <Route path="/admin/financial-year" component={AdminFinancialYear} />
            <Route path="/admin/vouchers" component={AdminVouchers} />
            <Route path="/admin/design-studio/:type" component={DesignStudioPage} />
            <Route path="/admin/general-settings" component={AdminGeneralSettings} />
            {hasPermission("data.erase") && (
              <Route path="/admin/data" component={AdminData} />
            )}
            {hasPermission("activity_log.view") && (
              <Route path="/admin/activity-log" component={ActivityLogPage} />
            )}
            {hasPermission("user_management.view", "user_management.manage") && (
              <Route path="/admin/users" component={UserManagement} />
            )}
          </>
        )}
        <Route path="/r/:filename" component={PublicReportViewer} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
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
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <ErrorBoundary>
              <Router />
            </ErrorBoundary>
          </main>
        </div>
      </div>
      <NewInvoiceTerminal />
      <NewPurchaseTerminal />
      <NewPurchaseOrderTerminal />
      <NewExpenseTerminal />
      <IdleSessionGuard />
    </SidebarProvider>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const isPublicReportRoute = typeof window !== "undefined" && (window.location.pathname.startsWith("/r/") || window.location.pathname.startsWith("/report/"));

  if (isPublicReportRoute) {
    return (
      <Suspense fallback={<PageLoader />}>
        <PublicReportViewer />
      </Suspense>
    );
  }

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
    return (
      <Suspense fallback={<PageLoader />}>
        <Login />
      </Suspense>
    );
  }

  if (user?.isPlatformAdmin) {
    return <Suspense fallback={<PageLoader />}><PlatformAdmin /></Suspense>;
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
