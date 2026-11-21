
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package } from "lucide-react";
import { InventorySettings } from "@/components/inventory-settings";

export default function AdminInventorySettings() {
    return (
        <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto" data-testid="page-admin-inventory-settings">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <Link href="/admin">
                        <Button size="icon" variant="ghost" data-testid="button-back-admin">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <Package className="w-6 h-6 text-primary" />
                    <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
                        Inventory Settings
                    </h1>
                </div>
                <p className="text-sm text-muted-foreground ml-[72px]">
                    Manage units, product categories, and sub-categories for your inventory.
                </p>
            </div>

            <InventorySettings />
        </div>
    );
}
