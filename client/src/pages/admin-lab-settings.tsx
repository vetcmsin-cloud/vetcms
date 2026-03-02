import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FlaskConical } from "lucide-react";
import { LabSettings } from "@/components/lab-settings";

export default function AdminLabSettings() {
    return (
        <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto" data-testid="page-admin-lab-settings">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <Link href="/admin">
                        <Button size="icon" variant="ghost" data-testid="button-back-admin">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <FlaskConical className="w-6 h-6 text-primary" />
                    <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
                        Lab Settings
                    </h1>
                </div>
                <p className="text-sm text-muted-foreground ml-[72px]">
                    Configure species, lab test categories, individual tests, and species-specific reference ranges.
                </p>
            </div>

            <LabSettings />
        </div>
    );
}
