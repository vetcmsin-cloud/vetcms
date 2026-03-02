import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { CameraCapture } from "@/components/camera-capture";
import {
    FolderOpen,
    Camera,
    Upload,
    Trash2,
    Eye,
    FileImage,
    Loader2,
} from "lucide-react";
import type { PetDocument } from "@shared/schema";
import { DOCUMENT_CATEGORIES } from "@shared/schema";

export function DocumentsTab({ petId }: { petId: number }) {
    const { toast } = useToast();
    const { hasPermission } = useAuth();
    const [uploading, setUploading] = useState(false);
    const [cameraOpen, setCameraOpen] = useState(false);
    const [category, setCategory] = useState("General");
    const [notes, setNotes] = useState("");
    const [previewDoc, setPreviewDoc] = useState<PetDocument | null>(null);

    const { data: documents = [], isLoading } = useQuery<PetDocument[]>({
        queryKey: [`/api/pet-documents/${petId}`],
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/pet-documents/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/pet-documents/${petId}`] });
            toast({ title: "Document deleted" });
        },
    });

    const uploadFile = async (file: File) => {
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("petId", String(petId));
            formData.append("fileName", file.name);
            formData.append("category", category);
            if (notes) formData.append("notes", notes);
            const res = await fetch("/api/pet-documents", {
                method: "POST",
                body: formData,
                credentials: "include",
            });
            if (!res.ok) throw new Error("Upload failed");
            queryClient.invalidateQueries({ queryKey: [`/api/pet-documents/${petId}`] });
            toast({ title: "Document uploaded", description: `"${file.name}" saved successfully.` });
            setNotes("");
        } catch (err: any) {
            toast({ title: "Upload failed", description: err.message, variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) uploadFile(file);
        e.target.value = "";
    };

    const handleCameraCapture = (file: File) => {
        setCameraOpen(false);
        uploadFile(file);
    };

    return (
        <div className="space-y-4 pt-3" data-testid="tab-content-documents">
            {/* Upload Controls */}
            {hasPermission("patients.edit") && (
                <Card>
                    <CardContent className="pt-4 space-y-3">
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DOCUMENT_CATEGORIES.map((c) => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Input
                                placeholder="Notes (optional)"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                className="flex-1 h-9 text-xs"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                disabled={uploading}
                                onClick={() => document.getElementById(`doc-upload-${petId}`)?.click()}
                            >
                                {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                                Upload File
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                disabled={uploading}
                                onClick={() => setCameraOpen(true)}
                            >
                                <Camera className="w-4 h-4 mr-1" />
                                Capture Photo
                            </Button>
                            <input
                                id={`doc-upload-${petId}`}
                                type="file"
                                accept="image/*,.pdf"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Document List */}
            {isLoading ? (
                <div className="space-y-2">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                </div>
            ) : documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <FolderOpen className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-sm">No documents uploaded yet.</p>
                    <p className="text-xs mt-1">Upload files or capture photos using the buttons above.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-2">
                    {documents.map((doc) => (
                        <Card key={doc.id} className="overflow-hidden group relative">
                            <div
                                className="aspect-[4/3] bg-muted flex items-center justify-center cursor-pointer relative"
                                onClick={() => setPreviewDoc(doc)}
                            >
                                {doc.fileUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) ? (
                                    <img
                                        src={doc.fileUrl}
                                        alt={doc.fileName}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <FileImage className="w-10 h-10 text-muted-foreground/40" />
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                    <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                            <CardContent className="p-2">
                                <p className="text-xs font-medium truncate" title={doc.fileName}>{doc.fileName}</p>
                                <div className="flex items-center justify-between mt-1">
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{doc.category || "General"}</Badge>
                                    {hasPermission("patients.edit") && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="w-6 h-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(doc.id); }}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    )}
                                </div>
                                {doc.notes && (
                                    <p className="text-[10px] text-muted-foreground mt-1 truncate" title={doc.notes}>{doc.notes}</p>
                                )}
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {new Date(doc.uploadedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Camera Capture */}
            <CameraCapture
                open={cameraOpen}
                onOpenChange={setCameraOpen}
                onCapture={handleCameraCapture}
            />

            {/* Document Preview Dialog */}
            <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
                    <DialogHeader>
                        <DialogTitle className="text-sm">{previewDoc?.fileName}</DialogTitle>
                    </DialogHeader>
                    {previewDoc && (
                        <div className="flex flex-col items-center">
                            {previewDoc.fileUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) ? (
                                <img src={previewDoc.fileUrl} alt={previewDoc.fileName} className="max-w-full rounded-md" />
                            ) : (
                                <div className="py-8 text-center">
                                    <FileImage className="w-16 h-16 mx-auto text-muted-foreground/40 mb-3" />
                                    <a href={previewDoc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">
                                        Open file in new tab
                                    </a>
                                </div>
                            )}
                            {previewDoc.notes && (
                                <p className="text-sm text-muted-foreground mt-3">{previewDoc.notes}</p>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
