import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { X, Save, FileText, Loader2, Link as LinkIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Export the event trigger so accounts page can open it
export const openNewExpenseTerminal = () => {
    window.dispatchEvent(new Event("open-expense-terminal"));
};

export function NewExpenseTerminal() {
    const [isOpen, setIsOpen] = useState(false);
    const { toast } = useToast();

    // Form State
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [categoryId, setCategoryId] = useState("");
    const [subCategory, setSubCategory] = useState("");
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [taxPercentage, setTaxPercentage] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [vendorId, setVendorId] = useState("");
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [voucherNumber, setVoucherNumber] = useState("");
    const [attachmentUrl, setAttachmentUrl] = useState("");
    const [paidById, setPaidById] = useState("");
    const [notes, setNotes] = useState("");

    // Calculated state
    const numAmount = parseFloat(amount) || 0;
    const numTaxPct = parseFloat(taxPercentage) || 0;
    const taxAmount = (numAmount * numTaxPct) / 100;
    const totalAmount = numAmount + taxAmount;

    // Queries
    const { data: categories = [], isLoading: catsLoading } = useQuery({
        queryKey: ["/api/expense-categories"],
        enabled: isOpen
    });

    const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
        queryKey: ["/api/suppliers"],
        enabled: isOpen
    });

    const { data: users = [], isLoading: usersLoading } = useQuery({
        queryKey: ["/api/users"],
        enabled: isOpen
    });

    const { data: nextVoucherData, refetch: refetchVoucher } = useQuery<{ voucherNumber: string }>({
        queryKey: ["/api/expenses/next-voucher"],
        enabled: isOpen
    });

    // Unique Categories for first dropdown
    const uniqueCategories = Array.from(new Set(categories.map((c: any) => c.category)));
    
    // Subcategories for the selected category
    const availableSubCategories = categories.filter((c: any) => c.category === categoryId).map((c: any) => c.subCategory);

    useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        window.addEventListener("open-expense-terminal", handleOpen);
        return () => window.removeEventListener("open-expense-terminal", handleOpen);
    }, []);

    useEffect(() => {
        if (isOpen && nextVoucherData?.voucherNumber) {
            setVoucherNumber(nextVoucherData.voucherNumber);
        }
    }, [isOpen, nextVoucherData]);

    const close = () => {
        setIsOpen(false);
        // Reset form
        setDate(new Date().toISOString().split("T")[0]);
        setCategoryId("");
        setSubCategory("");
        setDescription("");
        setAmount("");
        setTaxPercentage("");
        setPaymentMethod("cash");
        setVendorId("");
        setInvoiceNumber("");
        setVoucherNumber("");
        setAttachmentUrl("");
        setPaidById("");
        setNotes("");
    };

    const saveMutation = useMutation({
        mutationFn: async (payload: any) => {
            const res = await apiRequest("POST", "/api/expenses", payload);
            if (!res.ok) throw new Error("Failed to save expense");
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Expense Saved", description: "Expense entry created successfully." });
            queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
            queryClient.invalidateQueries({ queryKey: ["/api/ledger"] });
            refetchVoucher();
            close();
        },
        onError: (err: Error) => {
            toast({ variant: "destructive", title: "Error", description: err.message });
        }
    });

    const handleSave = () => {
        if (!description) return toast({ variant: "destructive", title: "Validation Error", description: "Description is required." });
        if (!categoryId) return toast({ variant: "destructive", title: "Validation Error", description: "Category is required." });
        if (!amount || parseFloat(amount) <= 0) return toast({ variant: "destructive", title: "Validation Error", description: "Valid amount is required." });
        
        saveMutation.mutate({
            date,
            description,
            amount: parseFloat(amount).toString(),
            taxPercentage: taxPercentage ? parseFloat(taxPercentage).toString() : null,
            taxAmount: taxAmount.toString(),
            totalAmount: totalAmount.toString(),
            category: categoryId,
            subCategory: subCategory || null,
            paymentMethod,
            vendorId: vendorId ? parseInt(vendorId) : null,
            invoiceNumber: invoiceNumber || null,
            voucherNumber: voucherNumber || null,
            attachmentUrl: attachmentUrl || null,
            paidById: paidById ? parseInt(paidById) : null,
            notes: notes || null
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-full">
                {/* Header */}
                <div className="h-14 flex items-center justify-between px-6 border-b bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2 text-primary font-semibold">
                        <FileText className="w-5 h-5" />
                        <span>New Expense Entry</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={close} className="rounded-full hover:bg-slate-200">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Left Column */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>Date <span className="text-red-500">*</span></Label>
                                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Payment Mode <span className="text-red-500">*</span></Label>
                                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cash">Cash</SelectItem>
                                            <SelectItem value="card">Card</SelectItem>
                                            <SelectItem value="upi">UPI</SelectItem>
                                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                            <SelectItem value="cheque">Cheque</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Category <span className="text-red-500">*</span></Label>
                                <Select value={categoryId} onValueChange={(val) => { setCategoryId(val); setSubCategory(""); }}>
                                    <SelectTrigger>{catsLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <SelectValue placeholder="Select Category" />}</SelectTrigger>
                                    <SelectContent>
                                        {uniqueCategories.map(c => (
                                            <SelectItem key={c as string} value={c as string}>{c as string}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Sub-category</Label>
                                <Select value={subCategory} onValueChange={setSubCategory} disabled={!categoryId || availableSubCategories.length === 0}>
                                    <SelectTrigger><SelectValue placeholder="Select Sub-category" /></SelectTrigger>
                                    <SelectContent>
                                        {availableSubCategories.map(sc => (
                                            <SelectItem key={sc as string} value={sc as string}>{sc as string}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Description <span className="text-red-500">*</span></Label>
                                <Textarea placeholder="Expense details..." value={description} onChange={e => setDescription(e.target.value)} rows={3} />
                            </div>

                            <div className="space-y-1.5">
                                <Label>Vendor / Supplier</Label>
                                <Select value={vendorId} onValueChange={setVendorId}>
                                    <SelectTrigger>{suppliersLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <SelectValue placeholder="Select Vendor (Optional)" />}</SelectTrigger>
                                    <SelectContent>
                                        {(suppliers as any[]).map(s => (
                                            <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>Amount (Base) <span className="text-red-500">*</span></Label>
                                    <Input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Tax % (GST/VAT)</Label>
                                    <Input type="number" min="0" step="0.1" value={taxPercentage} onChange={e => setTaxPercentage(e.target.value)} placeholder="e.g. 18" />
                                </div>
                            </div>
                            
                            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg space-y-2">
                                <div className="flex justify-between text-sm text-slate-500">
                                    <span>Base Amount:</span>
                                    <span>₹{numAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-slate-500">
                                    <span>Tax Amount:</span>
                                    <span>₹{taxAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold text-slate-800 dark:text-slate-200 border-t pt-2 mt-2">
                                    <span>Total Amount:</span>
                                    <span>₹{totalAmount.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>Invoice / Bill No.</Label>
                                    <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="Bill #" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Voucher No.</Label>
                                    <Input value={voucherNumber} onChange={e => setVoucherNumber(e.target.value)} placeholder="Voucher #" />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>Paid By (Staff)</Label>
                                    <Select value={paidById} onValueChange={setPaidById}>
                                        <SelectTrigger>{usersLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <SelectValue placeholder="Select Staff" />}</SelectTrigger>
                                        <SelectContent>
                                            {(users as any[]).map(u => (
                                                <SelectItem key={u.id} value={u.id.toString()}>{u.username}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Attachment URL</Label>
                                <div className="flex gap-2">
                                    <Input value={attachmentUrl} onChange={e => setAttachmentUrl(e.target.value)} placeholder="https://..." className="flex-1" />
                                    {attachmentUrl && (
                                        <Button variant="outline" size="icon" onClick={() => window.open(attachmentUrl, "_blank")}>
                                            <LinkIcon className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">Paste a link to the receipt or invoice scan.</p>
                            </div>
                            
                            <div className="space-y-1.5">
                                <Label>Internal Notes</Label>
                                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." />
                            </div>

                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                    <Button variant="outline" onClick={close}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
                        {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Expense
                    </Button>
                </div>
            </div>
        </div>
    );
}
