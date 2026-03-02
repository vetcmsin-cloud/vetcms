import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { type Supplier, type InsertSupplier, insertSupplierSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Loader2, Plus, Search, Pencil, Trash2, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SuppliersPage() {
    const { hasPermission } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Supplier | null>(null);

    const { data: suppliers, isLoading } = useQuery<Supplier[]>({
        queryKey: ["/api/suppliers"],
    });

    const filteredItems = suppliers?.filter((s) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.contactPerson || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.phone || "").includes(searchTerm)
    );

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/suppliers/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
            toast({ title: "Supplier deleted", description: "Supplier has been removed." });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-border" />
            </div>
        );
    }

    if (!hasPermission("inventory.view")) {
        return (
            <div className="flex items-center justify-center min-h-screen text-muted-foreground">
                You do not have permission to view suppliers.
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage your product and medicine suppliers.
                    </p>
                </div>
                {hasPermission("inventory.manage") && (
                    <Button onClick={() => { setEditingItem(null); setIsDialogOpen(true); }}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Supplier
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-muted-foreground">Total Suppliers</span>
                                <span className="text-2xl font-bold">{suppliers?.length || 0}</span>
                            </div>
                            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
                                <Truck className="w-5 h-5 text-primary" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, contact, or phone..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Contact Person</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Address</TableHead>
                            {hasPermission("inventory.manage") && <TableHead className="w-[100px]">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredItems?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    No suppliers found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredItems?.map((s) => (
                                <TableRow key={s.id}>
                                    <TableCell className="font-medium">{s.name}</TableCell>
                                    <TableCell>{s.contactPerson || "-"}</TableCell>
                                    <TableCell>{s.phone}</TableCell>
                                    <TableCell>{s.email || "-"}</TableCell>
                                    <TableCell className="max-w-[200px] truncate">{s.address || "-"}</TableCell>
                                    {hasPermission("inventory.manage") && (
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button variant="ghost" size="icon" className="h-8 w-8"
                                                    onClick={() => { setEditingItem(s); setIsDialogOpen(true); }}>
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => { if (confirm("Delete this supplier?")) deleteMutation.mutate(s.id); }}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <SupplierDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} supplier={editingItem} />
        </div>
    );
}

function SupplierDialog({
    open, onOpenChange, supplier,
}: {
    open: boolean; onOpenChange: (open: boolean) => void; supplier: Supplier | null;
}) {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const form = useForm<InsertSupplier>({
        resolver: zodResolver(insertSupplierSchema),
        defaultValues: {
            name: "", contactPerson: "", email: "", phone: "", address: "", notes: "",
        },
    });

    useEffect(() => {
        if (open) {
            if (supplier) {
                form.reset({
                    name: supplier.name,
                    contactPerson: supplier.contactPerson || "",
                    email: supplier.email || "",
                    phone: supplier.phone,
                    address: supplier.address || "",
                    notes: supplier.notes || "",
                });
            } else {
                form.reset({ name: "", contactPerson: "", email: "", phone: "", address: "", notes: "" });
            }
        }
    }, [open, supplier, form]);

    const mutation = useMutation({
        mutationFn: async (values: InsertSupplier) => {
            if (supplier) {
                await apiRequest("PATCH", `/api/suppliers/${supplier.id}`, values);
            } else {
                await apiRequest("POST", "/api/suppliers", values);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
            toast({
                title: supplier ? "Supplier updated" : "Supplier created",
                description: supplier ? "Supplier details updated." : "New supplier added.",
            });
            onOpenChange(false);
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{supplier ? "Edit Supplier" : "Add New Supplier"}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
                        <FormField control={form.control} name="name"
                            render={({ field }) => (
                                <FormItem><FormLabel>Company Name *</FormLabel>
                                    <FormControl><Input placeholder="Supplier name" {...field} /></FormControl>
                                    <FormMessage /></FormItem>
                            )} />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="contactPerson"
                                render={({ field }) => (
                                    <FormItem><FormLabel>Contact Person</FormLabel>
                                        <FormControl><Input placeholder="Name" {...field} value={field.value || ""} /></FormControl>
                                        <FormMessage /></FormItem>
                                )} />
                            <FormField control={form.control} name="phone"
                                render={({ field }) => (
                                    <FormItem><FormLabel>Phone *</FormLabel>
                                        <FormControl><Input placeholder="Phone number" {...field} /></FormControl>
                                        <FormMessage /></FormItem>
                                )} />
                        </div>
                        <FormField control={form.control} name="email"
                            render={({ field }) => (
                                <FormItem><FormLabel>Email</FormLabel>
                                    <FormControl><Input placeholder="email@example.com" {...field} value={field.value || ""} /></FormControl>
                                    <FormMessage /></FormItem>
                            )} />
                        <FormField control={form.control} name="address"
                            render={({ field }) => (
                                <FormItem><FormLabel>Address</FormLabel>
                                    <FormControl><Input placeholder="Full address" {...field} value={field.value || ""} /></FormControl>
                                    <FormMessage /></FormItem>
                            )} />
                        <FormField control={form.control} name="notes"
                            render={({ field }) => (
                                <FormItem><FormLabel>Notes</FormLabel>
                                    <FormControl><Input placeholder="Additional notes" {...field} value={field.value || ""} /></FormControl>
                                    <FormMessage /></FormItem>
                            )} />
                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {supplier ? "Update" : "Create"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
