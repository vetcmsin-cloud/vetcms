import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";
import type { FeeStructure } from "@shared/schema";

const CATEGORIES = [
  "Consultation",
  "Vaccination",
  "Treatment",
  "Dental",
  "Diagnostics",
  "Surgery",
  "Grooming",
  "Other",
] as const;

function categoryBadgeVariant(category: string) {
  switch (category) {
    case "Consultation":
      return "default";
    case "Vaccination":
      return "secondary";
    case "Treatment":
      return "outline";
    case "Dental":
      return "default";
    case "Diagnostics":
      return "secondary";
    case "Surgery":
      return "outline";
    case "Grooming":
      return "secondary";
    case "Other":
      return "outline";
    default:
      return "secondary";
  }
}

function formatCurrency(amount: string | number) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function AddFeeDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "",
    category: "",
    amount: "",
    description: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/fee-structures", {
        name: form.name,
        category: form.category,
        amount: form.amount,
        description: form.description || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fee-structures"] });
      setOpen(false);
      setForm({ name: "", category: "", amount: "", description: "" });
      toast({ title: "Fee created", description: "New fee has been added." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-fee">
          <Plus className="w-4 h-4 mr-1" />
          Add New Fee
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Fee</DialogTitle>
          <DialogDescription>Create a new service fee entry.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fee-name">Name</Label>
            <Input
              id="fee-name"
              placeholder="Enter fee name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              data-testid="input-fee-name"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger data-testid="select-fee-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fee-amount">Amount (₹)</Label>
            <Input
              id="fee-amount"
              type="number"
              placeholder="Enter amount"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              data-testid="input-fee-amount"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fee-description">Description</Label>
            <Textarea
              id="fee-description"
              placeholder="Enter description (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              data-testid="input-fee-description"
            />
          </div>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.name || !form.category || !form.amount}
            data-testid="button-submit-fee"
          >
            {mutation.isPending ? "Creating..." : "Create Fee"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditFeeDialog({ fee }: { fee: FeeStructure }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: fee.name,
    category: fee.category,
    amount: fee.amount,
    description: fee.description || "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/fee-structures/${fee.id}`, {
        name: form.name,
        category: form.category,
        amount: form.amount,
        description: form.description || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fee-structures"] });
      setOpen(false);
      toast({ title: "Fee updated", description: "Fee details have been saved." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (v) setForm({ name: fee.name, category: fee.category, amount: fee.amount, description: fee.description || "" });
    }}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" data-testid={`button-edit-fee-${fee.id}`}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Fee</DialogTitle>
          <DialogDescription>Update fee details.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-fee-name">Name</Label>
            <Input
              id="edit-fee-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              data-testid="input-edit-fee-name"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger data-testid="select-edit-fee-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-fee-amount">Amount (₹)</Label>
            <Input
              id="edit-fee-amount"
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              data-testid="input-edit-fee-amount"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-fee-description">Description</Label>
            <Textarea
              id="edit-fee-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              data-testid="input-edit-fee-description"
            />
          </div>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.name || !form.category || !form.amount}
            data-testid="button-save-fee"
          >
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteFeeButton({ fee }: { fee: FeeStructure }) {
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/fee-structures/${fee.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fee-structures"] });
      toast({ title: "Fee deleted", description: `${fee.name} has been removed.` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="icon" variant="ghost" data-testid={`button-delete-fee-${fee.id}`}>
          <Trash2 className="w-3.5 h-3.5 text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Fee</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{fee.name}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-cancel-delete-fee">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => mutation.mutate()}
            data-testid="button-confirm-delete-fee"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function AdminFees() {
  const { data: fees, isLoading } = useQuery<FeeStructure[]>({ queryKey: ["/api/fee-structures"] });

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto" data-testid="page-admin-fees">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/admin">
              <Button size="icon" variant="ghost" data-testid="button-back-admin">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Fee Structure</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage service fees and pricing.
          </p>
        </div>
        <AddFeeDialog />
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <div className="flex flex-col">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border-b last:border-0">
                  <div className="flex flex-col gap-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="hidden sm:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fees?.map((fee) => (
                    <TableRow key={fee.id} data-testid={`row-fee-${fee.id}`}>
                      <TableCell>
                        <span className="text-sm font-medium" data-testid={`text-fee-name-${fee.id}`}>{fee.name}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={categoryBadgeVariant(fee.category) as any} className="text-xs" data-testid={`badge-fee-category-${fee.id}`}>
                          {fee.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-semibold" data-testid={`text-fee-amount-${fee.id}`}>{formatCurrency(fee.amount)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground" data-testid={`text-fee-description-${fee.id}`}>{fee.description || "—"}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={fee.isActive === "true" ? "default" : "secondary"}
                          className="text-xs"
                          data-testid={`badge-fee-status-${fee.id}`}
                        >
                          {fee.isActive === "true" ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <EditFeeDialog fee={fee} />
                          <DeleteFeeButton fee={fee} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:hidden">
            {fees?.map((fee) => (
              <Card key={fee.id} data-testid={`card-fee-mobile-${fee.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold truncate" data-testid={`text-fee-name-mobile-${fee.id}`}>{fee.name}</span>
                        <Badge variant={categoryBadgeVariant(fee.category) as any} className="text-[10px]" data-testid={`badge-fee-category-mobile-${fee.id}`}>
                          {fee.category}
                        </Badge>
                        <Badge
                          variant={fee.isActive === "true" ? "default" : "secondary"}
                          className="text-[10px]"
                          data-testid={`badge-fee-status-mobile-${fee.id}`}
                        >
                          {fee.isActive === "true" ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <span className="text-sm font-semibold block mt-1" data-testid={`text-fee-amount-mobile-${fee.id}`}>{formatCurrency(fee.amount)}</span>
                      {fee.description && (
                        <span className="text-xs text-muted-foreground block mt-0.5" data-testid={`text-fee-description-mobile-${fee.id}`}>{fee.description}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <EditFeeDialog fee={fee} />
                      <DeleteFeeButton fee={fee} />
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