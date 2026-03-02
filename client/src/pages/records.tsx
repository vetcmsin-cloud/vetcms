import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FileText, Search, Clock } from "lucide-react";
import { type MedicalRecord, type Pet } from "@shared/schema";
import { format } from "date-fns";

export default function MedicalRecordsDashboard() {
  const [search, setSearch] = useState("");
  const { data: records, isLoading } = useQuery<MedicalRecord[]>({ queryKey: ["/api/medical-records"] });
  const { data: pets } = useQuery<Pet[]>({ queryKey: ["/api/pets"] });

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
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-white"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : filteredRecords?.length ? (
        <div className="grid gap-4">
          {filteredRecords.map((record) => {
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
                  <Button variant="ghost" size="sm" className="shrink-0">View Details</Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground bg-white rounded-lg border border-dashed">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <h3 className="text-lg font-medium">No medical records found</h3>
          <p>Try adjusting your search.</p>
        </div>
      )}
    </div>
  );
}
