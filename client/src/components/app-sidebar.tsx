import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  PawPrint,
  Users,
  CalendarDays,
  FileText,
  Shield,
  Settings,
  LogOut,
  Receipt,
  Package,
  Wallet,
  Truck,
  ShoppingCart,
  BarChart3,
  ClipboardList,
  Activity,
  FlaskConical,
} from "lucide-react";
import logoImg from "@assets/Untitled_design_(2)_-_Copy_1770707768689.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";

const mainNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, permissions: ["dashboard.view"] },
  { title: "Patients", url: "/patients", icon: PawPrint, permissions: ["patients.view", "patients.manage"] },
  { title: "Owners", url: "/owners", icon: Users, permissions: ["owners.view", "owners.manage"] },
  { title: "Appointments", url: "/appointments", icon: CalendarDays, permissions: ["appointments.view", "appointments.manage"] },
  { title: "Medical Records", url: "/records", icon: FileText, permissions: ["medical_records.view", "medical_records.manage"] },
  { title: "Lab", url: "/lab", icon: FlaskConical, permissions: ["medical_records.view", "medical_records.manage"] },
  { title: "Accounts", url: "/accounts", icon: Wallet, permissions: ["accounts.view", "accounts.manage"] },
  { title: "Billing", url: "/billing", icon: Receipt, permissions: ["billing.view", "billing.manage"] },
];

const inventoryNav = [
  { title: "Inventory", url: "/inventory", icon: Package },
  { title: "Suppliers", url: "/suppliers", icon: Truck },
  { title: "Purchase Orders", url: "/purchase-orders", icon: ShoppingCart },
  { title: "Stock Report", url: "/reports/stock", icon: BarChart3 },
  { title: "Purchase Report", url: "/reports/purchase", icon: ClipboardList },
];

const adminNav = [
  { title: "Admin Dashboard", url: "/admin", icon: Settings, permissions: ["admin_dashboard.view"] },
  { title: "User Management", url: "/users", icon: Shield, permissions: ["user_management.view", "user_management.manage"] },
  { title: "Activity Log", url: "/activity-log", icon: Activity, permissions: ["activity_log.view", "admin_dashboard.view"] },
];

function roleLabel(role: string) {
  switch (role) {
    case "superadmin": return "Super Admin";
    case "admin": return "Administrator";
    case "doctor": return "Doctor";
    case "receptionist": return "Receptionist";
    default: return role;
  }
}

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout, hasPermission } = useAuth();
  const { data: settings } = useQuery<Record<string, string>>({ queryKey: ["/api/clinic-settings"] });

  const visibleMain = mainNav.filter((item) => user && hasPermission(...item.permissions));
  const visibleAdmin = adminNav.filter((item) => user && hasPermission(...item.permissions));

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" data-testid="link-logo">
          <div className="flex items-center gap-3">
            <img src={settings?.clinicLogoUrl || logoImg} alt={settings?.clinicName || "PetPoint Pro"} className="w-9 h-9 rounded-md object-cover" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight">{settings?.clinicName || "PetPoint Pro"}</span>
              <span className="text-[11px] text-muted-foreground">{settings?.clinicTagline || "Veterinary Clinic"}</span>
            </div>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMain.map((item) => {
                const isActive =
                  item.url === "/"
                    ? location === "/"
                    : location.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user && hasPermission("inventory.view", "inventory.manage") && (
          <SidebarGroup>
            <SidebarGroupLabel>Inventory & Supply</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {inventoryNav.map((item) => {
                  const isActive = location === item.url || location.startsWith(item.url + "/");
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <Link href={item.url}>
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {visibleAdmin.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleAdmin.map((item) => {
                  const isActive =
                    item.url === "/admin"
                      ? location === "/admin" || location.startsWith("/admin/")
                      : location === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <Link href={item.url}>
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="p-3">
        {user && (
          <div className="flex items-center gap-3 p-2 rounded-md bg-sidebar-accent/50">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-xs font-medium truncate">{user.name}</span>
              <Badge variant="outline" className="text-[9px] w-fit">{roleLabel(user.role)}</Badge>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => logout.mutate()}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
