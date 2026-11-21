import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, isWithinInterval, parseISO, startOfDay } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Loader2, 
  Printer, 
  Users, 
  TrendingUp, 
  Calendar,
  Search,
  ArrowUpDown,
  SortAsc,
  SortDesc
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { 
  Owner, 
  Appointment, 
  Invoice, 
  Pet, 
  MedicalRecord 
} from "@shared/schema";

type VisitReportItem = {
  ownerId: number;
  name: string;
  phone: string;
  address: string;
  visitCount: number;
  totalSpent: number;
};

export default function CustomerVisitReportPage() {
  const [dateRange, setDateRange] = useState<"weekly" | "monthly" | "custom">("monthly");
  const [customFrom, setCustomFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [customTo, setCustomTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"visitCount" | "totalSpent" | "name">("visitCount");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { data: owners, isLoading: ownersLoading } = useQuery<Owner[]>({ queryKey: ["/api/owners"] });
  const { data: appointments, isLoading: apptsLoading } = useQuery<Appointment[]>({ queryKey: ["/api/appointments"] });
  const { data: invoices, isLoading: invoicesLoading } = useQuery<Invoice[]>({ queryKey: ["/api/invoices"] });
  const { data: pets, isLoading: petsLoading } = useQuery<Pet[]>({ queryKey: ["/api/pets"] });
  const { data: medicalRecords, isLoading: recordsLoading } = useQuery<MedicalRecord[]>({ queryKey: ["/api/medical-records"] });

  const isLoading = ownersLoading || apptsLoading || invoicesLoading || petsLoading || recordsLoading;

  const toggleSort = (field: "visitCount" | "totalSpent" | "name") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const reportData = useMemo(() => {
    if (!owners || !appointments || !invoices || !pets || !medicalRecords) return [];

    const now = new Date();
    let start: Date;
    let end: Date = now;

    if (dateRange === "weekly") {
      start = startOfDay(subDays(now, 7));
    } else if (dateRange === "monthly") {
      start = startOfDay(subDays(now, 30));
    } else {
      start = startOfDay(parseISO(customFrom));
      end = startOfDay(parseISO(customTo));
    }

    const interval = { start, end };

    // Maps to track metrics per owner
    const ownerVisits = new Map<number, Set<string>>(); // ownerId -> Set of unique visit dates
    const ownerSpend = new Map<number, number>(); // ownerId -> total spent

    // 1. Process Appointments
    appointments.forEach(appt => {
      try {
        const apptDate = parseISO(appt.date);
        if (isWithinInterval(apptDate, interval)) {
          if (!ownerVisits.has(appt.ownerId)) ownerVisits.set(appt.ownerId, new Set());
          ownerVisits.get(appt.ownerId)?.add(appt.date);
        }
      } catch (e) { /* ignore invalid dates */ }
    });

    // 2. Process Medical Records (link via pets)
    const petToOwner = new Map(pets.map(p => [p.id, p.ownerId]));
    medicalRecords.forEach(record => {
      try {
        const ownerId = petToOwner.get(record.petId);
        const recordDate = parseISO(record.date);
        if (ownerId && isWithinInterval(recordDate, interval)) {
          if (!ownerVisits.has(ownerId)) ownerVisits.set(ownerId, new Set());
          ownerVisits.get(ownerId)?.add(record.date);
        }
      } catch (e) { /* ignore invalid dates */ }
    });

    // 3. Process Invoices
    invoices.forEach(inv => {
      try {
        const invDate = parseISO(inv.date);
        if (isWithinInterval(invDate, interval)) {
          const current = ownerSpend.get(inv.ownerId) || 0;
          ownerSpend.set(inv.ownerId, current + parseFloat(String(inv.total)));
        }
      } catch (e) { /* ignore invalid dates */ }
    });

    // Build final list
    const results: VisitReportItem[] = owners.map(owner => ({
      ownerId: owner.id,
      name: `${owner.firstName} ${owner.lastName || ""}`.trim(),
      phone: owner.phone,
      address: owner.address || "-",
      visitCount: ownerVisits.get(owner.id)?.size || 0,
      totalSpent: ownerSpend.get(owner.id) || 0,
    }));

    // Filter by search term AND visitCount > 0
    return results
      .filter(item => 
        item.visitCount > 0 && 
        (item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
         item.phone.includes(searchTerm))
      )
      .sort((a, b) => {
        const factor = sortOrder === "asc" ? 1 : -1;
        if (sortBy === "name") return a.name.localeCompare(b.name) * factor;
        return (a[sortBy] - b[sortBy]) * factor;
      });
  }, [owners, appointments, invoices, pets, medicalRecords, dateRange, customFrom, customTo, searchTerm, sortBy, sortOrder]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 print:p-0 print:m-0 print:bg-white w-full">
      {/* Print Specific CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Hide sidebar and navigation */
          [data-sidebar="sidebar"], 
          [data-sidebar="trigger"],
          nav, 
          header,
          .print\\:hidden { 
            display: none !important; 
          }

          /* Force main content to take full width/height */
          body, html {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            width: 100% !important;
          }

          [data-slot="sidebar-wrapper"],
          [data-slot="sidebar-inset"],
          main {
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
            width: 100% !important;
            overflow: visible !important;
            position: static !important;
          }

          .print-header { 
            display: block !important; 
            margin-bottom: 2rem !important;
          }

          .overflow-auto { 
            overflow: visible !important; 
            height: auto !important; 
          }

          .Card, .card { 
            border: none !important; 
            box-shadow: none !important; 
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
          }

          table { 
            width: 100% !important; 
            border-collapse: collapse !important; 
            page-break-inside: auto !important;
          }

          tr { 
            page-break-inside: avoid !important; 
            page-break-after: auto !important; 
          }

          th, td { 
            border: 1px solid #ddd !important; 
            padding: 8px !important; 
            color: black !important;
          }

          .text-primary, .text-emerald-600 { 
            color: black !important; 
          }

          @page { 
            margin: 1.5cm;
            size: auto;
          }
        }
      `}} />

      {/* Print-only Header */}
      <div className="hidden print-header space-y-2 mb-6">
        <h1 className="text-2xl font-bold">PetPoint Pro Veterinary Clinic</h1>
        <h2 className="text-xl font-semibold text-muted-foreground">Customer Visit Report</h2>
        <div className="flex justify-between text-sm">
          <span>Period: {dateRange === "custom" ? `${customFrom} to ${customTo}` : dateRange.charAt(0).toUpperCase() + dateRange.slice(1)}</span>
          <span>Generated on: {format(new Date(), "PPP")}</span>
        </div>
        <hr className="border-t-2 border-primary/20" />
      </div>

      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Visit Report</h1>
          <p className="text-muted-foreground mt-2">
            Analysis of recurring customers by visit frequency and spending.
          </p>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" /> Print Report
        </Button>
      </div>

      {/* Filters */}
      <Card className="print:hidden">
        <CardContent className="p-5 flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Period</span>
            <div className="flex bg-muted p-1 rounded-md">
              <Button 
                variant={dateRange === "weekly" ? "secondary" : "ghost"} 
                size="sm" 
                onClick={() => setDateRange("weekly")}
              >
                Weekly
              </Button>
              <Button 
                variant={dateRange === "monthly" ? "secondary" : "ghost"} 
                size="sm" 
                onClick={() => setDateRange("monthly")}
              >
                Monthly
              </Button>
              <Button 
                variant={dateRange === "custom" ? "secondary" : "ghost"} 
                size="sm" 
                onClick={() => setDateRange("custom")}
              >
                Custom
              </Button>
            </div>
          </div>

          {dateRange === "custom" && (
            <>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase text-muted-foreground">From</span>
                <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="w-[160px]" />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase text-muted-foreground">To</span>
                <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="w-[160px]" />
              </div>
            </>
          )}

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Sort By</span>
            <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="visitCount">Visit Count</SelectItem>
                <SelectItem value="totalSpent">Amount Paid</SelectItem>
                <SelectItem value="name">Customer Name</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Search Customer</span>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Name or phone..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="pl-9"
              />
            </div>
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setDateRange("monthly");
              setSearchTerm("");
              setSortBy("visitCount");
              setSortOrder("desc");
              setCustomFrom(format(subDays(new Date(), 30), "yyyy-MM-dd"));
              setCustomTo(format(new Date(), "yyyy-MM-dd"));
            }}
            className="mb-1"
          >
            Clear Filters
          </Button>
        </CardContent>
      </Card>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">Total Active Customers</span>
                <span className="text-2xl font-bold">{reportData.length}</span>
              </div>
              <Users className="w-5 h-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">Total Spend in Period</span>
                <span className="text-2xl font-bold">₹{reportData.reduce((s, r) => s + r.totalSpent, 0).toLocaleString()}</span>
              </div>
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">Avg. Visits per Customer</span>
                <span className="text-2xl font-bold">
                  {reportData.length > 0 ? (reportData.reduce((s, r) => s + r.visitCount, 0) / reportData.length).toFixed(1) : 0}
                </span>
              </div>
              <Calendar className="w-5 h-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detailed Visit List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleSort("name")}
                >
                  <div className="flex items-center gap-2">
                    Customer Name
                    {sortBy === "name" && (sortOrder === "asc" ? <SortAsc className="w-3 h-3 text-primary" /> : <SortDesc className="w-3 h-3 text-primary" />)}
                  </div>
                </TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Address</TableHead>
                <TableHead 
                  className="text-right cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleSort("visitCount")}
                >
                  <div className="flex items-center justify-end gap-2 text-right">
                    Visit Count
                    {sortBy === "visitCount" ? (sortOrder === "asc" ? <SortAsc className="w-3 h-3 text-primary" /> : <SortDesc className="w-3 h-3 text-primary" />) : <ArrowUpDown className="w-3 h-3 text-muted-foreground/50" />}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-right cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleSort("totalSpent")}
                >
                  <div className="flex items-center justify-end gap-2 text-right">
                    Total Amount Paid
                    {sortBy === "totalSpent" ? (sortOrder === "asc" ? <SortAsc className="w-3 h-3 text-primary" /> : <SortDesc className="w-3 h-3 text-primary" />) : <ArrowUpDown className="w-3 h-3 text-muted-foreground/50" />}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    No matching records found for the selected period.
                  </TableCell>
                </TableRow>
              ) : (
                reportData.map((item) => (
                  <TableRow key={item.ownerId}>
                    <TableCell className="font-semibold">{item.name}</TableCell>
                    <TableCell>{item.phone}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate" title={item.address}>
                      {item.address}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">
                        {item.visitCount} visits
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">
                      ₹{item.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
