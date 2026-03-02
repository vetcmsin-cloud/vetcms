
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
import { Plus, Trash2, Edit, Save, X } from "lucide-react";
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
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Species Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2 mb-4">
                        <Input
                            placeholder="New Species (e.g. Canine, Feline, Bovine)"
                            value={newSpeciesName}
                            onChange={(e) => setNewSpeciesName(e.target.value)}
                        />
                        <Button onClick={() => createSpeciesMutation.mutate(newSpeciesName)} disabled={!newSpeciesName.trim()}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Species
                        </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {speciesList?.map((s) => (
                            <div key={s.id} className="flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-1.5 rounded-md">
                                <span>{s.name}</span>
                                <Button size="sm" variant="ghost" className="h-5 w-5 p-0 hover:bg-destructive hover:text-destructive-foreground" onClick={() => {
                                    if (confirm("Delete this species?")) deleteSpeciesMutation.mutate(s.id);
                                }}>
                                    <X className="w-3 h-3" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Lab Test Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2 mb-4">
                        <Input
                            placeholder="New Category Name (e.g. Hematology)"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                        />
                        <Button onClick={() => createCategoryMutation.mutate(newCategoryName)} disabled={!newCategoryName.trim()}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Category
                        </Button>
                    </div>

                    <Accordion type="single" collapsible className="w-full">
                        {categories?.map((cat) => (
                            <AccordionItem key={cat.id} value={String(cat.id)}>
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center justify-between w-full pr-4">
                                        <span>{cat.name}</span>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm("Delete this category?")) deleteCategoryMutation.mutate(cat.id);
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <LabTestsList categoryId={cat.id} />
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </CardContent>
            </Card>

            <SpeciesReferenceRanges />
        </div>
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
            <CardHeader>
                <CardTitle>Species Reference Ranges Filter</CardTitle>
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
