import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, ArrowLeft, Shield } from "lucide-react";
import { ALL_PERMISSIONS, type Role } from "@shared/schema";

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
  "Purchase Orders & Invoices": ["purchase.view", "purchase.create", "purchase.edit", "purchase.delete", "purchase.manage"],
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

function CreateRoleDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/roles", {
        name,
        description: description || undefined,
        permissions,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setOpen(false);
      setName("");
      setDescription("");
      setPermissions([]);
      toast({ title: "Role created", description: "New role has been added." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-role">
          <Plus className="w-4 h-4 mr-1" />
          Create Role
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Role</DialogTitle>
          <DialogDescription>Define a new role with specific permissions.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role-name">Name</Label>
            <Input
              id="role-name"
              placeholder="Enter role name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-role-name"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role-description">Description</Label>
            <Textarea
              id="role-description"
              placeholder="Enter role description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="input-role-description"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Permissions</Label>
            <PermissionCheckboxes selected={permissions} onChange={setPermissions} />
          </div>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !name}
            data-testid="button-save-role"
          >
            {mutation.isPending ? "Creating..." : "Create Role"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditRoleDialog({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description || "");
  const [permissions, setPermissions] = useState<string[]>(role.permissions || []);
  const isSystem = role.isSystem === "true";

  const mutation = useMutation({
    mutationFn: async () => {
      const data: Record<string, unknown> = { permissions, description: description || undefined };
      if (!isSystem) {
        data.name = name;
      }
      const res = await apiRequest("PATCH", `/api/roles/${role.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setOpen(false);
      toast({ title: "Role updated", description: "Role has been saved." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          setName(role.name);
          setDescription(role.description || "");
          setPermissions(role.permissions || []);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" data-testid={`button-edit-role-${role.id}`}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Role</DialogTitle>
          <DialogDescription>Update role details and permissions.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-role-name">Name</Label>
            <Input
              id="edit-role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSystem}
              data-testid="input-edit-role-name"
            />
            {isSystem && (
              <p className="text-xs text-muted-foreground">System role names cannot be changed.</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-role-description">Description</Label>
            <Textarea
              id="edit-role-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="input-edit-role-description"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Permissions</Label>
            <PermissionCheckboxes selected={permissions} onChange={setPermissions} />
          </div>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || (!isSystem && !name)}
            data-testid="button-save-edit-role"
          >
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteRoleButton({ role }: { role: Role }) {
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/roles/${role.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({ title: "Role deleted", description: `${role.name} has been removed.` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="icon" variant="ghost" data-testid={`button-delete-role-${role.id}`}>
          <Trash2 className="w-3.5 h-3.5 text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Role</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{role.name}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-cancel-delete-role">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => mutation.mutate()}
            data-testid="button-confirm-delete-role"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function AdminRoles() {
  const { data: roles, isLoading } = useQuery<Role[]>({ queryKey: ["/api/roles"] });

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto" data-testid="page-admin-roles">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/admin">
              <Button size="icon" variant="ghost" data-testid="button-back-admin">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">User Roles</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage roles and their permissions.
          </p>
        </div>
        <CreateRoleDialog />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-48" />
                  <div className="flex flex-wrap gap-1">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles?.map((role) => {
            const isSystem = role.isSystem === "true";
            return (
              <Card key={role.id} data-testid={`card-role-${role.id}`}>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-base" data-testid={`text-role-name-${role.id}`}>
                      {role.name}
                    </CardTitle>
                    {isSystem && (
                      <Badge variant="secondary" data-testid={`badge-system-${role.id}`}>
                        System
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <EditRoleDialog role={role} />
                    {!isSystem && <DeleteRoleButton role={role} />}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {role.description && (
                    <p className="text-sm text-muted-foreground mb-3" data-testid={`text-role-desc-${role.id}`}>
                      {role.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {(role.permissions || []).map((perm) => (
                      <Badge key={perm} variant="outline" className="text-xs" data-testid={`badge-perm-${role.id}-${perm}`}>
                        {perm}
                      </Badge>
                    ))}
                    {(!role.permissions || role.permissions.length === 0) && (
                      <span className="text-xs text-muted-foreground">No permissions assigned</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
