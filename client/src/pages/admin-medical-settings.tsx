import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Stethoscope } from "lucide-react";
import { MedicalSettings } from "@/components/medical-settings";

export default function AdminMedicalSettings() {
    return (
        <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto" data-testid="page-admin-medical-settings">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <Link href="/admin">
                        <Button size="icon" variant="ghost" data-testid="button-back-admin">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <Stethoscope className="w-6 h-6 text-primary" />
                    <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
                        Medical Settings
                    </h1>
                </div>
                <p className="text-sm text-muted-foreground ml-[72px]">
                    Configure treatment plan templates used during consultations for quick SOAP note entry.
                </p>
            </div>

            <MedicalSettings />
        </div>
    );
}
