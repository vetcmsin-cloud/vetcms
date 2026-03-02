import { useState } from "react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { type Expense, type InsertExpense, insertExpenseSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AccountsPage() {
    const { user, hasPermission } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const { data: expenses, isLoading: loadingExpenses } = useQuery<Expense[]>({
        queryKey: ["/api/expenses"],
    });

    const { data: summary, isLoading: loadingSummary } = useQuery<{
        income: number;
        expenses: number;
        netProfit: number;
    }>({
        queryKey: ["/api/accounts/summary"],
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/expenses/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
            queryClient.invalidateQueries({ queryKey: ["/api/accounts/summary"] });
            toast({
                title: "Expense deleted",
                description: "Expense record has been removed.",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    if (loadingExpenses || loadingSummary) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-border" />
            </div>
        );
    }

    if (!hasPermission("accounts.view")) {
        return (
            <div className="flex items-center justify-center min-h-screen text-muted-foreground">
                You do not have permission to view accounts.
            </div>
        );
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2,
        }).format(amount);
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Accounts & Expenses</h1>
                    <p className="text-muted-foreground mt-2">
                        Track clinic expenses and view financial summary.
                    </p>
                </div>
                {hasPermission("accounts.manage") && (
                    <Button onClick={() => setIsDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Expense
                    </Button>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(summary?.income || 0)}</div>
                        <p className="text-xs text-muted-foreground">
                            From paid invoices
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(summary?.expenses || 0)}</div>
                        <p className="text-xs text-muted-foreground">
                            Recorded expenses
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                        <Wallet className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${summary?.netProfit && summary.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {formatCurrency(summary?.netProfit || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Income - Expenses
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="rounded-md border bg-card">
                <div className="p-4 border-b">
                    <h2 className="font-semibold">Recent Expenses</h2>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Payment Method</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            {hasPermission("accounts.manage") && <TableHead className="w-[100px]">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {expenses?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    No expenses recorded.
                                </TableCell>
                            </TableRow>
                        ) : (
                            expenses?.map((expense) => (
                                <TableRow key={expense.id}>
                                    <TableCell className="font-mono text-xs">
                                        {new Date(expense.date).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                            {expense.category}
                                        </div>
                                    </TableCell>
                                    <TableCell>{expense.description}</TableCell>
                                    <TableCell className="text-muted-foreground">{expense.paymentMethod}</TableCell>
                                    <TableCell className="text-right font-medium">
                                        {formatCurrency(Number(expense.amount))}
                                    </TableCell>
                                    {hasPermission("accounts.manage") && (
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => {
                                                    if (confirm("Are you sure you want to delete this expense?")) {
                                                        deleteMutation.mutate(expense.id);
                                                    }
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <ExpenseDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
            />
        </div>
    );
}

function ExpenseDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const form = useForm<InsertExpense>({
        resolver: zodResolver(insertExpenseSchema),
        defaultValues: {
            date: format(new Date(), "yyyy-MM-dd"),
            description: "",
            amount: "0",
            category: "",
            paymentMethod: "",
            notes: "",
            recordedBy: user?.id,
        },
    });

    const mutation = useMutation({
        mutationFn: async (values: InsertExpense) => {
            await apiRequest("POST", "/api/expenses", { ...values, recordedBy: user?.id });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
            queryClient.invalidateQueries({ queryKey: ["/api/accounts/summary"] });
            toast({
                title: "Expense added",
                description: "New expense has been recorded.",
            });
            onOpenChange(false);
            form.reset();
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add Expense</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Date</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Amount</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Category</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select category" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Supplies">Supplies</SelectItem>
                                            <SelectItem value="Utilities">Utilities</SelectItem>
                                            <SelectItem value="Salary">Salary</SelectItem>
                                            <SelectItem value="Maintenance">Maintenance</SelectItem>
                                            <SelectItem value="Marketing">Marketing</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Expense description" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="paymentMethod"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Payment Method</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select payment method" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Cash">Cash</SelectItem>
                                            <SelectItem value="Card">Card</SelectItem>
                                            <SelectItem value="UPI">UPI</SelectItem>
                                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                            <SelectItem value="Cheque">Cheque</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes (Optional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Additional notes..." {...field} value={field.value || ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Save Expense
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
