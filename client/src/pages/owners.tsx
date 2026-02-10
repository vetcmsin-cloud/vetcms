import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Search, Users, Mail, Phone, MapPin } from "lucide-react";
import type { Owner, Pet } from "@shared/schema";

function AddOwnerDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/owners", form);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owners"] });
      setOpen(false);
      setForm({ firstName: "", lastName: "", email: "", phone: "", address: "" });
      toast({ title: "Owner added", description: "New owner has been registered successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-owner">
          <Plus className="w-4 h-4 mr-1" />
          Add Owner
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Register New Owner</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="owner-first">First Name</Label>
              <Input
                id="owner-first"
                placeholder="First name"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                data-testid="input-owner-first"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="owner-last">Last Name</Label>
              <Input
                id="owner-last"
                placeholder="Last name"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                data-testid="input-owner-last"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="owner-email">Email</Label>
            <Input
              id="owner-email"
              type="email"
              placeholder="email@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              data-testid="input-owner-email"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="owner-phone">Phone</Label>
            <Input
              id="owner-phone"
              placeholder="(555) 123-4567"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              data-testid="input-owner-phone"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="owner-address">Address</Label>
            <Textarea
              id="owner-address"
              placeholder="Enter address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              data-testid="input-owner-address"
            />
          </div>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.firstName || !form.lastName || !form.email || !form.phone}
            data-testid="button-submit-owner"
          >
            {mutation.isPending ? "Adding..." : "Register Owner"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Owners() {
  const [search, setSearch] = useState("");
  const { data: owners, isLoading } = useQuery<Owner[]>({ queryKey: ["/api/owners"] });
  const { data: pets } = useQuery<Pet[]>({ queryKey: ["/api/pets"] });

  const filteredOwners = owners?.filter(
    (o) =>
      `${o.firstName} ${o.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      o.email.toLowerCase().includes(search.toLowerCase()) ||
      o.phone.includes(search)
  );

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto" data-testid="page-owners">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Pet Owners</h1>
          <p className="text-sm text-muted-foreground">
            Manage client information and their pets.
          </p>
        </div>
        <AddOwnerDialog />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search owners..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-testid="input-search-owners"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-11 h-11 rounded-full" />
                  <div className="flex flex-col gap-2 flex-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredOwners && filteredOwners.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOwners.map((owner) => {
            const ownerPets = pets?.filter((p) => p.ownerId === owner.id) || [];
            return (
              <Card key={owner.id} className="hover-elevate" data-testid={`card-owner-${owner.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-11 h-11">
                      <AvatarFallback className="bg-chart-3/10 text-chart-3 font-semibold text-sm">
                        {owner.firstName.charAt(0)}{owner.lastName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <span className="text-sm font-semibold truncate">
                        {owner.firstName} {owner.lastName}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{owner.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3 flex-shrink-0" />
                        <span>{owner.phone}</span>
                      </div>
                      {owner.address && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{owner.address}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">
                          {ownerPets.length} pet{ownerPets.length !== 1 ? "s" : ""}
                        </Badge>
                        {ownerPets.slice(0, 2).map((p) => (
                          <Badge key={p.id} variant="outline" className="text-[10px]">
                            {p.name}
                          </Badge>
                        ))}
                        {ownerPets.length > 2 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{ownerPets.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">No owners found</p>
          <p className="text-xs mt-1">Register a new owner to get started.</p>
        </div>
      )}
    </div>
  );
}
