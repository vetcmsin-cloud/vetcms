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
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Patients from "@/pages/patients";
import Owners from "@/pages/owners";
import Appointments from "@/pages/appointments";
import Records from "@/pages/records";
import Login from "@/pages/login";
import UserManagement from "@/pages/user-management";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminBackup from "@/pages/admin-backup";
import AdminFees from "@/pages/admin-fees";
import AdminBilling from "@/pages/admin-billing";
import AdminRoles from "@/pages/admin-roles";
import AdminUserRights from "@/pages/admin-user-rights";
import AdminData from "@/pages/admin-data";
import AdminSettings from "@/pages/admin-settings";

function Router() {
  const { hasPermission } = useAuth();
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/patients" component={Patients} />
      <Route path="/owners" component={Owners} />
      <Route path="/appointments" component={Appointments} />
      {hasPermission("medical_records.view", "medical_records.manage") && (
        <Route path="/records" component={Records} />
      )}
      {hasPermission("user_management.view", "user_management.manage") && (
        <Route path="/users" component={UserManagement} />
      )}
      {hasPermission("billing.view", "billing.manage") && (
        <Route path="/admin/billing" component={AdminBilling} />
      )}
      {hasPermission("admin_dashboard.view") && (
        <>
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/backup" component={AdminBackup} />
          <Route path="/admin/fees" component={AdminFees} />
          <Route path="/admin/roles" component={AdminRoles} />
          <Route path="/admin/user-rights" component={AdminUserRights} />
          <Route path="/admin/settings" component={AdminSettings} />
          <Route path="/admin/data" component={AdminData} />
        </>
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
            <Router />
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
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
