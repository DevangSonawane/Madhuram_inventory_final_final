import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileUp, PencilLine, Plus, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useProject } from "@/contexts/ProjectContext";
import { api } from "@/lib/api";
import { EMPTY_PO, normalizePoData, sanitizeNumberInput, sanitizePhoneInput } from "@/pages/poShared";

function Field({ label, children, className = "" }) {
  return (
    <div className={`space-y-1 ${className}`.trim()}>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

const parseDecimalValue = (value) => {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).replace(/,/g, "").trim();
  if (normalized === "") return undefined;
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const normalizeDateForApi = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const inlineDayFirstMatch = raw.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (inlineDayFirstMatch) {
    const [, day, month, year] = inlineDayFirstMatch;
    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const inlineIsoMatch = raw.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (inlineIsoMatch) {
    const [, year, month, day] = inlineIsoMatch;
    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return null;
};

const buildItemPayloads = (items) => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item, index) => {
      const payload = {
        srno: item.srNo || item.srno || index + 1,
        hsn: item.hsnCode || item.hsn || "",
        description: item.description || "",
        qty: item.qty || item.quantity || "",
        UOM: item.uom || item.UOM || "",
        Rate: item.rate || item.Rate || "",
        Amount: item.amount || item.Amount || "",
        remark: item.remarks || item.remark || "",
      };
      const hasContent = payload.description || payload.hsn || payload.qty || payload.Rate || payload.Amount;
      return hasContent ? payload : null;
    })
    .filter(Boolean);
};

const buildPoPayload = (poData, projectId) => ({
  project_id: projectId,
  sample_id: poData.sampleId === "" ? undefined : Number(poData.sampleId),
  company_name: poData.companyName || "",
  company_subtitle: poData.companySubtitle || "",
  company_email: poData.companyEmail || "",
  company_gst: poData.companyGstNo || "",
  indent_no: poData.indentNo || "",
  indent_date: normalizeDateForApi(poData.indentDate),
  order_no: poData.orderNo || "",
  po_date: normalizeDateForApi(poData.poDate),
  vendor_name: poData.vendor.name || "",
  site: poData.vendor.site || "",
  contact_person: poData.vendor.contactPerson || "",
  vendor_address: poData.vendor.address || "",
  primary_contact_name: poData.vendor.contacts.primary.name || "",
  primary_contact_number: poData.vendor.contacts.primary.phone || "",
  secondary_contact_name: poData.vendor.contacts.secondary.name || "",
  secondary_contact_number: poData.vendor.contacts.secondary.phone || "",
  items: buildItemPayloads(poData.items),
  discount: parseDecimalValue(poData.discount.percent),
  discount_amount: parseDecimalValue(poData.discount.amount),
  after_discount: parseDecimalValue(poData.afterDiscountAmount),
  cgst: parseDecimalValue(poData.taxes.cgst.percent),
  cgst_amount: parseDecimalValue(poData.taxes.cgst.amount),
  sgst: parseDecimalValue(poData.taxes.sgst.percent),
  sgst_amount: parseDecimalValue(poData.taxes.sgst.amount),
  total_amount: parseDecimalValue(poData.totalAmount),
  delivery: poData.summary.delivery || "",
  payment: poData.summary.payment || "",
  notes: poData.notes.length ? poData.notes.join("\\n") : "",
  status: poData.status || "created",
});

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { toast } = useToast();
  const { selectedProject } = useProject();
  const projectId = selectedProject?.project_id ?? selectedProject?.id ?? null;
  const [poData, setPoData] = useState(EMPTY_PO);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recentPos, setRecentPos] = useState([]);
  const [loadingPos, setLoadingPos] = useState(false);
  const [sampleOptions, setSampleOptions] = useState([]);
  const [loadingSamples, setLoadingSamples] = useState(false);

  const selectedSampleMissing = Boolean(
    poData.sampleId && !sampleOptions.some((sample) => String(sample.sample_id || sample.id) === poData.sampleId)
  );

  useEffect(() => {
    if (!projectId) {
      setLoadingPos(false);
      setLoadingSamples(false);
      setSampleOptions([]);
      setRecentPos([]);
      return;
    }

    const fetchPos = async () => {
      setLoadingPos(true);
      setLoadingSamples(true);
      try {
        const result = await api.getPosByProject(projectId);
        if (result.success && Array.isArray(result.data)) {
          const uniqueSampleIds = [...new Set(
            result.data
              .map((po) => po?.sample_id)
              .filter((value) => value !== undefined && value !== null && value !== "")
              .map((value) => String(value))
          )];
          setSampleOptions(uniqueSampleIds.map((sampleId) => ({ sample_id: sampleId })));

          const mapped = result.data.map((record) => {
            const normalized = normalizePoData(record);
            const id = normalized.orderNo || `PO-${record.po_id || Date.now()}`;
            const date = normalized.poDate || normalized.indentDate || record.created_at || "";
            const vendorName = normalized.vendor?.name || "";
            const totalAmount = normalized.totalAmount || record.total_amount || "";
            const status = normalized.status || record.status || "created";
            return {
              id,
              date,
              vendor: vendorName,
              totalAmount,
              status,
              payload: normalized,
              po_id: record.po_id,
            };
          });
          setRecentPos(mapped);
        } else {
          if (result?.error) {
            toast({ title: "Error", description: result.error || "Failed to load purchase orders.", variant: "destructive" });
          }
          setSampleOptions([]);
          setRecentPos([]);
        }
      } catch (error) {
        toast({ title: "Error", description: error?.message || "Failed to load purchase orders.", variant: "destructive" });
        setSampleOptions([]);
        setRecentPos([]);
      } finally {
        setLoadingPos(false);
        setLoadingSamples(false);
      }
    };

    fetchPos();
  }, [projectId, toast]);

  const hasPreview = useMemo(() => {
    return poData.vendor?.name || poData.orderNo || poData.poDate || poData.totalAmount;
  }, [poData]);

  const toNumberOrNull = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const parsed = Number(String(value).replace(/,/g, "").trim());
    return Number.isNaN(parsed) ? null : parsed;
  };

  const formatCalculatedNumber = (value) => {
    const rounded = Math.round(value * 100) / 100;
    return String(rounded);
  };

  const recalculatePoAmounts = (
    nextPoData,
    { discountMode = "auto", cgstMode = "auto", sgstMode = "auto" } = {}
  ) => {
    const subtotal = (nextPoData.items || []).reduce((sum, item) => {
      const amount = toNumberOrNull(item.amount);
      return sum + (amount ?? 0);
    }, 0);

    const discountPercentInput = toNumberOrNull(nextPoData.discount?.percent);
    const discountAmountInput = toNumberOrNull(nextPoData.discount?.amount);

    let discountPercent = discountPercentInput;
    let discountAmount = 0;

    if (discountMode === "amount") {
      discountAmount = discountAmountInput ?? 0;
      discountPercent = subtotal > 0 ? (discountAmount * 100) / subtotal : undefined;
    } else if (discountMode === "percent") {
      discountAmount = discountPercentInput != null ? (subtotal * discountPercentInput) / 100 : 0;
    } else if (discountPercentInput != null) {
      discountAmount = (subtotal * discountPercentInput) / 100;
    } else if (discountAmountInput != null) {
      discountAmount = discountAmountInput;
      discountPercent = subtotal > 0 ? (discountAmount * 100) / subtotal : undefined;
    }

    const afterDiscountAmount = subtotal - discountAmount;

    const calculateTax = (tax, mode) => {
      const percentInput = toNumberOrNull(tax?.percent);
      const amountInput = toNumberOrNull(tax?.amount);

      if (mode === "amount") {
        const amount = amountInput ?? 0;
        const percent = afterDiscountAmount !== 0 ? (amount * 100) / afterDiscountAmount : undefined;
        return { percent, amount };
      }

      if (mode === "percent") {
        const percent = percentInput;
        const amount = percent != null ? (afterDiscountAmount * percent) / 100 : 0;
        return { percent, amount };
      }

      if (percentInput != null) {
        return { percent: percentInput, amount: (afterDiscountAmount * percentInput) / 100 };
      }

      if (amountInput != null) {
        return {
          amount: amountInput,
          percent: afterDiscountAmount !== 0 ? (amountInput * 100) / afterDiscountAmount : undefined,
        };
      }

      return { percent: undefined, amount: 0 };
    };

    const cgst = calculateTax(nextPoData.taxes?.cgst, cgstMode);
    const sgst = calculateTax(nextPoData.taxes?.sgst, sgstMode);
    const totalAmount = afterDiscountAmount + cgst.amount + sgst.amount;

    const toValue = (value) => (value != null ? formatCalculatedNumber(value) : "");

    return {
      ...nextPoData,
      subtotalAmount: subtotal > 0 ? formatCalculatedNumber(subtotal) : "",
      discount: {
        ...nextPoData.discount,
        percent: toValue(discountPercent),
        amount: discountAmount > 0 ? formatCalculatedNumber(discountAmount) : "",
      },
      afterDiscountAmount: subtotal > 0 ? formatCalculatedNumber(afterDiscountAmount) : "",
      taxes: {
        ...nextPoData.taxes,
        cgst: {
          ...nextPoData.taxes.cgst,
          percent: toValue(cgst.percent),
          amount: cgst.amount > 0 ? formatCalculatedNumber(cgst.amount) : "",
        },
        sgst: {
          ...nextPoData.taxes.sgst,
          percent: toValue(sgst.percent),
          amount: sgst.amount > 0 ? formatCalculatedNumber(sgst.amount) : "",
        },
      },
      totalAmount: totalAmount > 0 ? formatCalculatedNumber(totalAmount) : "",
    };
  };

  const updateVendor = (key, value) => {
    setPoData((prev) => ({
      ...prev,
      vendor: { ...prev.vendor, [key]: value },
      source: "Manual",
    }));
  };

  const updateVendorContact = (key, field, value) => {
    const nextValue = field === "phone" ? sanitizePhoneInput(value) : value;
    setPoData((prev) => ({
      ...prev,
      vendor: {
        ...prev.vendor,
        contacts: {
          ...prev.vendor.contacts,
          [key]: { ...prev.vendor.contacts[key], [field]: nextValue },
        },
      },
      source: "Manual",
    }));
  };

  const updateItem = (index, field, value) => {
    const numericIntegerFields = new Set(["srNo"]);
    const numericDecimalFields = new Set(["qty", "rate", "amount"]);
    const nextValue = numericIntegerFields.has(field)
      ? sanitizeNumberInput(value, { allowDecimal: false })
      : numericDecimalFields.has(field)
        ? sanitizeNumberInput(value)
        : value;
    setPoData((prev) => {
      const nextItems = [...prev.items];
      const nextItem = { ...nextItems[index], [field]: nextValue };

      if (field === "qty" || field === "rate") {
        const qty = Number(nextItem.qty);
        const rate = Number(nextItem.rate);
        const hasQty = nextItem.qty !== "" && !Number.isNaN(qty);
        const hasRate = nextItem.rate !== "" && !Number.isNaN(rate);
        nextItem.amount = hasQty && hasRate ? String(qty * rate) : "";
      }

      nextItems[index] = nextItem;
      return recalculatePoAmounts({ ...prev, items: nextItems, source: "Manual" });
    });
  };

  const addItem = () => {
    setPoData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { srNo: String(prev.items.length + 1), hsnCode: "", description: "", qty: "", uom: "", rate: "", amount: "", remarks: "" },
      ],
      source: "Manual",
    }));
  };

  const removeItem = (index) => {
    setPoData((prev) => {
      const nextItems = prev.items.filter((_, i) => i !== index);
      return recalculatePoAmounts({ ...prev, items: nextItems, source: "Manual" });
    });
  };

  const handleFile = async (file) => {
    if (!file) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      toast({ title: "Invalid file", description: "Please upload a PO PDF file.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const result = await api.parsePoFile(file);
      if (!result.success) {
        throw new Error(result.error || "Could not parse PO document.");
      }

      const parsedPayload = result?.data?.data || {};
      const normalized = normalizePoData(parsedPayload);
      const next = {
        ...normalized,
        source: "Extracted",
        sourceFileName: result?.data?.filename || file.name,
      };

      const recalculated = recalculatePoAmounts(next);
      setPoData(recalculated);
      navigate("preview", { state: { poData: recalculated, mode: "create" } });
    } catch (error) {
      toast({ title: "Upload failed", description: error?.message || "Could not extract PO document.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const [file] = Array.from(event.dataTransfer.files || []);
    handleFile(file);
  };

  const handleSubmitPo = async () => {
    if (!projectId) {
      toast({ title: "Select project", description: "Choose a project before submitting a PO.", variant: "destructive" });
      return;
    }

    if (!poData.sampleId) {
      toast({ title: "Select sample", description: "Sample ID is required for purchase order.", variant: "destructive" });
      return;
    }

    const numericProjectId = Number(projectId);
    if (Number.isNaN(numericProjectId)) {
      toast({ title: "Select project", description: "Invalid project selected.", variant: "destructive" });
      return;
    }

    const payload = buildPoPayload(poData, numericProjectId);
    setSubmitting(true);
    try {
      const response = await api.createPo(payload);
      if (response.success) {
        toast({ title: "PO submitted", description: "Purchase order saved successfully." });
        setPoData(EMPTY_PO);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        const result = await api.getPosByProject(numericProjectId);
        if (result.success && Array.isArray(result.data)) {
          const mapped = result.data.map((record) => {
            const normalized = normalizePoData(record);
            const id = normalized.orderNo || `PO-${record.po_id || Date.now()}`;
            const date = normalized.poDate || normalized.indentDate || record.created_at || "";
            const vendorName = normalized.vendor?.name || "";
            const totalAmount = normalized.totalAmount || record.total_amount || "";
            const status = normalized.status || record.status || "created";
            return {
              id,
              date,
              vendor: vendorName,
              totalAmount,
              status,
              payload: normalized,
              po_id: record.po_id,
            };
          });
          setRecentPos(mapped);
        }
      } else {
        toast({ title: "Error", description: response.error || "Failed to submit PO.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: error?.message || "Failed to submit PO.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    setPoData(EMPTY_PO);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeleteRecent = async (item) => {
    if (!item) return;
    if (!item.po_id) {
      setRecentPos((prev) => prev.filter((entry) => entry.id !== item.id));
      return;
    }

    try {
      const res = await api.deletePo(item.po_id);
      if (res.success) {
        toast({ title: "PO deleted", description: "Purchase order removed successfully." });
        setRecentPos((prev) => prev.filter((entry) => entry.po_id !== item.po_id));
      } else {
        toast({ title: "Error", description: res.error || "Failed to delete purchase order.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: error?.message || "Failed to delete purchase order.", variant: "destructive" });
    }
  };

  const handleEditRecent = (item) => {
    if (!item?.payload) return;
    const normalized = normalizePoData(item.payload);
    const recalculated = recalculatePoAmounts(normalized);
    setPoData(recalculated);
    navigate("preview", {
      state: {
        poData: recalculated,
        poId: item.po_id ?? recalculated.po_id ?? null,
        mode: "edit",
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">Upload and manage purchase orders.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create / Extract PO</CardTitle>
          <CardDescription>Upload a PO file for extraction or fill the form manually.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="upload" className="gap-2">
                <FileUp className="h-4 w-4" /> Upload & Extract
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-2">
                <PencilLine className="h-4 w-4" /> Manual Entry
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload">
              <div
                className={`mt-4 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center transition ${
                  isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/30"
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <Upload className="h-6 w-6 text-muted-foreground" />
                <div className="text-sm font-medium">Upload Madhuram PO PDF</div>
                <div className="text-xs text-muted-foreground">Drag and drop or click to upload</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(event) => handleFile(event.target.files?.[0])}
                  disabled={uploading}
                />
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  disabled={uploading}
                  onClick={(event) => {
                    event.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  {uploading ? "Please wait" : "Choose PDF"}
                </Button>
                {poData.sourceFileName ? (
                  <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
                    <div>Selected: {poData.sourceFileName}</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleClear();
                      }}
                    >
                      Remove File
                    </Button>
                  </div>
                ) : null}
              </div>
            </TabsContent>

            <TabsContent value="manual">
              <div className="manual-entry-panel">
                <div className="manual-entry-grid sm:grid-cols-2">
                  <Field label="Sample ID">
                    <Select
                      value={poData.sampleId || undefined}
                      onValueChange={(value) => setPoData((prev) => ({ ...prev, sampleId: value, source: "Manual" }))}
                      disabled={!projectId || loadingSamples}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={projectId ? (loadingSamples ? "Loading samples..." : "Select sample (required)") : "Select project first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedSampleMissing ? (
                          <SelectItem value={poData.sampleId}>Sample #{poData.sampleId} (current)</SelectItem>
                        ) : null}
                        {sampleOptions.map((sample) => {
                          const id = String(sample.sample_id || sample.id);
                          const label = sample.work_done || sample.site_name || sample.building_name || `Sample #${id}`;
                          return (
                            <SelectItem key={id} value={id}>
                              {`#${id} - ${label}`}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Company Name">
                    <Input value={poData.companyName} onChange={(event) => setPoData((prev) => ({ ...prev, companyName: event.target.value, source: "Manual" }))} />
                  </Field>
                  <Field label="Company Subtitle">
                    <Input value={poData.companySubtitle} onChange={(event) => setPoData((prev) => ({ ...prev, companySubtitle: event.target.value, source: "Manual" }))} />
                  </Field>
                  <Field label="Company Email">
                    <Input value={poData.companyEmail} onChange={(event) => setPoData((prev) => ({ ...prev, companyEmail: event.target.value, source: "Manual" }))} />
                  </Field>
                  <Field label="Company GST No">
                    <Input
                      type="text"
                      value={poData.companyGstNo}
                      onChange={(event) => setPoData((prev) => ({ ...prev, companyGstNo: event.target.value, source: "Manual" }))}
                    />
                  </Field>
                  <Field label="Indent No">
                    <Input
                      type="text"
                      value={poData.indentNo}
                      onChange={(event) => setPoData((prev) => ({ ...prev, indentNo: event.target.value, source: "Manual" }))}
                    />
                  </Field>
                  <Field label="Indent Date">
                    <Input type="date" value={poData.indentDate} onChange={(event) => setPoData((prev) => ({ ...prev, indentDate: event.target.value, source: "Manual" }))} />
                  </Field>
                  <Field label="Order No">
                    <Input
                      type="text"
                      value={poData.orderNo}
                      onChange={(event) => setPoData((prev) => ({ ...prev, orderNo: event.target.value, source: "Manual" }))}
                    />
                  </Field>
                  <Field label="PO Date">
                    <Input type="date" value={poData.poDate} onChange={(event) => setPoData((prev) => ({ ...prev, poDate: event.target.value, source: "Manual" }))} />
                  </Field>
                </div>

                <div className="manual-entry-grid sm:grid-cols-2">
                  <Field label="Vendor Name">
                    <Input value={poData.vendor.name} onChange={(event) => updateVendor("name", event.target.value)} />
                  </Field>
                  <Field label="Site">
                    <Input value={poData.vendor.site} onChange={(event) => updateVendor("site", event.target.value)} />
                  </Field>
                  <Field label="Contact Person">
                    <Input value={poData.vendor.contactPerson} onChange={(event) => updateVendor("contactPerson", event.target.value)} />
                  </Field>
                  <Field label="Vendor Address">
                    <Input value={poData.vendor.address} onChange={(event) => updateVendor("address", event.target.value)} />
                  </Field>
                </div>

                <div className="manual-entry-grid sm:grid-cols-2">
                  <Field label="Primary Contact Name">
                    <Input value={poData.vendor.contacts.primary.name} onChange={(event) => updateVendorContact("primary", "name", event.target.value)} />
                  </Field>
                  <Field label="Primary Contact Phone">
                    <Input type="tel" inputMode="numeric" maxLength={15} value={poData.vendor.contacts.primary.phone} onChange={(event) => updateVendorContact("primary", "phone", event.target.value)} />
                  </Field>
                  <Field label="Secondary Contact Name">
                    <Input value={poData.vendor.contacts.secondary.name} onChange={(event) => updateVendorContact("secondary", "name", event.target.value)} />
                  </Field>
                  <Field label="Secondary Contact Phone">
                    <Input type="tel" inputMode="numeric" maxLength={15} value={poData.vendor.contacts.secondary.phone} onChange={(event) => updateVendorContact("secondary", "phone", event.target.value)} />
                  </Field>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Items</div>
                    <Button type="button" size="sm" variant="outline" onClick={addItem}>
                      <Plus className="mr-2 h-3 w-3" /> Add Item
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {poData.items.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground text-center">
                        No items added yet.
                      </div>
                    ) : (
                      <>
                        <div className="hidden sm:grid sm:grid-cols-8 gap-2 text-xs font-medium text-muted-foreground px-1">
                          <div>Sr No</div>
                          <div>HSN</div>
                          <div className="sm:col-span-2">Description</div>
                          <div>Qty</div>
                          <div>UOM</div>
                          <div>Rate</div>
                          <div>Amount</div>
                        </div>
                        {poData.items.map((item, idx) => (
                          <div key={`${item.srNo}-${idx}`} className="space-y-3 rounded-lg border border-border/70 bg-card/60 p-3 sm:p-4">
                            <div className="grid gap-2 sm:grid-cols-8 items-center">
                              <Input
                                type="number"
                                inputMode="numeric"
                                step="1"
                                className="sm:col-span-1"
                                value={item.srNo}
                                onChange={(event) => updateItem(idx, "srNo", event.target.value)}
                              />
                              <Input
                                type="text"
                                inputMode="numeric"
                                className="sm:col-span-1"
                                value={item.hsnCode}
                                onChange={(event) => updateItem(idx, "hsnCode", sanitizeNumberInput(event.target.value, { allowDecimal: false }))}
                              />
                              <Input
                                className="sm:col-span-2"
                                value={item.description}
                                onChange={(event) => updateItem(idx, "description", event.target.value)}
                              />
                              <Input
                                type="number"
                                inputMode="decimal"
                                step="any"
                                className="sm:col-span-1"
                                value={item.qty}
                                onChange={(event) => updateItem(idx, "qty", event.target.value)}
                              />
                              <Input
                                className="sm:col-span-1"
                                value={item.uom}
                                onChange={(event) => updateItem(idx, "uom", event.target.value)}
                              />
                              <Input
                                type="number"
                                inputMode="decimal"
                                step="any"
                                className="sm:col-span-1"
                                value={item.rate}
                                onChange={(event) => updateItem(idx, "rate", event.target.value)}
                              />
                              <div className="flex items-center gap-2 sm:col-span-1">
                                <Input
                                  type="number"
                                  inputMode="decimal"
                                  step="any"
                                  value={item.amount}
                                  readOnly
                                />
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                                  <Minus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <Field label="Remarks">
                              <Textarea
                                placeholder="Add notes for this line item"
                                value={item.remarks}
                                onChange={(event) => updateItem(idx, "remarks", event.target.value)}
                                rows={2}
                                className="resize-y"
                              />
                            </Field>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                <div className="manual-entry-grid sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Discount %">
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      value={poData.discount.percent}
                      onChange={(event) =>
                        setPoData((prev) =>
                          recalculatePoAmounts({
                            ...prev,
                            discount: { ...prev.discount, percent: sanitizeNumberInput(event.target.value) },
                            source: "Manual",
                          }, { discountMode: "percent" })
                        )
                      }
                    />
                  </Field>
                  <Field label="Discount Amount">
                    <Input type="number" inputMode="decimal" step="any" value={poData.discount.amount} readOnly />
                  </Field>
                  <Field label="After Discount Amount">
                    <Input type="number" inputMode="decimal" step="any" value={poData.afterDiscountAmount} readOnly />
                  </Field>
                  <div className="space-y-3 rounded-lg border border-border/70 bg-card/60 p-3 sm:col-span-2 lg:col-span-3">
                    <div className="grid gap-3">
                      <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr_1fr] items-center gap-2">
                        <div className="text-xs font-medium text-muted-foreground">CGST</div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-14">% </span>
                          <Input
                            type="number"
                            inputMode="decimal"
                            step="any"
                            value={poData.taxes.cgst.percent}
                            onChange={(event) =>
                              setPoData((prev) =>
                                recalculatePoAmounts({
                                  ...prev,
                                  taxes: { ...prev.taxes, cgst: { ...prev.taxes.cgst, percent: sanitizeNumberInput(event.target.value) } },
                                  source: "Manual",
                                }, { cgstMode: "percent" })
                              )
                            }
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-14">Amount</span>
                          <Input
                            type="number"
                            inputMode="decimal"
                            step="any"
                            value={poData.taxes.cgst.amount}
                            onChange={(event) =>
                              setPoData((prev) =>
                                recalculatePoAmounts({
                                  ...prev,
                                  taxes: { ...prev.taxes, cgst: { ...prev.taxes.cgst, amount: sanitizeNumberInput(event.target.value) } },
                                  source: "Manual",
                                }, { cgstMode: "amount" })
                              )
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr_1fr] items-center gap-2">
                        <div className="text-xs font-medium text-muted-foreground">SGST</div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-14">% </span>
                          <Input
                            type="number"
                            inputMode="decimal"
                            step="any"
                            value={poData.taxes.sgst.percent}
                            onChange={(event) =>
                              setPoData((prev) =>
                                recalculatePoAmounts({
                                  ...prev,
                                  taxes: { ...prev.taxes, sgst: { ...prev.taxes.sgst, percent: sanitizeNumberInput(event.target.value) } },
                                  source: "Manual",
                                }, { sgstMode: "percent" })
                              )
                            }
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-14">Amount</span>
                          <Input
                            type="number"
                            inputMode="decimal"
                            step="any"
                            value={poData.taxes.sgst.amount}
                            onChange={(event) =>
                              setPoData((prev) =>
                                recalculatePoAmounts({
                                  ...prev,
                                  taxes: { ...prev.taxes, sgst: { ...prev.taxes.sgst, amount: sanitizeNumberInput(event.target.value) } },
                                  source: "Manual",
                                }, { sgstMode: "amount" })
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <Field label="Total Amount">
                    <Input type="number" inputMode="decimal" step="any" value={poData.totalAmount} readOnly />
                  </Field>
                  <Field label="Delivery">
                    <Input value={poData.summary.delivery} onChange={(event) => setPoData((prev) => ({ ...prev, summary: { ...prev.summary, delivery: event.target.value }, source: "Manual" }))} />
                  </Field>
                  <Field label="Payment">
                    <Input value={poData.summary.payment} onChange={(event) => setPoData((prev) => ({ ...prev, summary: { ...prev.summary, payment: event.target.value }, source: "Manual" }))} />
                  </Field>
                </div>

                <div className="manual-entry-grid sm:grid-cols-2">
                  <Field label="Notes (one per line)">
                    <Textarea
                      value={poData.notes.join("\n")}
                      onChange={(event) => setPoData((prev) => ({ ...prev, notes: event.target.value.split(/\n+/).map((line) => line.trim()).filter(Boolean), source: "Manual" }))}
                    />
                  </Field>
                  <Field label="Terms & Conditions (one per line)">
                    <Textarea
                      value={poData.termsAndConditions.join("\n")}
                      onChange={(event) => setPoData((prev) => ({ ...prev, termsAndConditions: event.target.value.split(/\n+/).map((line) => line.trim()).filter(Boolean), source: "Manual" }))}
                    />
                  </Field>
                </div>

                <div className="manual-entry-actions">
                  <Button onClick={handleSubmitPo} className="w-full sm:w-auto" disabled={submitting || !poData.sampleId}>
                    {submitting ? "Submitting..." : "Submit PO"}
                  </Button>
                  {!hasPreview ? (
                    <div className="text-xs text-muted-foreground sm:self-center">
                      Add PO details and submit directly.
                    </div>
                  ) : null}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {recentPos.map((item) => (
              <div key={item.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{item.id}</div>
                    <div className="text-xs text-muted-foreground">{item.date}</div>
                  </div>
                  <Badge variant={item.status === "Submitted" ? "default" : "secondary"}>{item.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm border-t pt-2">
                  <div className="col-span-2">
                    <div className="text-muted-foreground text-xs">Vendor</div>
                    <div>{item.vendor}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-muted-foreground text-xs">Total</div>
                    <div>{item.totalAmount || "—"}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditRecent(item)}>
                    <PencilLine className="mr-2 h-4 w-4" /> Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteRecent(item)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            {loadingPos ? (
              <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                Loading purchase orders...
              </div>
            ) : recentPos.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                No purchase orders found. Upload or submit a PO to see it here.
              </div>
            ) : null}
          </div>

          <Table className="hidden md:table">
            <TableHeader>
              <TableRow>
                <TableHead>PO No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentPos.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.id}</TableCell>
                  <TableCell>{item.date}</TableCell>
                  <TableCell>{item.vendor}</TableCell>
                  <TableCell>{item.totalAmount || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === "Submitted" ? "default" : "secondary"}>{item.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditRecent(item)}>
                        <PencilLine className="mr-2 h-3 w-3" /> Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteRecent(item)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {loadingPos ? (
            <div className="hidden md:block rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              Loading purchase orders...
            </div>
          ) : recentPos.length === 0 ? (
            <div className="hidden md:block rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              No purchase orders found. Upload or submit a PO to see it here.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
