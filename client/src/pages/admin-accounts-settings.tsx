import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Wallet, Plus, Trash2, Pencil } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpenseCategory } from "@shared/schema";

export default function AdminAccountsSettings() {
    return (
        <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto" data-testid="page-admin-accounts-settings">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <Link href="/admin">
                        <Button size="icon" variant="ghost" data-testid="button-back-admin">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <Wallet className="w-6 h-6 text-primary" />
                    <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
                        Accounts Settings
                    </h1>
                </div>
                <p className="text-sm text-muted-foreground ml-[72px]">
                    Configure Accounts module settings, including Expense Categories.
                </p>
            </div>

            <ExpenseSettings />
        </div>
    );
}

function ExpenseSettings() {
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
    const [categoryName, setCategoryName] = useState("");
    const [subCategoryName, setSubCategoryName] = useState("");
    const [description, setDescription] = useState("");

    const { data: categories = [], isLoading } = useQuery<ExpenseCategory[]>({
        queryKey: ["/api/expense-categories"],
    });

    const createMutation = useMutation({
        mutationFn: async (data: { category: string; subCategory: string; description?: string }) => {
            const res = await apiRequest("POST", "/api/expense-categories", data);
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/expense-categories"] });
            toast({ title: "Success", description: "Expense category created." });
            closeDialog();
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (data: { id: number; category: string; subCategory: string; description?: string }) => {
            const res = await apiRequest("PATCH", `/api/expense-categories/${data.id}`, { category: data.category, subCategory: data.subCategory, description: data.description });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/expense-categories"] });
            toast({ title: "Success", description: "Expense category updated." });
            closeDialog();
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await apiRequest("DELETE", `/api/expense-categories/${id}`);
            if (!res.ok) throw new Error(await res.text());
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/expense-categories"] });
            toast({ title: "Success", description: "Expense category deleted." });
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const seedMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", "/api/expense-categories/seed");
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["/api/expense-categories"] });
            toast({ title: "Success", description: data.message || "Default categories seeded." });
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const migrateClinicalMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", "/api/expense-categories/migrate-clinical");
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["/api/expense-categories"] });
            toast({ title: "Success", description: data.message || "Clinical/Medical categories updated." });
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const openCreateDialog = () => {
        setEditingCategory(null);
        setCategoryName("");
        setSubCategoryName("");
        setDescription("");
        setIsDialogOpen(true);
    };

    const openEditDialog = (cat: ExpenseCategory) => {
        setEditingCategory(cat);
        setCategoryName(cat.category);
        setSubCategoryName(cat.subCategory || "");
        setDescription(cat.description || "");
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
    };

    const handleSave = () => {
        if (!categoryName || !subCategoryName) return toast({ title: "Error", description: "Category and sub-category are required.", variant: "destructive" });
        if (editingCategory) {
            updateMutation.mutate({ id: editingCategory.id, category: categoryName, subCategory: subCategoryName, description });
        } else {
            createMutation.mutate({ category: categoryName, subCategory: subCategoryName, description });
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Expense Categories</CardTitle>
                    <CardDescription>Manage categories for your expenses</CardDescription>
                </div>
                <div className="flex items-center gap-2">

                    <Button onClick={openCreateDialog} size="sm" className="gap-2">
                        <Plus className="w-4 h-4" /> Add Category
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="text-sm text-muted-foreground">Loading categories...</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Primary Category</TableHead>
                                <TableHead>Sub-Category</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="w-[100px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                                        No expense categories found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                categories.map((cat) => (
                                    <TableRow key={cat.id}>
                                        <TableCell className="font-medium">{cat.category}</TableCell>
                                        <TableCell>{cat.subCategory}</TableCell>
                                        <TableCell>{cat.description || "-"}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button size="icon" variant="ghost" onClick={() => openEditDialog(cat)}>
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" onClick={() => {
                                                    if (confirm("Are you sure you want to delete this category?")) {
                                                        deleteMutation.mutate(cat.id);
                                                    }
                                                }}>
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
            </CardContent>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingCategory ? "Edit Expense Category" : "Add Expense Category"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Primary Category</Label>
                            <Input
                                id="name"
                                value={categoryName}
                                onChange={(e) => setCategoryName(e.target.value)}
                                placeholder="e.g. Clinical/Medical"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="sub">Sub-Category</Label>
                            <Input
                                id="sub"
                                value={subCategoryName}
                                onChange={(e) => setSubCategoryName(e.target.value)}
                                placeholder="e.g. Vaccines & Biologicals"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="desc">Description (Optional)</Label>
                            <Input
                                id="desc"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Details about this category"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                        <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                            Save
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
