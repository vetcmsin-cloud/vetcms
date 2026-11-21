
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Edit, Save, X, TableProperties, FlaskConical, PawPrint, FileText, Settings2, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Species = {
    id: number;
    name: string;
};

type LabCategory = {
    id: number;
    name: string;
    description: string | null;
};

type LabTest = {
    id: number;
    categoryId: number;
    name: string;
    section: string | null;
    unit: string | null;
    sortOrder: number | null;
};

type LabRefRange = {
    id: number;
    testId: number;
    species: string;
    breed: string | null;
    min: string | null;
    max: string | null;
    refText: string | null;
};

type BloodSmearPathogen = {
    id: number;
    species: string;
    name: string;
};

export function LabSettings() {
    const { toast } = useToast();
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newSpeciesName, setNewSpeciesName] = useState("");

    const { data: categories, isLoading: catsLoading } = useQuery<LabCategory[]>({
        queryKey: ["/api/lab-settings/categories"],
    });

    const { data: speciesList, isLoading: speciesLoading } = useQuery<Species[]>({
        queryKey: ["/api/species"],
    });

    const createSpeciesMutation = useMutation({
        mutationFn: async (name: string) => {
            const res = await apiRequest("POST", "/api/species", { name });
            if (!res.ok) throw new Error("Failed to create species or already exists");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/species"] });
            setNewSpeciesName("");
            toast({ title: "Species Created" });
        },
        onError: (e: any) => {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        }
    });

    const deleteSpeciesMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/species/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/species"] });
            toast({ title: "Species Deleted" });
        }
    });

    const createCategoryMutation = useMutation({
        mutationFn: async (name: string) => {
            const res = await apiRequest("POST", "/api/lab-settings/categories", { name });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/lab-settings/categories"] });
            setNewCategoryName("");
            toast({ title: "Category Created" });
        },
    });

    const deleteCategoryMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/lab-settings/categories/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/lab-settings/categories"] });
            toast({ title: "Category Deleted" });
        }
    });

    if (catsLoading || speciesLoading) return <div>Loading settings...</div>;

    return (
        <Tabs defaultValue="tests" className="flex flex-col md:flex-row gap-6">
            <div className="md:w-64 shrink-0">
                <TabsList className="flex flex-col h-auto bg-background border p-1 rounded-lg">
                    <TabsTrigger value="tests" className="justify-start w-full gap-2 px-3 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                        <FlaskConical className="w-4 h-4" />
                        Lab Test Config
                    </TabsTrigger>
                    <TabsTrigger value="species" className="justify-start w-full gap-2 px-3 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                        <PawPrint className="w-4 h-4" />
                        Species List
                    </TabsTrigger>
                    <TabsTrigger value="reference-ranges" className="justify-start w-full gap-2 px-3 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                        <FileText className="w-4 h-4" />
                        Reference Ranges
                    </TabsTrigger>
                    <TabsTrigger value="blood-smear" className="justify-start w-full gap-2 px-3 py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                        <ShieldAlert className="w-4 h-4" />
                        Blood Smear Pathogens
                    </TabsTrigger>
                </TabsList>
            </div>

            <div className="flex-1 w-full min-w-0">
                <TabsContent value="species" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                    <Card>
                        <CardHeader className="bg-primary/5 border-b rounded-t-lg">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <PawPrint className="w-5 h-5 text-primary" />
                                Species Configuration
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="flex gap-2 mb-6">
                                <Input
                                    placeholder="New Species (e.g. Canine, Feline, Bovine)"
                                    value={newSpeciesName}
                                    onChange={(e) => setNewSpeciesName(e.target.value)}
                                    className="max-w-sm"
                                />
                                <Button onClick={() => createSpeciesMutation.mutate(newSpeciesName)} disabled={!newSpeciesName.trim()}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Species
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-2 p-4 bg-muted/40 border rounded-lg">
                                {speciesList?.map((s) => (
                                    <div key={s.id} className="flex items-center gap-2 bg-background border shadow-sm px-3 py-1.5 rounded-md">
                                        <span className="font-medium text-sm">{s.name}</span>
                                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground rounded-full ml-1" onClick={() => {
                                            if (confirm("Delete this species?")) deleteSpeciesMutation.mutate(s.id);
                                        }}>
                                            <X className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                ))}
                                {(!speciesList || speciesList.length === 0) && (
                                    <div className="w-full text-center py-4 text-muted-foreground text-sm">No species configured yet.</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="tests" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                    <Card>
                        <CardHeader className="bg-primary/5 border-b rounded-t-lg">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <FlaskConical className="w-5 h-5 text-primary" />
                                Lab Test Configuration
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="flex gap-2 mb-6 p-4 bg-secondary/30 rounded-lg border border-secondary">
                                <div className="flex-1 max-w-sm">
                                    <Input
                                        placeholder="New Category Name (e.g. Hematology)"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        className="bg-background"
                                    />
                                </div>
                                <Button onClick={() => createCategoryMutation.mutate(newCategoryName)} disabled={!newCategoryName.trim()}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Category
                                </Button>
                            </div>

                            <Accordion type="multiple" className="w-full space-y-3">
                                {categories?.map((cat) => (
                                    <AccordionItem key={cat.id} value={String(cat.id)} className="border rounded-lg bg-background overflow-hidden">
                                        <AccordionTrigger className="hover:no-underline px-4 py-3 bg-muted/30 data-[state=open]:bg-primary/5 data-[state=open]:border-b transition-colors cursor-pointer group">
                                            <div className="flex items-center justify-between w-full pr-4">
                                                <div className="flex items-center gap-2 font-semibold">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary/60 group-hover:bg-primary transition-colors"></div>
                                                    {cat.name}
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm("Are you sure you want to delete this category? All tests inside it will be orphaned.")) deleteCategoryMutation.mutate(cat.id);
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pt-4 px-4 pb-4">
                                            <LabTestsList categoryId={cat.id} />
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="reference-ranges" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                    <SpeciesReferenceRanges />
                </TabsContent>

                <TabsContent value="blood-smear" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                    <Card>
                        <BloodSmearPathogenSettings />
                    </Card>
                </TabsContent>
            </div>
        </Tabs>
    );
}

function LabTestsList({ categoryId }: { categoryId: number }) {
    const { toast } = useToast();
    const { data: tests, isLoading } = useQuery<LabTest[]>({
        queryKey: [`/api/lab-settings/tests?categoryId=${categoryId}`],
    });

    const [isAdding, setIsAdding] = useState(false);
    const [newTest, setNewTest] = useState({ name: "", unit: "", section: "" });

    const createTestMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/lab-settings/tests", { ...data, categoryId });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/lab-settings/tests?categoryId=${categoryId}`] });
            setIsAdding(false);
            setNewTest({ name: "", unit: "", section: "" });
            toast({ title: "Test Added" });
        }
    });

    const deleteTestMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/lab-settings/tests/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/lab-settings/tests?categoryId=${categoryId}`] });
            toast({ title: "Test Deleted" });
        }
    });

    if (isLoading) return <div>Loading tests...</div>;

    return (
        <div className="p-2 space-y-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Test Name</TableHead>
                        <TableHead>Sub-Category (Section)</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tests?.map((test) => (
                        <TableRow key={test.id}>
                            <TableCell className="font-medium">{test.name}</TableCell>
                            <TableCell>{test.section || "-"}</TableCell>
                            <TableCell>{test.unit || "-"}</TableCell>
                            <TableCell className="text-right flex justify-end gap-2">
                                <ManageRangesDialog test={test} />
                                <Button size="sm" variant="ghost" onClick={() => deleteTestMutation.mutate(test.id)}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                    {isAdding && (
                        <TableRow>
                            <TableCell>
                                <Input
                                    value={newTest.name}
                                    onChange={e => setNewTest({ ...newTest, name: e.target.value })}
                                    placeholder="Name"
                                />
                            </TableCell>
                            <TableCell>
                                <Input
                                    value={newTest.section}
                                    onChange={e => setNewTest({ ...newTest, section: e.target.value })}
                                    placeholder="Section"
                                />
                            </TableCell>
                            <TableCell>
                                <Input
                                    value={newTest.unit}
                                    onChange={e => setNewTest({ ...newTest, unit: e.target.value })}
                                    placeholder="Unit"
                                />
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button size="sm" onClick={() => createTestMutation.mutate(newTest)} disabled={!newTest.name}>
                                        <Save className="w-4 h-4" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
            {!isAdding && (
                <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Add Test
                </Button>
            )}
        </div>
    );
}

function ManageRangesDialog({ test }: { test: LabTest }) {
    const { toast } = useToast();
    const { data: ranges, isLoading } = useQuery<LabRefRange[]>({
        queryKey: [`/api/lab-settings/ranges?testId=${test.id}`],
    });

    const { data: speciesList } = useQuery<Species[]>({
        queryKey: ["/api/species"],
    });

    const [newRange, setNewRange] = useState({ species: "", breed: "", min: "", max: "", refText: "" });

    const createRangeMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/lab-settings/ranges", { ...data, testId: test.id });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/lab-settings/ranges?testId=${test.id}`] });
            setNewRange({ species: "", breed: "", min: "", max: "", refText: "" });
            toast({ title: "Range Added" });
        }
    });

    const deleteRangeMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/lab-settings/ranges/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/lab-settings/ranges?testId=${test.id}`] });
            toast({ title: "Range Deleted" });
        }
    });

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">Ranges</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Reference Ranges for {test.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Species</TableHead>
                                <TableHead>Breed</TableHead>
                                <TableHead>Min</TableHead>
                                <TableHead>Max</TableHead>
                                <TableHead>Text Value</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ranges?.map(r => (
                                <TableRow key={r.id}>
                                    <TableCell>{r.species}</TableCell>
                                    <TableCell>{r.breed || "All"}</TableCell>
                                    <TableCell>{r.min}</TableCell>
                                    <TableCell>{r.max}</TableCell>
                                    <TableCell>{r.refText}</TableCell>
                                    <TableCell>
                                        <Button size="sm" variant="ghost" onClick={() => deleteRangeMutation.mutate(r.id)}>
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            <TableRow>
                                <TableCell>
                                    <Select
                                        value={newRange.species}
                                        onValueChange={val => setNewRange({ ...newRange, species: val })}
                                    >
                                        <SelectTrigger className="w-28">
                                            <SelectValue placeholder="Species" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {speciesList?.map(s => (
                                                <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <Input
                                        value={newRange.breed}
                                        onChange={e => setNewRange({ ...newRange, breed: e.target.value })}
                                        placeholder="Breed (Optional)"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        value={newRange.min}
                                        onChange={e => setNewRange({ ...newRange, min: e.target.value })}
                                        placeholder="Min" className="w-20"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        value={newRange.max}
                                        onChange={e => setNewRange({ ...newRange, max: e.target.value })}
                                        placeholder="Max" className="w-20"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        value={newRange.refText}
                                        onChange={e => setNewRange({ ...newRange, refText: e.target.value })}
                                        placeholder="Text (e.g. Negative)"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Button size="sm" onClick={() => createRangeMutation.mutate(newRange)}>
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function SpeciesReferenceRanges() {
    const [selectedSpecies, setSelectedSpecies] = useState<string>("");

    const { data: speciesList } = useQuery<Species[]>({ queryKey: ["/api/species"] });
    const { data: categories } = useQuery<LabCategory[]>({ queryKey: ["/api/lab-settings/categories"] });
    const { data: tests } = useQuery<LabTest[]>({ queryKey: ["/api/lab-settings/tests"] });
    const { data: ranges } = useQuery<LabRefRange[]>({ queryKey: ["/api/lab-settings/ranges"] });

    if (!speciesList || !categories || !tests || !ranges) return null;

    return (
        <Card>
            <CardHeader className="bg-primary/5 border-b rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="w-5 h-5 text-primary" />
                    Species Reference Ranges Filter
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="mb-4 w-64">
                    <Select value={selectedSpecies} onValueChange={setSelectedSpecies}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Species to Edit" />
                        </SelectTrigger>
                        <SelectContent>
                            {speciesList.map(s => (
                                <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {selectedSpecies && (
                    <div className="space-y-6">
                        {categories.map(cat => {
                            const catTests = tests.filter(t => t.categoryId === cat.id);
                            if (catTests.length === 0) return null;
                            return (
                                <div key={cat.id} className="border rounded-md p-4">
                                    <h3 className="font-semibold text-lg mb-4">{cat.name}</h3>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Test Name</TableHead>
                                                <TableHead>Unit</TableHead>
                                                <TableHead>Min</TableHead>
                                                <TableHead>Max</TableHead>
                                                <TableHead>Text Value</TableHead>
                                                <TableHead className="w-24">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {catTests.map(test => {
                                                const existingRange = ranges.find(r => r.testId === test.id && r.species === selectedSpecies && !r.breed);
                                                return (
                                                    <TestRangeRow
                                                        key={`${test.id}-${selectedSpecies}`}
                                                        test={test}
                                                        selectedSpecies={selectedSpecies}
                                                        existingRange={existingRange}
                                                    />
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function TestRangeRow({ test, selectedSpecies, existingRange }: { test: LabTest, selectedSpecies: string, existingRange?: LabRefRange }) {
    const { toast } = useToast();
    const [min, setMin] = useState(existingRange?.min || "");
    const [max, setMax] = useState(existingRange?.max || "");
    const [refText, setRefText] = useState(existingRange?.refText || "");

    useEffect(() => {
        setMin(existingRange?.min || "");
        setMax(existingRange?.max || "");
        setRefText(existingRange?.refText || "");
    }, [existingRange]);

    const updateRangeMutation = useMutation({
        mutationFn: async () => {
            if (existingRange?.id) {
                return await apiRequest("PATCH", `/api/lab-settings/ranges/${existingRange.id}`, { min, max, refText });
            } else {
                return await apiRequest("POST", "/api/lab-settings/ranges", { testId: test.id, species: selectedSpecies, min, max, refText });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/lab-settings/ranges"] });
            toast({ title: "Range saved" });
        }
    });

    return (
        <TableRow>
            <TableCell className="font-medium">{test.name}</TableCell>
            <TableCell>{test.unit || "-"}</TableCell>
            <TableCell>
                <Input value={min} onChange={e => setMin(e.target.value)} placeholder="Min" className="w-20 h-8" />
            </TableCell>
            <TableCell>
                <Input value={max} onChange={e => setMax(e.target.value)} placeholder="Max" className="w-20 h-8" />
            </TableCell>
            <TableCell>
                <Input value={refText} onChange={e => setRefText(e.target.value)} placeholder="Text Value" className="h-8" />
            </TableCell>
            <TableCell>
                <Button size="sm" onClick={() => updateRangeMutation.mutate()} disabled={updateRangeMutation.isPending}>
                    <Save className="w-4 h-4" />
                </Button>
            </TableCell>
        </TableRow>
    );
}

function BloodSmearPathogenSettings() {
    const { toast } = useToast();
    const [filterSpecies, setFilterSpecies] = useState<string>("all");
    const [addSpecies, setAddSpecies] = useState<string>("");
    const [newPathogenName, setNewPathogenName] = useState("");
    const [editingPathogenId, setEditingPathogenId] = useState<number | null>(null);
    const [editingPathogenName, setEditingPathogenName] = useState("");

    const { data: speciesList } = useQuery<Species[]>({ queryKey: ["/api/species"] });

    const { data: pathogens, isLoading } = useQuery<BloodSmearPathogen[]>({
        queryKey: ["/api/blood-smear-pathogens", filterSpecies],
        queryFn: async ({ queryKey }) => {
            const species = queryKey[1] as string;
            const url = (species && species !== "all") 
                ? `/api/blood-smear-pathogens?species=${encodeURIComponent(species)}` 
                : "/api/blood-smear-pathogens";
            const res = await apiRequest("GET", url);
            return res.json();
        }
    });

    const createPathogenMutation = useMutation({
        mutationFn: async (data: { species: string, name: string }) => {
            const res = await apiRequest("POST", "/api/blood-smear-pathogens", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/blood-smear-pathogens"] });
            setNewPathogenName("");
            setAddSpecies("");
            toast({ title: "Pathogen Added" });
        }
    });

    const updatePathogenMutation = useMutation({
        mutationFn: async (data: { id: number, name: string }) => {
            const res = await apiRequest("PATCH", `/api/blood-smear-pathogens/${data.id}`, { name: data.name });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/blood-smear-pathogens"] });
            setEditingPathogenId(null);
            setEditingPathogenName("");
            toast({ title: "Pathogen Updated" });
        }
    });

    const deletePathogenMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/blood-smear-pathogens/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/blood-smear-pathogens"] });
            toast({ title: "Pathogen Deleted" });
        }
    });

    if (!speciesList) return null;

    return (
        <>
            <CardHeader className="bg-primary/5 border-b rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <ShieldAlert className="w-5 h-5 text-primary" />
                    Blood Smear Pathogens Configuration
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                {/* Add New Pathogen Section */}
                <div className="flex flex-col md:flex-row gap-6 p-4 bg-muted/40 rounded-lg border border-dashed">
                    <div className="flex-1 space-y-3">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                            <Plus className="w-4 h-4 text-primary" />
                            Add New Pathogen
                        </Label>
                        <div className="flex gap-3 items-end flex-wrap">
                            <div className="w-48 space-y-1.5">
                                <Label className="text-xs text-muted-foreground uppercase">Target Species</Label>
                                <Select value={addSpecies} onValueChange={setAddSpecies}>
                                    <SelectTrigger className="bg-background">
                                        <SelectValue placeholder="Select species..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(speciesList || []).map(s => (
                                            <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex-1 min-w-[200px] space-y-1.5">
                                <Label className="text-xs text-muted-foreground uppercase">Pathogen Name</Label>
                                <Input 
                                    placeholder="e.g. Babesia canis" 
                                    value={newPathogenName} 
                                    onChange={(e) => setNewPathogenName(e.target.value)} 
                                    className="bg-background"
                                />
                            </div>
                            <Button 
                                onClick={() => createPathogenMutation.mutate({ species: addSpecies, name: newPathogenName })} 
                                disabled={!newPathogenName.trim() || !addSpecies || createPathogenMutation.isPending}
                                className="px-6 shadow-sm"
                            >
                                {createPathogenMutation.isPending ? "Adding..." : "Add Pathogen"}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Manage Pathogens</h3>
                        <div className="flex items-center gap-3">
                            <Label className="text-sm text-muted-foreground">Filter List:</Label>
                            <Select value={filterSpecies} onValueChange={setFilterSpecies}>
                                <SelectTrigger className="w-48 h-9 bg-background">
                                    <SelectValue placeholder="All Species" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Species</SelectItem>
                                    {(speciesList || []).map(s => (
                                        <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="border rounded-md overflow-hidden bg-background">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="w-[180px]">Species</TableHead>
                                    <TableHead>Pathogen Name</TableHead>
                                    <TableHead className="text-right w-[120px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-8">
                                            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                Loading pathogens...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : pathogens?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-10 text-muted-foreground italic">
                                            <FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                            No pathogens found for the selected species.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    pathogens?.map((pathogen) => (
                                        <TableRow key={pathogen.id} className="group hover:bg-muted/20">
                                            <TableCell className="font-medium text-xs uppercase tracking-tight text-muted-foreground">
                                                {pathogen.species}
                                            </TableCell>
                                        <TableCell className="font-medium">
                                            {editingPathogenId === pathogen.id ? (
                                                <Input 
                                                    value={editingPathogenName} 
                                                    onChange={(e) => setEditingPathogenName(e.target.value)}
                                                    className="h-8"
                                                />
                                            ) : (
                                                pathogen.name
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {editingPathogenId === pathogen.id ? (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => updatePathogenMutation.mutate({ id: pathogen.id, name: editingPathogenName })}
                                                            disabled={!editingPathogenName.trim() || updatePathogenMutation.isPending}
                                                        >
                                                            <Save className="w-4 h-4 text-primary" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => {
                                                                setEditingPathogenId(null);
                                                                setEditingPathogenName("");
                                                            }}
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => {
                                                                setEditingPathogenId(pathogen.id);
                                                                setEditingPathogenName(pathogen.name);
                                                            }}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => {
                                                                if (confirm("Delete this pathogen?")) deletePathogenMutation.mutate(pathogen.id);
                                                            }}
                                                        >
                                                            <Trash2 className="w-4 h-4 text-destructive" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                        </Table>
                    </div>
                </div>
            </CardContent>
        </>
    );
}
