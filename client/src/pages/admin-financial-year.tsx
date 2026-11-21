import { Calendar, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminFinancialYear() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Year Settings</h1>
          <p className="text-sm text-muted-foreground">Configure the active and historical financial years.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5 text-primary" />
            Financial Year Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground bg-muted/20">
            <Calendar className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-medium">Financial Year Module Coming Soon</p>
            <p className="text-xs max-w-xs text-center mt-1">
              We are building the tools to help you manage your clinic's financial periods.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
