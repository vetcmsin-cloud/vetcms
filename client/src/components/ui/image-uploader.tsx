import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { X, Upload, Loader2, ImageIcon } from "lucide-react";

interface ImageUploaderProps {
    label: string;
    currentUrl: string;
    onUploaded: (url: string) => void;
    onRemoved: () => void;
    testIdPrefix: string;
    settingKey?: string;
}

export function ImageUploader({
    label,
    currentUrl,
    onUploaded,
    onRemoved,
    testIdPrefix,
    settingKey,
}: ImageUploaderProps) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const { toast } = useToast();

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast({ title: "File too large", description: "Maximum file size is 5 MB.", variant: "destructive" });
            return;
        }
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Upload failed");
            }
            const data = await res.json();
            onUploaded(data.url);
            if (settingKey) {
                await fetch("/api/clinic-settings", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ [settingKey]: data.url }),
                    credentials: "include",
                });
                queryClient.invalidateQueries({ queryKey: ["/api/clinic-settings"] });
            }
            toast({ title: "Uploaded", description: `${label} uploaded and saved.` });
        } catch (err: any) {
            toast({ title: "Upload failed", description: err.message, variant: "destructive" });
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    };

    const handleRemove = async () => {
        if (currentUrl && currentUrl.startsWith("/uploads/")) {
            const filename = currentUrl.split("/uploads/")[1];
            try {
                await fetch(`/api/upload/${filename}`, { method: "DELETE", credentials: "include" });
            } catch { }
        }
        onRemoved();
        if (settingKey) {
            await fetch("/api/clinic-settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [settingKey]: "" }),
                credentials: "include",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/clinic-settings"] });
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <Label>{label}</Label>
            {currentUrl ? (
                <div className="flex items-start gap-3">
                    <div className="relative group">
                        <img
                            src={currentUrl}
                            alt={label}
                            className="w-32 h-32 rounded-md border object-contain bg-gray-50"
                            data-testid={`${testIdPrefix}-preview`}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                            <Button
                                size="icon"
                                variant="destructive"
                                className="h-8 w-8"
                                onClick={handleRemove}
                                data-testid={`${testIdPrefix}-remove-overlay`}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => fileRef.current?.click()}
                            disabled={uploading}
                            data-testid={`${testIdPrefix}-change`}
                        >
                            {uploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                            Change Image
                        </Button>
                    </div>
                </div>
            ) : (
                <div
                    className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => fileRef.current?.click()}
                    data-testid={`${testIdPrefix}-dropzone`}
                >
                    {uploading ? (
                        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                    ) : (
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    )}
                    <div className="text-center">
                        <p className="text-sm font-medium">
                            {uploading ? "Uploading..." : "Click to upload image"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Max 5MB. JPG, PNG, WEBP
                        </p>
                    </div>
                </div>
            )}
            <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
                data-testid={`${testIdPrefix}-input`}
            />
        </div>
    );
}
