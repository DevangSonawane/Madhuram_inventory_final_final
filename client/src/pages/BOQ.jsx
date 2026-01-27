import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useProject } from '@/contexts/ProjectContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Upload, Plus, FileSpreadsheet, Save, FileText, CheckCircle2, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { extractTextFromPdf } from "@/lib/pdfUtils";
import { extractBOQFromText, mapBOQItemsToTable } from "@/lib/boqExtractor";

const STORAGE_KEY = "boq_items_by_project";

function loadStoredItems(projectId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data[projectId] ?? null;
  } catch {
    return null;
  }
}

function saveStoredItems(projectId, items) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || "{}";
    const data = JSON.parse(raw);
    data[projectId] = items;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("BOQ save failed", e);
  }
}

const DEFAULT_ITEMS = [
  { id: 1, category: "Plumbing", code: "PLM-001", description: "CPVC Pipe 2 inch", unit: "Mtr", quantity: 5000, rate: 450, amount: 2250000, floor: "Typical" },
  { id: 2, category: "Plumbing", code: "PLM-002", description: "Ball Valve 2 inch", unit: "Nos", quantity: 200, rate: 1200, amount: 240000, floor: "All" },
  { id: 3, category: "Sanitary", code: "SAN-001", description: "Wall Mounted WC", unit: "Nos", quantity: 450, rate: 15000, amount: 6750000, floor: "Typical" },
  { id: 4, category: "Electrical", code: "ELE-005", description: "Copper Wire 2.5mm", unit: "Coil", quantity: 1000, rate: 2500, amount: 2500000, floor: "All" },
];

export default function BOQ() {
  const { toast } = useToast();
  const { projectId } = useParams();
  const { selectedProject } = useProject();
  const projectKey = selectedProject?.id ?? projectId ?? 'default';

  const [items, setItems] = useState([]);
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [extractedItems, setExtractedItems] = useState([]);
  const [extractedProjectName, setExtractedProjectName] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState(null);
  const [boqFile, setBoqFile] = useState(null);
  const boqInputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    const stored = loadStoredItems(projectKey);
    setItems(stored ?? DEFAULT_ITEMS);
  }, [projectKey]);

  useEffect(() => {
    saveStoredItems(projectKey, items);
  }, [projectKey, items]);

  const isPdf = (f) => f && (f.type === "application/pdf" || (f.name || "").toLowerCase().endsWith(".pdf"));

  const runExtract = async (file) => {
    setExtractError(null);
    setExtracting(true);
    try {
      const raw = await extractTextFromPdf(file, { fullDocument: true, preserveLines: true });
      const { items: parsed, projectName } = extractBOQFromText(raw);
      const mapped = mapBOQItemsToTable(parsed, 0);
      setExtractedItems(mapped);
      setExtractedProjectName(projectName || "");
      setImportPreviewOpen(true);
    } catch (err) {
      console.error(err);
      setExtractError(err?.message || "Could not read BOQ PDF.");
      toast({
        title: "BOQ extraction failed",
        description: "We couldn't parse this PDF. You can still import via Excel or add items manually.",
        variant: "destructive",
      });
    } finally {
      setExtracting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBoqFile(file);
    if (isPdf(file)) runExtract(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    if (!isPdf(file)) {
      toast({ title: "Invalid file", description: "Please use a BOQ PDF.", variant: "destructive" });
      return;
    }
    setBoqFile(file);
    runExtract(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const addExtractedToBOQ = () => {
    const maxId = items.length ? Math.max(...items.map((i) => i.id)) : 0;
    const withIds = extractedItems.map((it, i) => ({ ...it, id: maxId + i + 1 }));
    setItems((prev) => [...prev, ...withIds]);
    setImportPreviewOpen(false);
    setBoqFile(null);
    if (boqInputRef.current) boqInputRef.current.value = "";
    toast({ title: "Added to BOQ", description: `${withIds.length} item(s) added.` });
  };

  const replaceBOQWithExtracted = () => {
    const withIds = extractedItems.map((it, i) => ({ ...it, id: i + 1 }));
    setItems(withIds);
    setImportPreviewOpen(false);
    setBoqFile(null);
    if (boqInputRef.current) boqInputRef.current.value = "";
    toast({ title: "BOQ replaced", description: `${withIds.length} item(s) loaded from PDF.` });
  };

  const filteredItems = items.filter((item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.category?.toLowerCase().includes(term) ||
      item.code?.toLowerCase().includes(term) ||
      item.description?.toLowerCase().includes(term) ||
      item.unit?.toLowerCase().includes(term) ||
      item.floor?.toLowerCase().includes(term) ||
      String(item.quantity).includes(term) ||
      String(item.rate).includes(term) ||
      String(item.amount).includes(term)
    );
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  const totalAmount = filteredItems.reduce((s, i) => s + (i.amount || 0), 0);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">BOQ Management</h1>
          <p className="text-muted-foreground mt-2">Manage Bill of Quantities for projects.</p>
        </div>
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
          <div
            className="relative border-2 border-dashed rounded-lg px-4 py-2 flex items-center gap-2 text-sm hover:bg-muted/50 transition-colors"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              ref={boqInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Upload className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {boqFile ? (extracting ? "Extracting…" : boqFile.name) : "Import BOQ PDF"}
            </span>
            {extractError && <span className="text-destructive text-xs">{extractError}</span>}
          </div>
          <Button variant="outline" size="sm" className="shrink-0">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button size="sm" className="shrink-0">
            <Plus className="mr-2 h-4 w-4" /> Add Item
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>BOQ Items</CardTitle>
            <div className="relative w-full sm:w-auto sm:min-w-[300px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by category, code, description..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8"
              />
            </div>
          </div>
          {searchTerm && (
            <p className="text-sm text-muted-foreground mt-2">
              Showing {filteredItems.length} of {items.length} item(s)
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Rate (Est.)</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      {searchTerm ? "No items found matching your search." : "No BOQ items. Import a PDF or add items manually."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell><Badge variant="outline">{item.category}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{item.code}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate" title={item.description}>{item.description}</TableCell>
                    <TableCell>{item.floor}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right">{Number(item.quantity).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{item.rate ? `₹${Number(item.rate).toLocaleString()}` : "–"}</TableCell>
                    <TableCell className="text-right">{item.amount ? `₹${Number(item.amount).toLocaleString()}` : "–"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <FileSpreadsheet className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  ))
                )}
                {paginatedItems.length > 0 && (
                  <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={5}>Total</TableCell>
                  <TableCell className="text-right"></TableCell>
                  <TableCell className="text-right"></TableCell>
                  <TableCell className="text-right">₹{totalAmount.toLocaleString()}</TableCell>
                  <TableCell></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {filteredItems.length > itemsPerPage && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-muted-foreground">Rows per page</p>
                  <Select
                    value={`${itemsPerPage}`}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 20, 30, 50, 100].map((size) => (
                        <SelectItem key={size} value={`${size}`}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4 md:hidden">
            {paginatedItems.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                {searchTerm ? "No items found matching your search." : "No BOQ items. Import a PDF or add items manually."}
              </div>
            ) : (
              paginatedItems.map((item) => (
              <div key={item.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <Badge variant="outline">{item.category}</Badge>
                    <div className="font-medium">{item.description}</div>
                    <div className="text-xs font-mono text-muted-foreground">{item.code}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{item.amount ? `₹${Number(item.amount).toLocaleString()}` : "–"}</div>
                    {item.rate ? <div className="text-xs text-muted-foreground">₹{Number(item.rate).toLocaleString()}/{item.unit}</div> : null}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
                  <div>
                    <span className="text-muted-foreground block">Quantity:</span>
                    <span>{Number(item.quantity).toLocaleString()} {item.unit}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Floor:</span>
                    <span>{item.floor}</span>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button variant="ghost" size="sm">
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Details
                  </Button>
                </div>
              </div>
              ))
            )}
            {paginatedItems.length > 0 && (
              <div className="p-4 bg-muted/50 rounded-lg flex justify-between items-center font-bold">
                <span>Total Amount</span>
                <span>₹{totalAmount.toLocaleString()}</span>
              </div>
            )}
            {filteredItems.length > itemsPerPage && (
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-muted-foreground">Rows per page</p>
                  <Select
                    value={`${itemsPerPage}`}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 20, 30, 50, 100].map((size) => (
                        <SelectItem key={size} value={`${size}`}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button>
          <Save className="mr-2 h-4 w-4" /> Save Changes
        </Button>
      </div>

      <Dialog open={importPreviewOpen} onOpenChange={setImportPreviewOpen}>
        <DialogContent className="sm:max-w-[90vw] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Preview BOQ from PDF
            </DialogTitle>
          </DialogHeader>
          {extractedProjectName && (
            <p className="text-sm text-muted-foreground">Project: <strong>{extractedProjectName}</strong></p>
          )}
          <p className="text-sm text-muted-foreground">
            {extractedItems.length} item(s) extracted. Add to existing BOQ or replace all.
          </p>
          <ScrollArea className="flex-1 max-h-[50vh] border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {extractedItems.map((it, i) => (
                  <TableRow key={i}>
                    <TableCell><Badge variant="outline">{it.category}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{it.code}</TableCell>
                    <TableCell className="max-w-[300px] truncate" title={it.description}>{it.description}</TableCell>
                    <TableCell>{it.unit}</TableCell>
                    <TableCell className="text-right">{Number(it.quantity).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportPreviewOpen(false); setBoqFile(null); setExtractError(null); if (boqInputRef.current) boqInputRef.current.value = ""; }}>
              Cancel
            </Button>
            <Button variant="outline" onClick={addExtractedToBOQ}>
              Add to BOQ
            </Button>
            <Button onClick={replaceBOQWithExtracted}>
              Replace BOQ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
