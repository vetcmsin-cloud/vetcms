import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

interface MotileOrganism {
    name: string;
    grade: string;
}

export function WetFilmBuilder({
    value = "",
    onChange,
    petSpecies = "",
}: {
    value?: string;
    onChange: (val: string) => void;
    petSpecies?: string;
}) {
    const [resultType, setResultType] = useState<"Negative" | "Positive" | "">("");
    const [negativeMessage, setNegativeMessage] = useState("Microfilaria not detected");
    const [microfilariaCount, setMicrofilariaCount] = useState("");
    const [microfilariaGrade, setMicrofilariaGrade] = useState("");
    const [otherOrganisms, setOtherOrganisms] = useState<MotileOrganism[]>([]);
    const [selectedOrganism, setSelectedOrganism] = useState("");
    const [organismGrade, setOrganismGrade] = useState("");

    // Initialize from existing stored value
    useEffect(() => {
        if (!value) return;
        if (value.startsWith("Negative")) {
            setResultType("Negative");
            const msg = value.replace(/^Negative:\s*/i, "").trim();
            if (msg) setNegativeMessage(msg);
        } else if (value.startsWith("Positive")) {
            setResultType("Positive");
            const countMatch = value.match(/Microfilaria Count:\s*(.+)/i);
            if (countMatch) setMicrofilariaCount(countMatch[1].trim());
            const gradeMatch = value.match(/Microfilaria Grade:\s*(.+)/i);
            if (gradeMatch) setMicrofilariaGrade(gradeMatch[1].trim());
            // Parse other organisms
            const lines = value.split("\n");
            const orgs: MotileOrganism[] = [];
            for (const line of lines) {
                if (line.trim().startsWith("- Organism:")) {
                    const parts = line.replace("- Organism:", "").split("/ Grade:");
                    if (parts.length === 2) {
                        orgs.push({ name: parts[0].trim(), grade: parts[1].trim() });
                    }
                }
            }
            if (orgs.length > 0) setOtherOrganisms(orgs);
        }
    }, []);

    // Push structured value upstream
    useEffect(() => {
        if (!resultType) { onChange(""); return; }
        if (resultType === "Negative") {
            onChange(`Negative: ${negativeMessage}`);
        } else if (resultType === "Positive") {
            let out = "Positive";
            if (microfilariaCount) out += `\nMicrofilaria Count: ${microfilariaCount}`;
            if (microfilariaGrade) out += `\nMicrofilaria Grade: ${microfilariaGrade}`;
            otherOrganisms.forEach(o => {
                out += `\n- Organism: ${o.name} / Grade: ${o.grade}`;
            });
            onChange(out.trim());
        }
    }, [resultType, negativeMessage, microfilariaCount, microfilariaGrade, otherOrganisms]);

    const getOrganismSuggestions = (species: string) => {
        const s = species.toUpperCase();
        if (s.includes("DOG") || s.includes("CANINE")) {
            return ["Dirofilaria immitis", "Acanthocheilonema reconditum", "Trypanosoma brucei", "Motile spirochetes"];
        }
        if (s.includes("CAT") || s.includes("FELINE")) {
            return ["Dirofilaria immitis", "Trypanosoma sp.", "Motile spirochetes"];
        }
        if (s.includes("HORSE") || s.includes("EQUINE") || s.includes("DONKEY")) {
            return ["Trypanosoma evansi", "Setaria equina", "Motile spirochetes"];
        }
        if (s.includes("CATTLE") || s.includes("BOVINE") || s.includes("COW")) {
            return ["Trypanosoma vivax", "Trypanosoma congolense", "Setaria digitata", "Motile spirochetes"];
        }
        return ["Trypanosoma sp.", "Motile spirochetes", "Motile protozoa", "Other motile organism"];
    };

    const GRADES = ["1+", "2+", "3+", "4+", "Rare", "Occasional", "Numerous", "Heavy"];

    const handleAddOrganism = () => {
        if (!selectedOrganism || !organismGrade) return;
        setOtherOrganisms(prev => [...prev, { name: selectedOrganism, grade: organismGrade }]);
        setSelectedOrganism("");
        setOrganismGrade("");
    };

    const suggestions = getOrganismSuggestions(petSpecies);
    const addedNames = new Set(otherOrganisms.map(o => o.name));
    const remainingSuggestions = suggestions.filter(s => !addedNames.has(s));

    return (
        <div className="space-y-4 border rounded-md p-3 bg-muted/20">
            <RadioGroup
                value={resultType}
                onValueChange={(val) => setResultType(val as any)}
                className="flex gap-4"
            >
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Negative" id="wf-result-negative" />
                    <Label htmlFor="wf-result-negative" className="cursor-pointer">Negative</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Positive" id="wf-result-positive" />
                    <Label htmlFor="wf-result-positive" className="cursor-pointer">Positive</Label>
                </div>
            </RadioGroup>

            {resultType === "Negative" && (
                <div className="space-y-2 pt-1">
                    <Label className="text-xs text-muted-foreground">Negative Result Message</Label>
                    <Textarea
                        className="min-h-[56px] text-sm resize-y"
                        value={negativeMessage}
                        onChange={(e) => setNegativeMessage(e.target.value)}
                        placeholder="e.g. Microfilaria not detected"
                    />
                </div>
            )}

            {resultType === "Positive" && (
                <div className="space-y-4 pt-1">
                    {/* Microfilaria Row */}
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground font-semibold">Microfilaria</Label>
                        <div className="flex gap-2">
                            <div className="flex-1 space-y-1">
                                <Label className="text-xs text-muted-foreground">Count / Description</Label>
                                <Input
                                    className="h-8 text-sm bg-background"
                                    placeholder="e.g. 12/slide, Numerous"
                                    value={microfilariaCount}
                                    onChange={(e) => setMicrofilariaCount(e.target.value)}
                                />
                            </div>
                            <div className="w-32 space-y-1">
                                <Label className="text-xs text-muted-foreground">Grade</Label>
                                <Select value={microfilariaGrade || undefined} onValueChange={setMicrofilariaGrade}>
                                    <SelectTrigger className="h-8 text-sm bg-background">
                                        <SelectValue placeholder="Grade" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                                        <SelectItem value="None">None</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Other Motile Organisms */}
                    <div className="space-y-2 border-t pt-3">
                        <Label className="text-xs text-muted-foreground font-semibold">Other Motile Organisms (Optional)</Label>
                        <div className="flex flex-col sm:flex-row gap-2 items-end">
                            <div className="flex-1 space-y-1">
                                <Label className="text-xs text-muted-foreground">Organism</Label>
                                <Input
                                    className="h-8 text-sm bg-background"
                                    placeholder="Type or select organism..."
                                    value={selectedOrganism}
                                    onChange={(e) => setSelectedOrganism(e.target.value)}
                                    list="organism-suggestions"
                                />
                                <datalist id="organism-suggestions">
                                    {remainingSuggestions.map(s => <option key={s} value={s} />)}
                                </datalist>
                            </div>
                            <div className="w-32 space-y-1">
                                <Label className="text-xs text-muted-foreground">Grade</Label>
                                <Select value={organismGrade || undefined} onValueChange={setOrganismGrade}>
                                    <SelectTrigger className="h-8 text-sm bg-background">
                                        <SelectValue placeholder="Grade" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                type="button"
                                className="h-8"
                                onClick={handleAddOrganism}
                                disabled={!selectedOrganism || !organismGrade}
                            >
                                <Plus className="h-4 w-4 mr-1" /> Add
                            </Button>
                        </div>

                        {otherOrganisms.length > 0 && (
                            <div className="border rounded-md overflow-hidden bg-background">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 text-xs">
                                        <tr>
                                            <th className="text-left p-2 font-medium">Organism</th>
                                            <th className="text-left p-2 font-medium">Grade</th>
                                            <th className="w-[50px]"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {otherOrganisms.map((o, idx) => (
                                            <tr key={idx} className="border-t">
                                                <td className="p-2">{o.name}</td>
                                                <td className="p-2">{o.grade}</td>
                                                <td className="p-2 text-right">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-destructive hover:text-destructive/90"
                                                        onClick={() => setOtherOrganisms(prev => prev.filter((_, i) => i !== idx))}
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
                </div>
            )}
        </div>
    );
}
