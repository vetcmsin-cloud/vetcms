import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Shield } from "lucide-react";
import type { User, Role } from "@shared/schema";

type SafeUser = Omit<User, "password">;

const permissionGroups: Record<string, string[]> = {
  "Dashboard": ["dashboard.view"],
  "Patients": ["patients.view", "patients.create", "patients.edit", "patients.delete"],
  "Owners": ["owners.view", "owners.create", "owners.edit", "owners.delete"],
  "Appointments": ["appointments.view", "appointments.create", "appointments.edit", "appointments.delete"],
  "Medical Records": ["medical_records.view", "medical_records.create", "medical_records.delete"],
  "Lab — Add Report": ["medical_records.create"],
  "Activity Log": ["activity_log.view"],
  "Billing": ["billing.view", "billing.create", "billing.edit", "billing.delete"],
  "Fee Structure": ["fee_structure.view", "fee_structure.manage"],
  "Inventory": ["inventory.view", "inventory.manage"],
  "Reports": ["reports.view"],
  "Accounts": ["accounts.view", "accounts.manage"],
  "User Management": ["user_management.view", "user_management.manage"],
  "Roles": ["roles.manage"],
  "Backup": ["backup.export"],
  "Admin Dashboard": ["admin_dashboard.view"],
  "Data Management": ["data.erase"],
};

function PermissionCheckboxes({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (perms: string[]) => void;
}) {
  const toggle = (perm: string) => {
    if (selected.includes(perm)) {
      onChange(selected.filter((p) => p !== perm));
    } else {
      onChange([...selected, perm]);
    }
  };

  const toggleGroup = (groupPerms: string[]) => {
    const allSelected = groupPerms.every((p) => selected.includes(p));
    if (allSelected) {
      onChange(selected.filter((p) => !groupPerms.includes(p)));
    } else {
      const newPerms = new Set([...selected, ...groupPerms]);
      onChange(Array.from(newPerms));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {Object.entries(permissionGroups).map(([group, perms]) => {
        const allSelected = perms.every((p) => selected.includes(p));
        const someSelected = perms.some((p) => selected.includes(p)) && !allSelected;
        return (
          <div key={group} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el) {
                    (el as unknown as HTMLButtonElement).dataset.indeterminate = someSelected ? "true" : "false";
                  }
                }}
                onCheckedChange={() => toggleGroup(perms)}
                data-testid={`checkbox-group-${group.toLowerCase().replace(/\s/g, "-")}`}
              />
              <Label className="text-sm font-semibold cursor-pointer" data-testid={`label-group-${group.toLowerCase().replace(/\s/g, "-")}`}>
                {group}
              </Label>
            </div>
            <div className="flex flex-col gap-1.5 ml-6">
              {perms.map((perm) => (
                <div key={perm} className="flex items-center gap-2">
                  <Checkbox
                    checked={selected.includes(perm)}
                    onCheckedChange={() => toggle(perm)}
                    data-testid={`checkbox-perm-${perm}`}
                  />
                  <Label className="text-xs text-muted-foreground cursor-pointer" data-testid={`label-perm-${perm}`}>
                    {perm}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function UserRightsDialog({
  user,
  roles,
  open,
  onOpenChange,
}: {
  user: SafeUser;
  roles: Role[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const hasCustom = user.permissions !== null && user.permissions !== undefined;
  const [inheritFromRole, setInheritFromRole] = useState(!hasCustom);
  const userRole = roles.find((r) => r.name === user.role);
  const [permissions, setPermissions] = useState<string[]>(
    hasCustom ? (user.permissions as string[]) : (userRole?.permissions || [])
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const data = inheritFromRole ? { permissions: null } : { permissions };
      const res = await apiRequest("PATCH", `/api/users/${user.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      onOpenChange(false);
      toast({ title: "Permissions updated", description: `${user.name}'s permissions have been saved.` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleInheritToggle = (checked: boolean) => {
    setInheritFromRole(checked);
    if (checked) {
      setPermissions(userRole?.permissions || []);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      onOpenChange(v);
      if (v) {
        const custom = user.permissions !== null && user.permissions !== undefined;
        setInheritFromRole(!custom);
        setPermissions(custom ? (user.permissions as string[]) : (userRole?.permissions || []));
      }
    }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User Permissions</DialogTitle>
          <DialogDescription>Configure permissions for {user.name}.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1">
            <Label className="text-sm text-muted-foreground">User</Label>
            <p className="text-sm font-medium" data-testid="text-dialog-user-name">{user.name}</p>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-sm text-muted-foreground">Role</Label>
            <p className="text-sm font-medium" data-testid="text-dialog-user-role">{user.role}</p>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="inherit-toggle" className="text-sm font-medium">
              Inherit permissions from role
            </Label>
            <Switch
              id="inherit-toggle"
              checked={inheritFromRole}
              onCheckedChange={handleInheritToggle}
              data-testid="switch-inherit-role"
            />
          </div>

          {!inheritFromRole && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">Custom Permissions</Label>
              <PermissionCheckboxes selected={permissions} onChange={setPermissions} />
            </div>
          )}

          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            data-testid="button-save-user-permissions"
          >
            {mutation.isPending ? "Saving..." : "Save Permissions"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminUserRights() {
  const { data: users, isLoading: usersLoading } = useQuery<SafeUser[]>({ queryKey: ["/api/users"] });
  const { data: roles, isLoading: rolesLoading } = useQuery<Role[]>({ queryKey: ["/api/roles"] });
  const [selectedUser, setSelectedUser] = useState<SafeUser | null>(null);

  const isLoading = usersLoading || rolesLoading;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto" data-testid="page-admin-user-rights">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/admin">
            <Button size="icon" variant="ghost" data-testid="button-back-admin">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">User Rights</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage per-user permission settings.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-9 h-9 rounded-full" />
                  <div className="flex flex-col gap-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {users?.map((user) => {
            const hasCustom = user.permissions !== null && user.permissions !== undefined;
            const userRole = roles?.find((r) => r.name === user.role);
            const displayPerms = hasCustom
              ? (user.permissions as string[])
              : (userRole?.permissions || []);

            return (
              <Card
                key={user.id}
                className="cursor-pointer hover-elevate"
                onClick={() => setSelectedUser(user)}
                data-testid={`card-user-${user.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium" data-testid={`text-user-name-${user.id}`}>
                          {user.name}
                        </span>
                        <Badge variant="secondary" data-testid={`badge-user-role-${user.id}`}>
                          {user.role}
                        </Badge>
                        {hasCustom && (
                          <Badge variant="outline" data-testid={`badge-custom-${user.id}`}>
                            Custom
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground" data-testid={`text-user-email-${user.id}`}>
                        {user.email}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {displayPerms.slice(0, 5).map((perm) => (
                          <Badge key={perm} variant="outline" className="text-xs">
                            {perm}
                          </Badge>
                        ))}
                        {displayPerms.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{displayPerms.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Shield className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedUser && roles && (
        <UserRightsDialog
          user={selectedUser}
          roles={roles}
          open={!!selectedUser}
          onOpenChange={(open) => {
            if (!open) setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
}
