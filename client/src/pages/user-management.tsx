import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, UserPlus, Shield, Eye, EyeOff } from "lucide-react";
import type { User, Role } from "@shared/schema";

type SafeUser = Omit<User, "password">;

function roleBadgeVariant(role: string) {
  switch (role) {
    case "superadmin":
      return "default";
    case "doctor":
      return "secondary";
    case "receptionist":
      return "outline";
    default:
      return "secondary";
  }
}

function roleLabel(role: string) {
  switch (role) {
    case "superadmin":
      return "Super Admin";
    case "admin":
      return "Administrator";
    case "doctor":
      return "Doctor";
    case "receptionist":
      return "Receptionist";
    default:
      return role;
  }
}

function AddUserDialog() {
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "admin",
  });

  const { data: roles } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
    enabled: open,
  });

  // Filter out superadmin role for the role selector
  const availableRoles = roles?.filter(r =>
    r.name !== "superadmin"
  ) || [];



  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/users", { ...form });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setOpen(false);
      setForm({ name: "", email: "", phone: "", password: "", role: "admin" });
      toast({ title: "User created", description: "New staff member has been added." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-user">
          <UserPlus className="w-4 h-4 mr-1" />
          Add New User
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Staff Member</DialogTitle>
          <DialogDescription>Create a new user account with the appropriate role.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user-name">Full Name</Label>
            <Input
              id="user-name"
              placeholder="Enter full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              data-testid="input-user-name"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user-phone">Phone Number</Label>
            <Input
              id="user-phone"
              type="tel"
              placeholder="Enter mobile number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              data-testid="input-user-phone"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              type="email"
              placeholder="user@petpointvet.in"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              data-testid="input-user-email"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user-password">Password</Label>
            <div className="relative">
              <Input
                id="user-password"
                type={showPassword ? "text" : "password"}
                placeholder="Create password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="pr-10"
                data-testid="input-user-password"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="absolute right-0 top-0"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger data-testid="select-user-role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.length > 0 ? (
                  availableRoles.map((r) => (
                    <SelectItem key={r.id} value={r.name}>
                      {r.name.charAt(0).toUpperCase() + r.name.slice(1)}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="admin">Admin</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-3 py-2 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
            <Shield className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>New user will be granted permissions <strong>based on their selected role</strong>. You can adjust specific permissions anytime via <em>User Rights</em>.</span>
          </div>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.name || !form.email || !form.phone || !form.password}
            data-testid="button-submit-user"
          >
            {mutation.isPending ? "Creating..." : "Create User"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({ user }: { user: SafeUser }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    role: user.role,
    password: "",
  });

  const { data: roles } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
    enabled: open,
  });

  // Filter out superadmin from role list
  const availableRoles = roles?.filter(r => r.name !== "superadmin") || [];

  const mutation = useMutation({
    mutationFn: async () => {
      const data: any = { name: form.name, email: form.email, phone: form.phone, role: form.role };
      if (form.password) data.password = form.password;
      const res = await apiRequest("PATCH", `/api/users/${user.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setOpen(false);
      toast({ title: "User updated", description: "User details have been saved." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (v) setForm({ name: user.name, email: user.email, phone: user.phone || "", role: user.role, password: "" });
    }}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" data-testid={`button-edit-user-${user.id}`}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>Update user details and role assignment.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-name">Full Name</Label>
            <Input
              id="edit-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              data-testid="input-edit-user-name"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-phone">Phone Number</Label>
            <Input
              id="edit-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              data-testid="input-edit-user-phone"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              data-testid="input-edit-user-email"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-password">New Password (leave blank to keep current)</Label>
            <Input
              id="edit-password"
              type="password"
              placeholder="Leave blank to keep current"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              data-testid="input-edit-user-password"
            />
          </div>
          {user.role !== "superadmin" && (
            <div className="flex flex-col gap-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger data-testid="select-edit-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.length > 0 ? (
                    availableRoles.map((r) => (
                      <SelectItem key={r.id} value={r.name}>
                        {r.name.charAt(0).toUpperCase() + r.name.slice(1)}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="admin">Admin</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.name || !form.email}
            data-testid="button-save-user"
          >
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteUserButton({ user }: { user: SafeUser }) {
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/users/${user.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User deleted", description: `${user.name} has been removed.` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="icon" variant="ghost" data-testid={`button-delete-user-${user.id}`}>
          <Trash2 className="w-3.5 h-3.5 text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete User</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {user.name}? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => mutation.mutate()}
            data-testid="button-confirm-delete"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading } = useQuery<SafeUser[]>({ queryKey: ["/api/users"] });

  const filteredUsers = users?.filter(u =>
    (currentUser?.role?.toLowerCase() === "superadmin") ? true : (u.role?.toLowerCase() !== "superadmin")
  );

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto" data-testid="page-user-management">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage staff access and credentials.
          </p>
        </div>
        <AddUserDialog />
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <div className="flex flex-col">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border-b last:border-0">
                  <Skeleton className="w-9 h-9 rounded-full" />
                  <div className="flex flex-col gap-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop/Tablet Table View */}
          <Card className="hidden sm:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.map((user) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                              {user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={roleBadgeVariant(user.role) as any} className="text-xs">
                          {roleLabel(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{user.email}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <EditUserDialog user={user} />
                          {user.role !== "superadmin" && (
                            <DeleteUserButton user={user} />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile Card View */}
          <div className="flex flex-col gap-3 sm:hidden">
            {filteredUsers?.map((user) => (
              <Card key={user.id} data-testid={`card-user-mobile-${user.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold truncate">{user.name}</span>
                        <Badge variant={roleBadgeVariant(user.role) as any} className="text-[10px]">
                          {roleLabel(user.role)}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground truncate block">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <EditUserDialog user={user} />
                      {user.role !== "superadmin" && (
                        <DeleteUserButton user={user} />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
