import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FileText, Search, Clock, Trash2 } from "lucide-react";
import { type MedicalRecord, type Pet } from "@shared/schema";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export default function MedicalRecordsDashboard() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const canDelete = hasPermission("medical_records.delete", "admin_dashboard.view");
  const [, setLocation] = useLocation();

  const { data: records, isLoading } = useQuery<MedicalRecord[]>({ queryKey: ["/api/medical-records"] });
  const { data: pets } = useQuery<Pet[]>({ queryKey: ["/api/pets"] });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/medical-records/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-records"] });
      setDeleteId(null);
      toast({ title: "Record deleted", description: "Medical record has been removed." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filteredRecords = records
    ?.filter((record) => {
      if (!search) return true;
      const pet = pets?.find((p) => p.id === record.petId);
      const searchLower = search.toLowerCase();
      return (
        record.diagnosis.toLowerCase().includes(searchLower) ||
        record.treatment.toLowerCase().includes(searchLower) ||
        record.veterinarian.toLowerCase().includes(searchLower) ||
        pet?.name.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalPages = filteredRecords ? Math.ceil(filteredRecords.length / itemsPerPage) : 1;
  const displayedRecords = filteredRecords?.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset to page 1 when search changes
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto min-h-screen bg-muted/20">
      <div className="flex flex-col gap-2 mb-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <FileText className="w-8 h-8 text-primary" />
          Medical Records
        </h1>
        <p className="text-muted-foreground">View and manage patient medical history.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by diagnosis, treatment, veterinarian, or patient name..."
          value={search}
          onChange={handleSearch}
          className="pl-9 bg-white"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : displayedRecords?.length ? (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4">
            {displayedRecords.map((record) => {
              const pet = pets?.find(p => p.id === record.petId);
              return (
                <Card key={record.id} className="overflow-hidden hover:shadow-md transition-all">
                  <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <Avatar className="w-12 h-12 border-2 border-background">
                      <AvatarImage src={pet?.imageUrl || ""} />
                      <AvatarFallback>{pet?.name?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg truncate">{pet?.name}</h3>
                        <Badge variant="outline" className="text-xs">{format(new Date(record.date), "PPP")}</Badge>
                      </div>
                      <div className="flex flex-col gap-1 text-sm">
                        <p><span className="font-medium">Diagnosis:</span> {record.diagnosis}</p>
                        <p className="text-muted-foreground truncate"><span className="font-medium text-foreground">Treatment:</span> {record.treatment}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {record.date}</span>
                        <span>•</span>
                        <span>Dr. {record.veterinarian}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocation(`/patients?petId=${record.petId}&recordId=${record.id}&tab=medical-records`)}
                      >
                        View Details
                      </Button>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeleteId(record.id)}
                          data-testid={`btn-delete-record-${record.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 bg-white p-4 rounded-lg border">
              <span className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredRecords?.length || 0)} of {filteredRecords?.length} records
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1 px-2">
                  <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground bg-white rounded-lg border border-dashed">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <h3 className="text-lg font-medium">No medical records found</h3>
          <p>Try adjusting your search.</p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Medical Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this medical record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
