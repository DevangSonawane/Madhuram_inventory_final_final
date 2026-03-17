import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useProject } from '@/contexts/ProjectContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Upload, Plus, FileSpreadsheet, CheckCircle2, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Pencil, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { extractTextFromPdfWithOcr } from "@/lib/pdfUtils";
import { extractBOQFromText, mapBOQItemsToTable } from "@/lib/boqExtractor";
import { api } from "@/lib/api";
import { Checkbox } from "@/components/ui/checkbox";

function normalizeBoqItem(apiItem) {
  return {
    id: apiItem.boq_id,
    boq_id: apiItem.boq_id,
    code: apiItem.item_code ?? apiItem.code,
    item_code: apiItem.item_code,
    category: apiItem.category,
    description: apiItem.description,
    floor: apiItem.floor,
    unit: apiItem.unit,
    quantity: apiItem.quantity,
    rate: apiItem.rate,
    amount: apiItem.amount,
    boq_file: apiItem.boq_file,
    project_id: apiItem.project_id,
    created_at: apiItem.created_at,
  };
}

function toApiPayload(item, projectId) {
  return {
    category: item.category ?? '',
    item_code: item.code ?? item.item_code ?? '',
    description: item.description ?? '',
    floor: item.floor ?? '',
    unit: item.unit ?? '',
    quantity: item.quantity != null ? Number(item.quantity) : '',
    rate: item.rate != null ? Number(item.rate) : '',
    amount: item.amount != null ? Number(item.amount) : '',
    project_id: projectId ?? item.project_id,
    boq_file: item.boq_file instanceof File ? item.boq_file : undefined,
  };
}

const EMPTY_FORM = { category: '', item_code: '', description: '', floor: '', unit: '', quantity: '', rate: '', amount: '' };

export default function BOQ() {
  const { toast } = useToast();
  const { projectId: routeProjectId } = useParams();
  const { selectedProject } = useProject();
  const projectId = selectedProject?.id ?? selectedProject?.project_id ?? routeProjectId ?? null;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
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
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [itemForm, setItemForm] = useState(EMPTY_FORM);
  const [formFile, setFormFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const addFormRef = useRef(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [massDeleteOpen, setMassDeleteOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);

  const fetchItems = async () => {
    if (!projectId) {
      setItems([]);
      setSelectedIds(new Set());
      return;
    }
    setLoading(true);
    try {
      const res = await api.getBOQsByProject(projectId);
      if (res.success && Array.isArray(res.data)) {
        setItems(res.data.map(normalizeBoqItem));
        setSelectedIds(new Set());
      } else {
        setItems([]);
        setSelectedIds(new Set());
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to load BOQ items.", variant: "destructive" });
      setItems([]);
      setSelectedIds(new Set());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [projectId]);

  const isPdf = (f) => f && (f.type === "application/pdf" || (f.name || "").toLowerCase().endsWith(".pdf"));

  const runExtract = async (file) => {
    setExtractError(null);
    setExtracting(true);
    try {
      // Optimized extraction: limit pages and use parallel processing
      const raw = await extractTextFromPdfWithOcr(file, { 
        fullDocument: true, 
        preserveLines: true,
        maxPages: 20,
        batchSize: 4
      });
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

  const addExtractedToBOQ = async () => {
    if (projectId) {
      setSaving(true);
      try {
        let created = 0;
        for (const it of extractedItems) {
          const payload = toApiPayload({ ...it, code: it.code ?? it.item_code }, projectId);
          const res = await api.createBOQ(payload);
          if (res.success) created++;
        }
        await fetchItems();
        setImportPreviewOpen(false);
        setBoqFile(null);
        if (boqInputRef.current) boqInputRef.current.value = "";
        toast({ title: "Added to BOQ", description: `${created} item(s) added.` });
      } catch (e) {
        toast({ title: "Error", description: "Failed to add some items.", variant: "destructive" });
      } finally {
        setSaving(false);
      }
    } else {
      const maxId = items.length ? Math.max(...items.map((i) => i.id)) : 0;
      const withIds = extractedItems.map((it, i) => ({ ...it, id: maxId + i + 1 }));
      setItems((prev) => [...prev, ...withIds]);
      setImportPreviewOpen(false);
      setBoqFile(null);
      if (boqInputRef.current) boqInputRef.current.value = "";
      toast({ title: "Added to BOQ", description: `${withIds.length} item(s) added. Select a project to save to server.` });
    }
  };

  const replaceBOQWithExtracted = async () => {
    if (projectId) {
      setSaving(true);
      try {
        for (const item of items) {
          await api.deleteBOQ(item.id);
        }
        let created = 0;
        for (const it of extractedItems) {
          const payload = toApiPayload({ ...it, code: it.code ?? it.item_code }, projectId);
          const res = await api.createBOQ(payload);
          if (res.success) created++;
        }
        await fetchItems();
        setImportPreviewOpen(false);
        setBoqFile(null);
        if (boqInputRef.current) boqInputRef.current.value = "";
        toast({ title: "BOQ replaced", description: `${created} item(s) loaded from PDF.` });
      } catch (e) {
        toast({ title: "Error", description: "Failed to replace BOQ.", variant: "destructive" });
      } finally {
        setSaving(false);
      }
    } else {
      const withIds = extractedItems.map((it, i) => ({ ...it, id: i + 1 }));
      setItems(withIds);
      setImportPreviewOpen(false);
      setBoqFile(null);
      if (boqInputRef.current) boqInputRef.current.value = "";
      toast({ title: "BOQ replaced", description: `${withIds.length} item(s) loaded from PDF. Select a project to save to server.` });
    }
  };

  const openAddDialog = () => {
    setItemForm(EMPTY_FORM);
    setFormFile(null);
    setAddDialogOpen(true);
  };

  const handleAddItem = async (e) => {
    e?.preventDefault();
    if (!projectId) {
      toast({ title: "Select project", description: "Choose a project first.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...itemForm, project_id: projectId };
      if (formFile instanceof File) payload.boq_file = formFile;
      const res = await api.createBOQ(payload);
      if (res.success) {
        await fetchItems();
        setAddDialogOpen(false);
        setItemForm(EMPTY_FORM);
        setFormFile(null);
        toast({ title: "Item added", description: "BOQ item created." });
      } else {
        toast({ title: "Error", description: res.error || "Failed to add item.", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: e.message || "Failed to add item.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (item) => {
    setEditItem(item);
    setItemForm({
      category: item.category ?? '',
      item_code: item.code ?? item.item_code ?? '',
      description: item.description ?? '',
      floor: item.floor ?? '',
      unit: item.unit ?? '',
      quantity: item.quantity ?? '',
      rate: item.rate ?? '',
      amount: item.amount ?? '',
    });
    setFormFile(null);
  };

  const handleEditItem = async (e) => {
    e?.preventDefault();
    if (!editItem) return;
    setSaving(true);
    try {
      const payload = { ...itemForm, item_code: itemForm.item_code || undefined };
      if (formFile instanceof File) payload.boq_file = formFile;
      const res = await api.updateBOQ(editItem.id, payload);
      if (res.success) {
        await fetchItems();
        setEditItem(null);
        setItemForm(EMPTY_FORM);
        setFormFile(null);
        toast({ title: "Item updated", description: "BOQ item saved." });
      } else {
        toast({ title: "Error", description: res.error || "Failed to update item.", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: e.message || "Failed to update item.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm("Delete this BOQ item?")) return;
    setSaving(true);
    try {
      const res = await api.deleteBOQ(item.id);
      if (res.success) {
        await fetchItems();
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
        toast({ title: "Item deleted", description: "BOQ item removed." });
      } else {
        toast({ title: "Error", description: res.error || "Failed to delete item.", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: e.message || "Failed to delete item.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
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
  const pageIds = paginatedItems.map((i) => i?.id).filter((id) => id != null);
  const pageAllSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const pageSomeSelected = pageIds.some((id) => selectedIds.has(id));
  const pageCheckboxState = pageAllSelected ? true : pageSomeSelected ? "indeterminate" : false;

  const totalAmount = filteredItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const toggleItemSelection = (id, checked) => {
    if (id == null) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const togglePageSelection = (checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        pageIds.forEach((id) => next.add(id));
      } else {
        pageIds.forEach((id) => next.delete(id));
      }
      return next;
    });
  };

  const handleMassDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!projectId || ids.length === 0) return;

    setSaving(true);
    try {
      let deleted = 0;
      let failed = 0;
      for (const id of ids) {
        try {
          const res = await api.deleteBOQ(id);
          if (res?.success) deleted += 1;
          else failed += 1;
        } catch {
          failed += 1;
        }
      }
      await fetchItems();
      setSelectedIds(new Set());
      setMassDeleteOpen(false);
      toast({
        title: "Mass delete complete",
        description: failed > 0 ? `${deleted} deleted, ${failed} failed.` : `${deleted} item(s) deleted.`,
        variant: failed > 0 ? "destructive" : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!projectId || items.length === 0) return;

    const ids = items.map((i) => i?.id).filter((id) => id != null);
    if (ids.length === 0) return;

    setSaving(true);
    try {
      let deleted = 0;
      let failed = 0;
      const batchSize = 10;
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const results = await Promise.allSettled(batch.map((id) => api.deleteBOQ(id)));
        results.forEach((r) => {
          if (r.status === "fulfilled" && r.value?.success) deleted += 1;
          else failed += 1;
        });
      }

      await fetchItems();
      setSelectedIds(new Set());
      setDeleteAllOpen(false);
      toast({
        title: "Delete all complete",
        description: failed > 0 ? `${deleted} deleted, ${failed} failed.` : `${deleted} item(s) deleted.`,
        variant: failed > 0 ? "destructive" : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

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
          <Button size="sm" className="shrink-0" onClick={openAddDialog} disabled={!projectId}>
            <Plus className="mr-2 h-4 w-4" /> Add Item
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="shrink-0"
            onClick={() => setMassDeleteOpen(true)}
            disabled={!projectId || selectedIds.size === 0 || saving}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete Selected{selectedIds.size ? ` (${selectedIds.size})` : ""}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="shrink-0"
            onClick={() => setDeleteAllOpen(true)}
            disabled={!projectId || items.length === 0 || saving}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete All
          </Button>
          <Button variant="outline" size="sm" className="shrink-0" onClick={fetchItems} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
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
                  <TableHead className="w-10">
                    <Checkbox
                      checked={pageCheckboxState}
                      onCheckedChange={(v) => togglePageSelection(Boolean(v))}
                      disabled={paginatedItems.length === 0}
                    />
                  </TableHead>
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
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                      Loading BOQ items…
                    </TableCell>
                  </TableRow>
                ) : paginatedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                      {!projectId ? "Select a project to load BOQ items." : searchTerm ? "No items found matching your search." : "No BOQ items. Import a PDF or add items manually."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={(v) => toggleItemSelection(item.id, Boolean(v))}
                      />
                    </TableCell>
                    <TableCell><Badge variant="outline">{item.category}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{item.code}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate" title={item.description}>{item.description}</TableCell>
                    <TableCell>{item.floor}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right">{Number(item.quantity).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{item.rate ? `₹${Number(item.rate).toLocaleString()}` : "–"}</TableCell>
                    <TableCell className="text-right">{item.amount ? `₹${Number(item.amount).toLocaleString()}` : "–"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteItem(item)} title="Delete">
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  ))
                )}
                {paginatedItems.length > 0 && (
                  <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={6}>Total</TableCell>
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
                  <div className="flex flex-col items-end gap-2">
                    <Checkbox
                      checked={selectedIds.has(item.id)}
                      onCheckedChange={(v) => toggleItemSelection(item.id, Boolean(v))}
                    />
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
                <div className="flex justify-end gap-1 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(item)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteItem(item)}>
                    Delete
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

      <Dialog open={massDeleteOpen} onOpenChange={setMassDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete selected BOQ items</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            This will permanently delete {selectedIds.size} item(s).
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMassDeleteOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleMassDelete} disabled={saving || selectedIds.size === 0}>
              {saving ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete all BOQ items</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            This will permanently delete {items.length} item(s).
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAllOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAll} disabled={saving || items.length === 0}>
              {saving ? "Deleting…" : "Delete All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add BOQ Item</DialogTitle>
          </DialogHeader>
          <form ref={addFormRef} onSubmit={handleAddItem} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Input
                  value={itemForm.category}
                  onChange={(e) => setItemForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. Civil, Plumbing"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Item Code</Label>
                <Input
                  value={itemForm.item_code}
                  onChange={(e) => setItemForm((f) => ({ ...f, item_code: e.target.value }))}
                  placeholder="e.g. C-101"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={itemForm.description}
                onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Item description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Floor</Label>
                <Input
                  value={itemForm.floor}
                  onChange={(e) => setItemForm((f) => ({ ...f, floor: e.target.value }))}
                  placeholder="e.g. Ground"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input
                  value={itemForm.unit}
                  onChange={(e) => setItemForm((f) => ({ ...f, unit: e.target.value }))}
                  placeholder="e.g. Sq.m, Nos"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  step="any"
                  value={itemForm.quantity}
                  onChange={(e) => setItemForm((f) => ({ ...f, quantity: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Rate</Label>
                <Input
                  type="number"
                  step="any"
                  value={itemForm.rate}
                  onChange={(e) => setItemForm((f) => ({ ...f, rate: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="any"
                  value={itemForm.amount}
                  onChange={(e) => setItemForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>BOQ File (optional)</Label>
              <Input
                type="file"
                accept=".pdf,.xlsx,.xls"
                onChange={(e) => setFormFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Add Item"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit BOQ Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditItem} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Input
                  value={itemForm.category}
                  onChange={(e) => setItemForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. Civil, Plumbing"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Item Code</Label>
                <Input
                  value={itemForm.item_code}
                  onChange={(e) => setItemForm((f) => ({ ...f, item_code: e.target.value }))}
                  placeholder="e.g. C-101"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={itemForm.description}
                onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Item description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Floor</Label>
                <Input
                  value={itemForm.floor}
                  onChange={(e) => setItemForm((f) => ({ ...f, floor: e.target.value }))}
                  placeholder="e.g. Ground"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input
                  value={itemForm.unit}
                  onChange={(e) => setItemForm((f) => ({ ...f, unit: e.target.value }))}
                  placeholder="e.g. Sq.m, Nos"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  step="any"
                  value={itemForm.quantity}
                  onChange={(e) => setItemForm((f) => ({ ...f, quantity: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Rate</Label>
                <Input
                  type="number"
                  step="any"
                  value={itemForm.rate}
                  onChange={(e) => setItemForm((f) => ({ ...f, rate: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="any"
                  value={itemForm.amount}
                  onChange={(e) => setItemForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Replace BOQ File (optional)</Label>
              <Input
                type="file"
                accept=".pdf,.xlsx,.xls"
                onChange={(e) => setFormFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={importPreviewOpen} onOpenChange={setImportPreviewOpen}>
        <DialogContent className="sm:max-w-[90vw] h-[85vh] flex flex-col overflow-hidden">
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
          <div className="flex-1 overflow-auto border rounded-md">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportPreviewOpen(false); setBoqFile(null); setExtractError(null); if (boqInputRef.current) boqInputRef.current.value = ""; }} disabled={saving}>
              Cancel
            </Button>
            <Button variant="outline" onClick={addExtractedToBOQ} disabled={saving}>
              {saving ? "Saving…" : "Add to BOQ"}
            </Button>
            <Button onClick={replaceBOQWithExtracted} disabled={saving}>
              {saving ? "Replacing…" : "Replace BOQ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
