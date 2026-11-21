import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Settings } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";

const PATHOGEN_GRADES = ["Present", "1+", "2+", "3+", "4+", "Rare", "Occasional", "Numerous", "Heavy", "High", "Low", "Moderate", "Trace"];

interface PathogenItem {
    name: string;
    value: string;
}

export function BloodSmearBuilder({
    value = "",
    onChange,
    petSpecies = ""
}: {
    value?: string;
    onChange: (val: string) => void;
    petSpecies?: string;
}) {
    const { hasPermission } = useAuth();
    const { toast } = useToast();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newPathogenName, setNewPathogenName] = useState("");
    const [newPathogenSpecies, setNewPathogenSpecies] = useState(petSpecies || "");

    const [resultType, setResultType] = useState<"Negative" | "Positive" | "">("");
    const [negativeMessage, setNegativeMessage] = useState("No hemo protozoans detected");
    const [pathogens, setPathogens] = useState<PathogenItem[]>([]);

    const [selectedPathogen, setSelectedPathogen] = useState<string>("");
    const [pathogenValue, setPathogenValue] = useState<string>("");
    const [pathogenGrade, setPathogenGrade] = useState<string>("");

    const createPathogenMutation = useMutation({
        mutationFn: async (data: { species: string, name: string }) => {
            const res = await apiRequest("POST", "/api/blood-smear-pathogens", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/blood-smear-pathogens"] });
            setIsAddDialogOpen(false);
            setNewPathogenName("");
            toast({ title: "New pathogen added to library" });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const { data: speciesList } = useQuery<{ id: number, name: string }[]>({ queryKey: ["/api/species"] });

    const { data: dbPathogens, isLoading: isLoadingPathogens } = useQuery<{ id: number, name: string, species: string }[]>({
        queryKey: ["/api/blood-smear-pathogens", petSpecies],
        queryFn: async ({ queryKey }) => {
            try {
                const species = queryKey[1] as string;
                const url = species 
                    ? `/api/blood-smear-pathogens?species=${encodeURIComponent(species)}` 
                    : "/api/blood-smear-pathogens";
                
                const res = await apiRequest("GET", url);
                const data = await res.json();
                return Array.isArray(data) ? data : [];
            } catch (error) {
                console.error("Error fetching pathogens:", error);
                return []; // Fallback to empty which will trigger the hardcoded list
            }
        }
    });

    // Initialize from existing value
    useEffect(() => {
        if (!value) return;

        if (value.startsWith("Negative")) {
            setResultType("Negative");
            const msg = value.replace("Negative: ", "").trim();
            if (msg) setNegativeMessage(msg);
        } else if (value.startsWith("Positive")) {
            setResultType("Positive");
            // Parse Positive
            // Example format: 
            // Positive
            // - Babesia canis / B. gibsoni: High
            const lines = value.split("\n");
            const loadedPathogens: PathogenItem[] = [];
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.startsWith("- ")) {
                    const parts = line.substring(2).split(":");
                    if (parts.length >= 2) {
                        const rest = parts.slice(1).join(":").trim();
                        // Support format: "Name: Grade | Details" or just "Name: Value"
                        loadedPathogens.push({
                            name: parts[0].trim(),
                            value: rest
                        });
                    }
                }
            }
            if (loadedPathogens.length > 0) {
                setPathogens(loadedPathogens);
            }
        }
    }, []);

    // Effect to push changes upstream
    useEffect(() => {
        if (!resultType) {
            onChange("");
            return;
        }

        if (resultType === "Negative") {
            onChange(`Negative: ${negativeMessage}`);
        } else if (resultType === "Positive") {
            let out = "Positive\n";
            pathogens.forEach(p => {
                out += `- ${p.name}: ${p.value}\n`;
            });
            onChange(out.trim());
        }
    }, [resultType, negativeMessage, pathogens]);

    const handleAddPathogen = () => {
        if (!selectedPathogen) return;
        const combined = pathogenGrade && pathogenValue
            ? `${pathogenGrade} | ${pathogenValue}`
            : pathogenGrade || pathogenValue || "Present";
        setPathogens(prev => [...prev, { name: selectedPathogen, value: combined }]);
        setSelectedPathogen("");
        setPathogenValue("");
        setPathogenGrade("");
    };

    const handleRemovePathogen = (idx: number) => {
        setPathogens(prev => prev.filter((_, i) => i !== idx));
    };

    // Determine suggestion list based on species
    const getPathogenList = (species: string) => {
        // If we have data from DB, use it
        if (dbPathogens && dbPathogens.length > 0) {
            return dbPathogens.map(p => p.name);
        }

        // If explicitly loading, show that
        if (isLoadingPathogens && !dbPathogens) {
            return ["Loading pathogens..."];
        }

        // --- Fallback lists for when DB is empty OR query failed ---
        const s = String(species || "").toUpperCase();
        if (s.includes("FELINE") || s === "CAT") {
            return ["Toxoplasma gondii", "Cytauxzoon felis", "Mycoplasma haemofelis", "Babesia felis", "Tritrichomonas foetus", "Giardia duodenalis"];
        }
        if (s.includes("BOVINE") || s === "COW" || s === "BUFFALO") {
            return ["Babesia bovis / B. bigemina", "Theileria parva", "Trypanosoma vivax", "Anaplasma marginale", "Neospora caninum", "Cryptosporidium parvum"];
        }
        if (s.includes("EQUINE") || s === "HORSE") {
            return ["Theileria equi / Babesia caballi", "Trypanosoma evansi", "Sarcocystis neurona", "Anaplasma phagocytophilum", "Klossiella equi"];
        }
        
        // Default list (mostly Canine)
        return [
            "Babesia canis",
            "Babesia gibsoni",
            "Leishmania infantum",
            "Hepatozoon americanum",
            "Anaplasma phagocytophilum",
            "Ehrlichia canis",
            "Giardia duodenalis",
            "Cystoisospora canis",
            "Trypanosoma cruzi"
        ];
    };

    const availablePathogens = getPathogenList(petSpecies);
    const alreadyAdded = new Set(pathogens.map(p => p.name));
    const remainingPathogens = availablePathogens.filter(p => !alreadyAdded.has(p));

    return (
        <div className="space-y-4 border rounded-md p-3 bg-muted/20">
            <RadioGroup
                value={resultType}
                onValueChange={(val) => setResultType(val as any)}
                className="flex gap-4"
            >
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Negative" id="result-negative" />
                    <Label htmlFor="result-negative" className="cursor-pointer">Negative</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Positive" id="result-positive" />
                    <Label htmlFor="result-positive" className="cursor-pointer">Positive</Label>
                </div>
            </RadioGroup>

            {resultType === "Negative" && (
                <div className="space-y-2 pt-2">
                    <Label className="text-xs text-muted-foreground">Message</Label>
                    <Textarea
                        className="min-h-[60px] text-sm resize-y"
                        value={negativeMessage}
                        onChange={e => setNegativeMessage(e.target.value)}
                        placeholder="e.g. No hemo protozoans detected"
                    />
                </div>
            )}

            {resultType === "Positive" && (
                <div className="space-y-4 pt-2">
                    <div className="flex flex-col sm:flex-row gap-2 items-end flex-wrap">
                        <div className="flex-1 min-w-[160px] space-y-1">
                            <Label className="text-xs text-muted-foreground">Select Pathogen</Label>
                            <Select value={selectedPathogen} onValueChange={setSelectedPathogen}>
                                <SelectTrigger className="h-8 text-sm bg-background">
                                    <SelectValue placeholder="Choose pathogen..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {remainingPathogens.length > 0 ? (
                                        remainingPathogens.map(p => (
                                            <SelectItem key={p} value={p}>{p}</SelectItem>
                                        ))
                                    ) : (
                                        <div className="px-3 py-2 text-xs text-muted-foreground">All pathogens added</div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        {hasPermission("admin_dashboard.view") && (
                            <div className="pb-0.5">
                                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="icon" className="h-8 w-8" title="Add new pathogen to library">
                                            <Settings className="h-4 w-4" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Add Pathogen to Library</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label>Pathogen Name</Label>
                                                <Input 
                                                    placeholder="e.g. Babesia canis" 
                                                    value={newPathogenName}
                                                    onChange={e => setNewPathogenName(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Target Species</Label>
                                                <Select value={newPathogenSpecies} onValueChange={setNewPathogenSpecies}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select species..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {(speciesList || []).map(s => (
                                                            <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                                            <Button 
                                                onClick={() => createPathogenMutation.mutate({ 
                                                    name: newPathogenName, 
                                                    species: newPathogenSpecies 
                                                })}
                                                disabled={!newPathogenName.trim() || !newPathogenSpecies.trim() || createPathogenMutation.isPending}
                                            >
                                                {createPathogenMutation.isPending ? "Adding..." : "Add to Library"}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        )}
                        <div className="w-32 space-y-1">
                            <Label className="text-xs text-muted-foreground">Grade</Label>
                            <Select value={pathogenGrade} onValueChange={setPathogenGrade}>
                                <SelectTrigger className="h-8 text-sm bg-background">
                                    <SelectValue placeholder="Grade..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {PATHOGEN_GRADES.map(g => (
                                        <SelectItem key={g} value={g}>{g}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-1 min-w-[120px] space-y-1">
                            <Label className="text-xs text-muted-foreground">Additional Notes</Label>
                            <Input
                                className="h-8 text-sm bg-background"
                                placeholder="e.g. intraerythrocytic"
                                value={pathogenValue}
                                onChange={e => setPathogenValue(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleAddPathogen();
                                    }
                                }}
                            />
                        </div>
                        <Button
                            type="button"
                            className="h-8"
                            onClick={handleAddPathogen}
                            disabled={!selectedPathogen}
                        >
                            <Plus className="h-4 w-4 mr-1" /> Add
                        </Button>
                    </div>

                    {pathogens.length > 0 && (
                        <div className="border rounded-md overflow-hidden bg-background">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 text-xs">
                                    <tr>
                                        <th className="text-left p-2 font-medium">Pathogen / Organism</th>
                                        <th className="text-left p-2 font-medium">Grade / Count</th>
                                        <th className="w-[50px]"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pathogens.map((p, idx) => (
                                        <tr key={idx} className="border-t">
                                            <td className="p-2">{p.name}</td>
                                            <td className="p-2">{p.value}</td>
                                            <td className="p-2 text-right">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-destructive hover:text-destructive/90"
                                                    onClick={() => handleRemovePathogen(idx)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

