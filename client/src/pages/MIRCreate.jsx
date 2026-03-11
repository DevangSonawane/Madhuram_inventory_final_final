import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const getEmptyForm = (projectId = "") => ({
  project_name: "",
  project_code: "",
  client_name: "",
  pmc: "",
  contractor: "",
  vendor_code: "",
  po_id: "",
  challan_no: "",
  mir_refrence_no: "",
  material_code: "",
  inspection_date_time: "",
  client_submission_date: "",
  add_attachment: "",
  project_id: projectId ? Number(projectId) : "",
  items: [],
});

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toText = (value) => (value == null ? "" : String(value).trim());

const mapChallanItemsToMirItems = (items) => {
  if (!Array.isArray(items)) return [];
  return items.map((item, index) => {
    const qty = toNumber(item?.qty ?? item?.quantity, 0);
    const rate = toNumber(item?.Rate ?? item?.rate ?? item?.price, 0);
    const hsn = toText(item?.hsn ?? item?.hsnCode ?? item?.hsn_code ?? item?.HSN);
    const uom = toText(item?.UOM ?? item?.uom ?? item?.unit ?? item?.Unit);
    return {
      srno: toNumber(item?.srno, index + 1),
      hsn,
      description: item?.description ?? item?.name ?? "",
      qty,
      UOM: uom,
      Rate: rate,
      Amount: toNumber(item?.Amount ?? item?.amount, qty * rate),
      remark: item?.remark ?? "",
      inspected: false,
    };
  });
};

const enrichMirItemsFromPo = (mirItems, poItems) => {
  if (!Array.isArray(mirItems) || !Array.isArray(poItems) || poItems.length === 0) return mirItems || [];

  const poItemsByDescription = new Map();
  poItems.forEach((item) => {
    const key = toText(item?.description ?? item?.name).toLowerCase();
    if (key && !poItemsByDescription.has(key)) poItemsByDescription.set(key, item);
  });

  return mirItems.map((item, index) => {
    const descriptionKey = toText(item?.description).toLowerCase();
    const poMatch = (descriptionKey && poItemsByDescription.get(descriptionKey)) || poItems[index] || null;
    if (!poMatch) return item;

    const poHsn = toText(poMatch?.hsn ?? poMatch?.hsnCode ?? poMatch?.hsn_code ?? poMatch?.HSN);
    const poUom = toText(poMatch?.UOM ?? poMatch?.uom ?? poMatch?.unit ?? poMatch?.Unit);

    return {
      ...item,
      hsn: item?.hsn ? item.hsn : poHsn,
      UOM: item?.UOM ? item.UOM : poUom,
      inspected: Boolean(item?.inspected),
    };
  });
};

  const toPayloadNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const toPositiveInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseDynamicField = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const getDynamicValue = (dynamicField, key) => {
  if (!Array.isArray(dynamicField)) return null;
  const entry = dynamicField.find((item) => item?.key === key);
  if (!entry) return null;
  const raw = entry.value;
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

export default function MIRCreate() {
  const navigate = useNavigate();
  const { projectId, mirId } = useParams();
  const { toast } = useToast();
  const attachmentInputRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [isAttachmentDragging, setIsAttachmentDragging] = useState(false);
  const [isInspectionOpen, setIsInspectionOpen] = useState(false);
  const [form, setForm] = useState(getEmptyForm(projectId));
  const [challans, setChallans] = useState([]);
  const [projectPos, setProjectPos] = useState([]);
  const [loadingMir, setLoadingMir] = useState(false);
  const isEditMode = Boolean(mirId);

  useEffect(() => {
    setForm((prev) => ({ ...prev, project_id: projectId ? Number(projectId) : "" }));
  }, [projectId]);

  useEffect(() => {
    const fetchChallans = async () => {
      if (!projectId) {
        setChallans([]);
        return;
      }
      try {
        const result = await api.getDcsByProject(projectId);
        if (!result.success) {
          setChallans([]);
          return;
        }
        setChallans(Array.isArray(result.data) ? result.data : []);
      } catch {
        setChallans([]);
      }
    };

    fetchChallans();
  }, [projectId]);

  useEffect(() => {
    const fetchPos = async () => {
      if (!projectId) {
        setProjectPos([]);
        return;
      }
      try {
        const result = await api.getPosByProject(projectId);
        if (!result.success) {
          setProjectPos([]);
          return;
        }
        setProjectPos(Array.isArray(result.data) ? result.data : []);
      } catch {
        setProjectPos([]);
      }
    };

    fetchPos();
  }, [projectId]);

  useEffect(() => {
    const fetchMir = async () => {
      if (!mirId) return;
      try {
        setLoadingMir(true);
        const result = await api.getMirById(mirId);
        if (!result.success || !result.data) {
          toast({
            title: "Failed to load MIR",
            description: result.error || "Could not load MIR details.",
            variant: "destructive",
          });
          return;
        }
        const row = result.data;
        const dynamicField = parseDynamicField(row.dynamic_field);
        const dynamicItems = getDynamicValue(dynamicField, "items");
        const dynamicChallanNo = getDynamicValue(dynamicField, "challan_no");
        const dynamicPoId = getDynamicValue(dynamicField, "po_id");
        const sourceItems = Array.isArray(row.items) ? row.items : (Array.isArray(dynamicItems) ? dynamicItems : []);
        const mappedItems = mapChallanItemsToMirItems(sourceItems);
        const inspectionDate = row.inspection_date_time
          ? String(row.inspection_date_time).slice(0, 10)
          : "";
        const submissionDate = row.client_submission_date
          ? String(row.client_submission_date).slice(0, 10)
          : "";

        setForm({
          project_name: row.project_name || "",
          project_code: row.project_code || "",
          client_name: row.client_name || "",
          pmc: row.pmc || "",
          contractor: row.contractor || "",
          vendor_code: row.vendor_code || "",
          po_id: row.po_id != null ? String(row.po_id) : (dynamicPoId != null ? String(dynamicPoId) : ""),
          challan_no: row.challan_no || (typeof dynamicChallanNo === "string" ? dynamicChallanNo : ""),
          mir_refrence_no: row.mir_refrence_no || "",
          material_code: row.material_code || "",
          inspection_date_time: inspectionDate,
          client_submission_date: submissionDate,
          add_attachment: row.refrence_docs_attached || "",
          project_id: row.project_id != null ? Number(row.project_id) : (projectId ? Number(projectId) : ""),
          items: mappedItems,
        });
      } catch {
        toast({
          title: "Failed to load MIR",
          description: "Could not load MIR details.",
          variant: "destructive",
        });
      } finally {
        setLoadingMir(false);
      }
    };

    fetchMir();
  }, [mirId, projectId, toast]);

  const challanOptions = useMemo(() => {
    const seen = new Set();
    return challans.filter((row) => {
      const key = row?.challan_number;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [challans]);

  const handleChallanChange = async (value) => {
    const selected = challans.find((row) => row?.challan_number === value);
    let mappedItems = mapChallanItemsToMirItems(selected?.items);

    const needsPoEnrichment = mappedItems.some((item) => !item.hsn || !item.UOM);
    if (needsPoEnrichment && selected?.po_id) {
      try {
        const poRes = await api.getPoById(selected.po_id);
        if (poRes.success && poRes.data?.items) {
          mappedItems = enrichMirItemsFromPo(mappedItems, poRes.data.items);
        }
      } catch {
        // Keep challan-derived values if PO fetch fails.
      }
    } else if (needsPoEnrichment && form.po_id) {
      try {
        const poRes = await api.getPoById(form.po_id);
        if (poRes.success && poRes.data?.items) {
          mappedItems = enrichMirItemsFromPo(mappedItems, poRes.data.items);
        }
      } catch {
        // Keep challan-derived values if PO fetch fails.
      }
    } else if (needsPoEnrichment && projectId) {
      try {
        const recentPoRes = await api.getRecentPoByProject(projectId);
        if (recentPoRes.success && recentPoRes.data?.items) {
          mappedItems = enrichMirItemsFromPo(mappedItems, recentPoRes.data.items);
        }
      } catch {
        // Keep challan-derived values if latest PO fetch fails.
      }
    }

    setForm((prev) => ({
      ...prev,
      challan_no: value,
      items: mappedItems,
    }));
  };

  const handleCreateMir = async () => {
    if (!form.mir_refrence_no.trim()) {
      toast({
        title: "MIR reference required",
        description: "Please enter MIR reference number.",
        variant: "destructive",
      });
      return;
    }
    if (!form.challan_no.trim()) {
      toast({
        title: "Challan required",
        description: "Select a delivery challan before creating MIR.",
        variant: "destructive",
      });
      return;
    }
    if (form.po_id === "" || Number.isNaN(Number(form.po_id))) {
      toast({
        title: "PO required",
        description: "Select a valid PO ID before creating MIR.",
        variant: "destructive",
      });
      return;
    }

    const items = (form.items || []).map((item, index) => {
      const qty = toPayloadNumber(item.qty);
      const rate = toPayloadNumber(item.Rate);
      const amountValue = item.Amount === "" ? qty * rate : toPayloadNumber(item.Amount);
      return {
        srno: toPayloadNumber(item.srno || index + 1),
        hsn: String(item.hsn || ""),
        description: String(item.description || ""),
        qty,
        UOM: String(item.UOM || ""),
        Rate: rate,
        Amount: amountValue,
        remark: String(item.remark || ""),
        inspected: Boolean(item.inspected),
      };
    });

    const dynamicField = [];
    let projectIdValue = toPositiveInteger(form.project_id) ?? toPositiveInteger(projectId);

    try {
      setSubmitting(true);
      if (!isEditMode && !projectIdValue) {
        const poCheck = await api.getPoById(Number(form.po_id));
        if (!poCheck.success || !poCheck.data) {
          toast({
            title: "Invalid PO ID",
            description: "PO ID does not exist on server.",
            variant: "destructive",
          });
          return;
        }
        projectIdValue = toPositiveInteger(poCheck.data.project_id);
      }

      const payload = {
        project_name: form.project_name.trim(),
        project_code: form.project_code.trim(),
        client_name: form.client_name.trim(),
        pmc: form.pmc.trim(),
        contractor: form.contractor.trim(),
        vendor_code: form.vendor_code.trim(),
        challan_no: form.challan_no.trim(),
        mir_refrence_no: form.mir_refrence_no.trim(),
        material_code: form.material_code.trim(),
        inspection_date_time: form.inspection_date_time ? `${form.inspection_date_time}T00:00:00.000Z` : "",
        client_submission_date: form.client_submission_date || "",
        refrence_docs_attached: (form.add_attachment || "").trim(),
        mir_submited: true,
        dynamic_field: dynamicField,
        project_id: projectIdValue,
        po_id: Number(form.po_id),
        items,
      };

      const result = isEditMode ? await api.updateMir(mirId, payload) : await api.createMir(payload);
      if (!result.success) {
        console.error("MIR submit failed payload:", payload);
        toast({
          title: isEditMode ? "Failed to update MIR" : "Failed to create MIR",
          description: result.error || (isEditMode ? "Could not update MIR." : "Could not create MIR."),
          variant: "destructive",
        });
        return;
      }
      toast({
        title: isEditMode ? "MIR updated" : "MIR created",
        description: isEditMode ? "MIR updated successfully." : "New MIR record saved successfully.",
      });
      navigate(`/${projectId}/mir`);
    } catch {
      toast({
        title: isEditMode ? "Failed to update MIR" : "Failed to create MIR",
        description: isEditMode ? "Could not update MIR." : "Could not create MIR.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const uploadAttachmentFile = async (file) => {
    if (!file) return;
    try {
      setUploadingAttachment(true);
      const result = await api.uploadMirReference(file);
      if (!result.success || !result.data?.filePath) {
        toast({
          title: "Upload failed",
          description: result.error || "Could not upload attachment.",
          variant: "destructive",
        });
        return;
      }
      setForm((prev) => ({ ...prev, add_attachment: result.data.filePath }));
      toast({
        title: "Attachment uploaded",
        description: "File attached to MIR.",
      });
    } catch {
      toast({
        title: "Upload failed",
        description: "Could not upload attachment.",
        variant: "destructive",
      });
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleUploadAttachment = async (event) => {
    const file = event.target.files?.[0];
    await uploadAttachmentFile(file);
    event.target.value = "";
  };

  const handleAttachmentDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsAttachmentDragging(false);
    const file = event.dataTransfer?.files?.[0];
    await uploadAttachmentFile(file);
  };

  const toggleItemInspection = (index, checked) => {
    setForm((prev) => {
      const nextItems = [...(prev.items || [])];
      if (!nextItems[index]) return prev;
      nextItems[index] = { ...nextItems[index], inspected: !!checked };
      return { ...prev, items: nextItems };
    });
  };

  const toggleAllInspection = (checked) => {
    setForm((prev) => ({
      ...prev,
      items: (prev.items || []).map((item) => ({ ...item, inspected: !!checked })),
    }));
  };

  const inspectedCount = (form.items || []).filter((item) => item?.inspected).length;
  const allItemsInspected = (form.items || []).length > 0 && inspectedCount === (form.items || []).length;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-gradient-to-r from-cyan-50 via-sky-50 to-white p-6 md:p-8 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create MIR</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isEditMode ? "Edit material inspection request." : "Add a new material inspection request."}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate(`/${projectId}/mir`)} className="w-full lg:w-auto">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to MIR List
          </Button>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{isEditMode ? "Edit MIR" : "MIR Details"}</CardTitle>
          <CardDescription>Fill fields as per the MIR API payload.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingMir ? (
            <div className="py-8 text-center text-muted-foreground">
              <div className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading MIR...
              </div>
            </div>
          ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="project_name">Project Name</Label>
              <Input id="project_name" value={form.project_name} onChange={(event) => setForm((prev) => ({ ...prev, project_name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project_code">Project Code</Label>
              <Input id="project_code" value={form.project_code} onChange={(event) => setForm((prev) => ({ ...prev, project_code: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_name">Client Name</Label>
              <Input id="client_name" value={form.client_name} onChange={(event) => setForm((prev) => ({ ...prev, client_name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pmc">PMC</Label>
              <Input id="pmc" value={form.pmc} onChange={(event) => setForm((prev) => ({ ...prev, pmc: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractor">Contractor</Label>
              <Input id="contractor" value={form.contractor} onChange={(event) => setForm((prev) => ({ ...prev, contractor: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor_code">Vendor Code</Label>
              <Input id="vendor_code" value={form.vendor_code} onChange={(event) => setForm((prev) => ({ ...prev, vendor_code: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="po_id">PO ID</Label>
              <Select
                value={form.po_id || undefined}
                onValueChange={(value) => setForm((prev) => ({ ...prev, po_id: value }))}
              >
                <SelectTrigger id="po_id">
                  <SelectValue placeholder={projectPos.length ? "Select PO ID" : "No POs found"} />
                </SelectTrigger>
                <SelectContent>
                  {projectPos.map((po) => (
                    <SelectItem key={po.po_id} value={String(po.po_id)}>
                      {String(po.po_id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="challan_no">Challan No</Label>
              <Select value={form.challan_no || undefined} onValueChange={handleChallanChange}>
                <SelectTrigger id="challan_no">
                  <SelectValue placeholder={challanOptions.length ? "Select challan no" : "No challans found"} />
                </SelectTrigger>
                <SelectContent>
                  {challanOptions.map((row) => (
                    <SelectItem key={row.dc_id || row.challan_number} value={row.challan_number}>
                      {row.challan_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mir_refrence_no">MIR Reference No *</Label>
              <Input id="mir_refrence_no" value={form.mir_refrence_no} onChange={(event) => setForm((prev) => ({ ...prev, mir_refrence_no: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="material_code">Material Code</Label>
              <Input id="material_code" value={form.material_code} onChange={(event) => setForm((prev) => ({ ...prev, material_code: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspection_date_time">Inspection Date</Label>
              <Input id="inspection_date_time" type="date" value={form.inspection_date_time} onChange={(event) => setForm((prev) => ({ ...prev, inspection_date_time: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_submission_date">Client Submission Date</Label>
              <Input id="client_submission_date" type="date" value={form.client_submission_date} onChange={(event) => setForm((prev) => ({ ...prev, client_submission_date: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project_id">Project ID</Label>
              <Input id="project_id" type="number" value={form.project_id} onChange={(event) => setForm((prev) => ({ ...prev, project_id: event.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="add_attachment">Add Attachment</Label>
              <div
                className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center transition ${
                  isAttachmentDragging ? "border-primary bg-primary/5" : "border-muted-foreground/30"
                }`}
                onClick={() => attachmentInputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsAttachmentDragging(true);
                }}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsAttachmentDragging(true);
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setIsAttachmentDragging(false);
                  }
                }}
                onDrop={handleAttachmentDrop}
              >
                <Upload className="h-6 w-6 text-muted-foreground" />
                <div className="text-sm font-medium">Upload MIR Attachment</div>
                <div className="text-xs text-muted-foreground">Drag and drop or click to upload</div>
                <input
                  ref={attachmentInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleUploadAttachment}
                  disabled={uploadingAttachment}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingAttachment}
                  onClick={(event) => {
                    event.stopPropagation();
                    attachmentInputRef.current?.click();
                  }}
                >
                  {uploadingAttachment ? "Uploading..." : "Choose File"}
                </Button>
                {form.add_attachment ? (
                  <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
                    <div>Attachment added</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setForm((prev) => ({ ...prev, add_attachment: "" }));
                      }}
                    >
                      Remove File
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="space-y-3 md:col-span-2">
              <Label>Items</Label>
              {!form.challan_no ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Select a delivery challan to see the items.
                </div>
              ) : form.items.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No items found for the selected delivery challan.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sr No</TableHead>
                      <TableHead>HSN</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>UOM</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Remark</TableHead>
                      <TableHead>Inspected</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.items.map((item, index) => (
                      <TableRow key={`mir-item-row-${index}`}>
                        <TableCell>{item.srno}</TableCell>
                        <TableCell>{item.hsn || "-"}</TableCell>
                        <TableCell>{item.description || "-"}</TableCell>
                        <TableCell>{item.qty}</TableCell>
                        <TableCell>{item.UOM || "-"}</TableCell>
                        <TableCell>{item.Rate}</TableCell>
                        <TableCell>{item.Amount}</TableCell>
                        <TableCell>{item.remark || "-"}</TableCell>
                        <TableCell>
                          {allItemsInspected || item.inspected ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {form.challan_no && form.items.length > 0 ? (
                <div className="flex justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsInspectionOpen(true)}>
                    Inspection
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => navigate(`/${projectId}/mir`)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleCreateMir} disabled={submitting || loadingMir}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {isEditMode ? "Saving..." : "Creating..."}
                </>
              ) : (
                isEditMode ? "Save Changes" : "Create MIR"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isInspectionOpen} onOpenChange={setIsInspectionOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] h-[90vh] max-h-[95vh] sm:w-[95vw] sm:max-w-[95vw] sm:h-[90vh] sm:max-h-[95vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Inspection Checklist</DialogTitle>
            <DialogDescription>
              Review all items and tick each checkbox after inspection.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Done</TableHead>
                  <TableHead>Sr No</TableHead>
                  <TableHead>HSN</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Remark</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(form.items || []).map((item, index) => (
                  <TableRow key={`inspection-item-${index}`}>
                    <TableCell>
                      {allItemsInspected ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <input
                          type="checkbox"
                          checked={!!item.inspected}
                          onChange={(event) => toggleItemInspection(index, event.target.checked)}
                        />
                      )}
                    </TableCell>
                    <TableCell>{item.srno}</TableCell>
                    <TableCell>{item.hsn || "-"}</TableCell>
                    <TableCell>{item.description || "-"}</TableCell>
                    <TableCell>{item.qty}</TableCell>
                    <TableCell>{item.UOM || "-"}</TableCell>
                    <TableCell>{item.Rate}</TableCell>
                    <TableCell>{item.Amount}</TableCell>
                    <TableCell>{item.remark || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {inspectedCount} / {(form.items || []).length} items inspected
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => toggleAllInspection(true)}>
                Mark All
              </Button>
              <Button type="button" variant="outline" onClick={() => toggleAllInspection(false)}>
                Clear All
              </Button>
              <Button type="button" onClick={() => setIsInspectionOpen(false)}>
                Done
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
