import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Pencil } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { formatWhatsAppLink } from "@/lib/utils";
import type { Appointment, Pet, Owner } from "@shared/schema";

const appointmentTypes = [
    "General Consultation",
    "Check-up",
    "Vaccination",
    "Surgery",
    "Dental",
    "Emergency",
    "Grooming",
    "Follow-up",
    "Laboratory Diagnosis",
    "Imaging",
    "Breeding",
];

export function EditAppointmentDialog({ appointment, pets, owners }: { appointment: Appointment; pets: Pet[]; owners: Owner[] }) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();

    const [form, setForm] = useState({
        date: appointment.date,
        time: appointment.time,
        type: appointment.type,
        notes: appointment.notes || "",
        status: appointment.status
    });

    const appointmentMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("PATCH", `/api/appointments/${appointment.id}`, {
                date: form.date,
                time: form.time,
                type: form.type,
                notes: form.notes || undefined,
                status: form.status,
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
            queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
            setOpen(false);
            toast({ title: "Appointment updated", description: "Appointment details have been updated." });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const pet = pets.find(p => p.id === appointment.petId);
    const owner = owners.find(o => o.id === appointment.ownerId);

    // Reset form when dialog opens
    const onOpenChange = (isOpen: boolean) => {
        if (isOpen) {
            setForm({
                date: appointment.date,
                time: appointment.time,
                type: appointment.type,
                notes: appointment.notes || "",
                status: appointment.status
            });
        }
        setOpen(isOpen);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8" data-testid={`button-edit-appointment-${appointment.id}`}>
                    <Pencil className="w-4 h-4" />
                    <span className="sr-only">Edit</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Edit Appointment
                        <span className="text-xs font-mono font-normal bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            APT-{appointment.id.toString().padStart(4, "0")}
                        </span>
                    </DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4 mt-2">
                    <div className="p-3 border rounded-md bg-muted/20">
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium">{pet?.name} ({pet?.species})</span>
                            <span className="text-xs text-muted-foreground">
                                {pet?.breed ? `${pet?.breed} - ` : ""}
                                {(pet?.age ?? 0) > 0 ? `${pet?.age} Yrs ` : ""}
                                {(pet?.ageMonths ?? 0) > 0 ? `${pet?.ageMonths} Mo` : ""}
                                {(!(pet?.age) && !(pet?.ageMonths)) ? (pet?.breed ? "" : "Age unknown") : ""}
                                {owner && ` | Owner: ${owner.firstName} ${owner.lastName}`}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor={`edit-apt-date-${appointment.id}`}>Date</Label>
                            <Input
                                id={`edit-apt-date-${appointment.id}`}
                                type="date"
                                value={form.date}
                                onChange={(e) => setForm({ ...form, date: e.target.value })}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor={`edit-apt-time-${appointment.id}`}>Time</Label>
                            <Input
                                id={`edit-apt-time-${appointment.id}`}
                                type="time"
                                value={form.time}
                                onChange={(e) => setForm({ ...form, time: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label>Type</Label>
                        <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {appointmentTypes.map((t) => (
                                    <SelectItem key={t} value={t}>
                                        {t}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label>Status</Label>
                        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="scheduled">Scheduled</SelectItem>
                                <SelectItem value="in-progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`edit-apt-notes-${appointment.id}`}>Notes</Label>
                        <Textarea
                            id={`edit-apt-notes-${appointment.id}`}
                            placeholder="Additional notes..."
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button
                            className="flex-1"
                            onClick={() => appointmentMutation.mutate()}
                            disabled={appointmentMutation.isPending}
                        >
                            {appointmentMutation.isPending ? "Updating..." : "Update Appointment"}
                        </Button>
                        {owner?.phone && (
                            <Button
                                variant="outline"
                                className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                                onClick={() => {
                                    const message = `Hello ${owner.firstName}, this is an update regarding ${pet?.name || 'your pet'}'s appointment. It is now scheduled for ${form.date} at ${form.time} (${form.type}). See you then!`;
                                    window.open(formatWhatsAppLink(owner.phone, message), '_blank');
                                }}
                                title="Send WhatsApp Update"
                            >
                                <FaWhatsapp className="w-5 h-5" />
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
