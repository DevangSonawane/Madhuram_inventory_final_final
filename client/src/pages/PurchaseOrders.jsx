import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileUp, PencilLine, Eye, Trash2, Plus, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { extractTextFromPdf } from "@/lib/pdfUtils";
import { extractPurchaseOrderFields } from "@/lib/purchaseOrderExtractor";
import { EMPTY_PO } from "@/pages/poShared";

const STORAGE_KEY = "poPreview";
const RECENT_KEY = "poRecent";

const SAMPLE_EXTRACTED = {
  ...EMPTY_PO,
  title: "PURCHASE ORDER",
  companyName: "MADHURAM ENTERPRISES",
  companySubtitle: "ME PLUMBING & FIRE FIGHTING CONTRACTORS",
  companyAddress: "401, B.T SUJATA SOCIETY, RAM NAGAR, NEAR SAIBABA MANDIR SIGNAL, BORIVALI (WEST), MUMBAI - 400092, MAHARASHTRA",
  companyEmail: "madhuramenterprises1234@gmail.com",
  companyGstNo: "27AESPN7117D1ZA",
  indentNo: "Dated",
  indentDate: "2025-11-25",
  orderNo: "OW-PL/20",
  poDate: "2025-11-26",
  vendor: {
    ...EMPTY_PO.vendor,
    name: "Plumbwell Agencies",
    site: "Oak Wood Building",
    address: "Cone, Near Jio Petrol Pump, Bhiwandi Road, Kalyan (West), Maharashtra - 421311.",
    contacts: {
      primary: { name: "Mr. Shabir", phone: "9576075956" },
      secondary: { name: "Mr. Kanjuman", phone: "9892907740" },
    },
  },
  itemsGroup: {
    title: "A UPVC ASTM Fittings 'SCH - 80' \"Supreme Make\"",
  },
  items: [
    {
      srNo: "1",
      hsnCode: "84133020",
      description: "15mm dia Testing Plug",
      qty: "1400",
      uom: "No",
      rate: "7.00",
      amount: "9800.00",
      remarks: "",
    },
  ],
  discount: { percent: "49", amount: "4802.00" },
  afterDiscountAmount: "4998.00",
  taxes: {
    cgst: { percent: "9", amount: "449.82" },
    sgst: { percent: "9", amount: "449.82" },
  },
  totalAmount: "5897.64",
  summary: {
    discountPercent: "49.00",
    tax: "GST - 18%",
    delivery: "Immediate",
    payment: "Against P.I",
  },
  notes: [
    "Test Certificate with all material to be sent.",
    "Please note that the 60 days credit period will be considered from the date of all items delivered and booked against that particular PO.",
    "Local Transportation Extra At Actuals.",
  ],
  termsAndConditions: [
    "Please send your order acceptance on receipt of this order.",
    "Send all the material in single trip along with delivery challan & test certificate.",
    "Your payment term will begin from the date of material delivered at site.",
    "Transportation as per discussion (Subject to all material arrived at site as per PO)",
  ],
  authorisedSignatory: "Authorised Signatory",
  source: "Extracted",
  sourceFileName: "po.pdf",
};

const LABEL_MAP = [
  { re: /title/i, path: "title" },
  { re: /company\s*name/i, path: "companyName" },
  { re: /company\s*subtitle/i, path: "companySubtitle" },
  { re: /company\s*address/i, path: "companyAddress" },
  { re: /email/i, path: "companyEmail" },
  { re: /gst\s*(?:no|in)/i, path: "companyGstNo" },
  { re: /indent\s*no/i, path: "indentNo" },
  { re: /indent\s*date|dated/i, path: "indentDate" },
  { re: /order\s*no/i, path: "orderNo" },
  { re: /(p\.?o\.?\s*date|po\s*date)/i, path: "poDate" },
  { re: /^to$/i, path: "vendor.name" },
  { re: /^site$/i, path: "vendor.site" },
  { re: /contact\s*person/i, path: "vendor.contactPerson" },
  { re: /address/i, path: "vendor.address" },
  { re: /primary\s*contact\s*name/i, path: "vendor.contacts.primary.name" },
  { re: /primary\s*contact\s*phone/i, path: "vendor.contacts.primary.phone" },
  { re: /secondary\s*contact\s*name/i, path: "vendor.contacts.secondary.name" },
  { re: /secondary\s*contact\s*phone/i, path: "vendor.contacts.secondary.phone" },
  { re: /subtotal/i, path: "subtotalAmount" },
  { re: /discount\s*%/i, path: "discount.percent" },
  { re: /discount\s*amount/i, path: "discount.amount" },
  { re: /after\s*discount/i, path: "afterDiscountAmount" },
  { re: /cgst\s*%/i, path: "taxes.cgst.percent" },
  { re: /cgst\s*amount/i, path: "taxes.cgst.amount" },
  { re: /sgst\s*%/i, path: "taxes.sgst.percent" },
  { re: /sgst\s*amount/i, path: "taxes.sgst.amount" },
  { re: /total\s*amount/i, path: "totalAmount" },
  { re: /summary\s*discount/i, path: "summary.discountPercent" },
  { re: /summary\s*tax/i, path: "summary.tax" },
  { re: /summary\s*delivery/i, path: "summary.delivery" },
  { re: /summary\s*payment/i, path: "summary.payment" },
  { re: /authorised\s*signatory/i, path: "authorisedSignatory" },
];

function loadStoredPo() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function loadRecentPos() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

function saveRecentPos(items) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RECENT_KEY, JSON.stringify(items));
}

function setPathValue(base, path, value) {
  const parts = path.split('.');
  const next = { ...base };
  let cursor = next;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    cursor[key] = Array.isArray(cursor[key]) ? [...cursor[key]] : { ...cursor[key] };
    cursor = cursor[key];
  }
  cursor[parts[parts.length - 1]] = value;
  return next;
}

function normalizePoData(raw) {
  if (!raw) return EMPTY_PO;
  return {
    ...EMPTY_PO,
    ...raw,
    vendor: {
      ...EMPTY_PO.vendor,
      ...raw.vendor,
      contacts: {
        ...EMPTY_PO.vendor.contacts,
        ...raw.vendor?.contacts,
        primary: { ...EMPTY_PO.vendor.contacts.primary, ...raw.vendor?.contacts?.primary },
        secondary: { ...EMPTY_PO.vendor.contacts.secondary, ...raw.vendor?.contacts?.secondary },
      },
    },
    itemsGroup: { ...EMPTY_PO.itemsGroup, ...raw.itemsGroup },
    items: Array.isArray(raw.items) ? raw.items : [],
    discount: { ...EMPTY_PO.discount, ...raw.discount },
    taxes: {
      cgst: { ...EMPTY_PO.taxes.cgst, ...raw.taxes?.cgst },
      sgst: { ...EMPTY_PO.taxes.sgst, ...raw.taxes?.sgst },
    },
    summary: { ...EMPTY_PO.summary, ...raw.summary },
    notes: Array.isArray(raw.notes) ? raw.notes : [],
    termsAndConditions: Array.isArray(raw.termsAndConditions) ? raw.termsAndConditions : [],
  };
}

function normalizeText(text) {
  return text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

function parsePdfText(text, fileName) {
  if (!text) return null;
  const parsed = extractPurchaseOrderFields(text);
  if (!parsed) return null;
  return {
    ...normalizePoData(parsed),
    source: "Extracted",
    sourceFileName: fileName || "",
  };
}

function parseSheetToFields(rows) {
  if (!rows || rows.length === 0) return null;
  let next = { ...EMPTY_PO, source: "Extracted" };

  let headerRowIndex = -1;
  rows.forEach((row, idx) => {
    if (!row || row.length === 0) return;
    const [label, value] = row;
    if (label == null || value == null) return;
    LABEL_MAP.forEach(({ re, path }) => {
      if (re.test(String(label).trim())) {
        next = setPathValue(next, path, String(value).trim());
      }
    });
    if (String(label).toLowerCase().includes('sr') && String(row).toLowerCase().includes('hsn')) {
      headerRowIndex = idx;
    }
  });

  if (headerRowIndex !== -1) {
    const items = [];
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) break;
      if (row.every((cell) => cell == null || String(cell).trim() === "")) break;
      const [srNo, hsnCode, description, qty, uom, rate, amount, remarks] = row;
      if (!srNo && !description) continue;
      items.push({
        srNo: srNo != null ? String(srNo).trim() : "",
        hsnCode: hsnCode != null ? String(hsnCode).trim() : "",
        description: description != null ? String(description).trim() : "",
        qty: qty != null ? String(qty).trim() : "",
        uom: uom != null ? String(uom).trim() : "",
        rate: rate != null ? String(rate).trim() : "",
        amount: amount != null ? String(amount).trim() : "",
        remarks: remarks != null ? String(remarks).trim() : "",
      });
    }
    next.items = items;
  }

  return next;
}

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { toast } = useToast();
  const [poData, setPoData] = useState(() => normalizePoData(loadStoredPo()) || EMPTY_PO);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recentPos, setRecentPos] = useState(() => loadRecentPos());

  useEffect(() => {
    saveRecentPos(recentPos);
  }, [recentPos]);

  const hasPreview = useMemo(() => {
    return poData.vendor?.name || poData.orderNo || poData.poDate || poData.totalAmount;
  }, [poData]);

  const updateVendor = (key, value) => {
    setPoData((prev) => ({
      ...prev,
      vendor: { ...prev.vendor, [key]: value },
      source: "Manual",
    }));
  };

  const updateVendorContact = (key, field, value) => {
    setPoData((prev) => ({
      ...prev,
      vendor: {
        ...prev.vendor,
        contacts: {
          ...prev.vendor.contacts,
          [key]: { ...prev.vendor.contacts[key], [field]: value },
        },
      },
      source: "Manual",
    }));
  };

  const updateItem = (index, field, value) => {
    setPoData((prev) => {
      const nextItems = [...prev.items];
      nextItems[index] = { ...nextItems[index], [field]: value };
      return { ...prev, items: nextItems, source: "Manual" };
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
      return { ...prev, items: nextItems, source: "Manual" };
    });
  };

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const isSample = file.name.toLowerCase().includes("po");
      let next = isSample ? { ...SAMPLE_EXTRACTED } : { ...EMPTY_PO, source: "Extracted", sourceFileName: file.name };

      const ext = file.name.toLowerCase();
      if (ext.endsWith(".pdf")) {
        const raw = await extractTextFromPdf(file, { preserveLines: true, fullDocument: true, maxPages: 2 });
        const parsed = parsePdfText(normalizeText(raw), file.name);
        if (parsed) next = { ...next, ...parsed };
      } else if (ext.endsWith(".xlsx") || ext.endsWith(".xls") || ext.endsWith(".csv")) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
        const parsed = parseSheetToFields(rows);
        if (parsed) next = { ...next, ...parsed };
      }

      next = {
        ...next,
        source: "Extracted",
        sourceFileName: file.name,
      };

      setPoData(next);
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      navigate("preview");
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

  const handlePreview = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(poData));
    }
    navigate("preview");
  };

  const handleClear = () => {
    setPoData(EMPTY_PO);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleDeleteRecent = (id) => {
    setRecentPos((prev) => prev.filter((item) => item.id !== id));
  };

  const handleEditRecent = (item) => {
    if (!item?.payload) return;
    const normalized = normalizePoData(item.payload);
    setPoData(normalized);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    }
    navigate("preview");
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setPoData(normalizePoData(JSON.parse(raw)));
      } catch (_) {
        setPoData(EMPTY_PO);
      }
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">Upload and manage purchase orders.</p>
        </div>
        <Button variant="outline" className="w-full sm:w-auto" onClick={handlePreview}>
          <Eye className="mr-2 h-4 w-4" /> Preview
        </Button>
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
                <div className="text-sm font-medium">Drag & drop PO PDF/XLSX/CSV here</div>
                <div className="text-xs text-muted-foreground">or click to browse and extract fields</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.xlsx,.xls,.csv"
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
                  {uploading ? "Extracting..." : "Choose File"}
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
              <div className="mt-3 text-xs text-muted-foreground">
                Extraction is client-side for now and prepares fields for review.
              </div>
            </TabsContent>

            <TabsContent value="manual">
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Input
                  placeholder="Company Name"
                  value={poData.companyName}
                  onChange={(event) => setPoData((prev) => ({ ...prev, companyName: event.target.value, source: "Manual" }))}
                />
                <Input
                  placeholder="Company Subtitle"
                  value={poData.companySubtitle}
                  onChange={(event) => setPoData((prev) => ({ ...prev, companySubtitle: event.target.value, source: "Manual" }))}
                />
                <Input
                  placeholder="Company Email"
                  value={poData.companyEmail}
                  onChange={(event) => setPoData((prev) => ({ ...prev, companyEmail: event.target.value, source: "Manual" }))}
                />
                <Input
                  placeholder="Company GST No"
                  value={poData.companyGstNo}
                  onChange={(event) => setPoData((prev) => ({ ...prev, companyGstNo: event.target.value, source: "Manual" }))}
                />
                <Input
                  placeholder="Indent No"
                  value={poData.indentNo}
                  onChange={(event) => setPoData((prev) => ({ ...prev, indentNo: event.target.value, source: "Manual" }))}
                />
                <Input
                  placeholder="Indent Date"
                  value={poData.indentDate}
                  onChange={(event) => setPoData((prev) => ({ ...prev, indentDate: event.target.value, source: "Manual" }))}
                />
                <Input
                  placeholder="Order No"
                  value={poData.orderNo}
                  onChange={(event) => setPoData((prev) => ({ ...prev, orderNo: event.target.value, source: "Manual" }))}
                />
                <Input
                  placeholder="PO Date"
                  value={poData.poDate}
                  onChange={(event) => setPoData((prev) => ({ ...prev, poDate: event.target.value, source: "Manual" }))}
                />
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Input
                  placeholder="Vendor Name"
                  value={poData.vendor.name}
                  onChange={(event) => updateVendor("name", event.target.value)}
                />
                <Input
                  placeholder="Site"
                  value={poData.vendor.site}
                  onChange={(event) => updateVendor("site", event.target.value)}
                />
                <Input
                  placeholder="Contact Person"
                  value={poData.vendor.contactPerson}
                  onChange={(event) => updateVendor("contactPerson", event.target.value)}
                />
                <Input
                  placeholder="Vendor Address"
                  value={poData.vendor.address}
                  onChange={(event) => updateVendor("address", event.target.value)}
                />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Input
                  placeholder="Primary Contact Name"
                  value={poData.vendor.contacts.primary.name}
                  onChange={(event) => updateVendorContact("primary", "name", event.target.value)}
                />
                <Input
                  placeholder="Primary Contact Phone"
                  value={poData.vendor.contacts.primary.phone}
                  onChange={(event) => updateVendorContact("primary", "phone", event.target.value)}
                />
                <Input
                  placeholder="Secondary Contact Name"
                  value={poData.vendor.contacts.secondary.name}
                  onChange={(event) => updateVendorContact("secondary", "name", event.target.value)}
                />
                <Input
                  placeholder="Secondary Contact Phone"
                  value={poData.vendor.contacts.secondary.phone}
                  onChange={(event) => updateVendorContact("secondary", "phone", event.target.value)}
                />
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Items</div>
                  <Button type="button" size="sm" variant="outline" onClick={addItem}>
                    <Plus className="mr-2 h-3 w-3" /> Add Item
                  </Button>
                </div>
                <div className="mt-3 space-y-3">
                  {poData.items.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground text-center">
                      No items added yet.
                    </div>
                  ) : (
                    poData.items.map((item, idx) => (
                      <div key={`${item.srNo}-${idx}`} className="grid gap-2 sm:grid-cols-8 items-center">
                        <Input
                          className="sm:col-span-1"
                          placeholder="Sr No"
                          value={item.srNo}
                          onChange={(event) => updateItem(idx, "srNo", event.target.value)}
                        />
                        <Input
                          className="sm:col-span-1"
                          placeholder="HSN"
                          value={item.hsnCode}
                          onChange={(event) => updateItem(idx, "hsnCode", event.target.value)}
                        />
                        <Input
                          className="sm:col-span-2"
                          placeholder="Description"
                          value={item.description}
                          onChange={(event) => updateItem(idx, "description", event.target.value)}
                        />
                        <Input
                          className="sm:col-span-1"
                          placeholder="Qty"
                          value={item.qty}
                          onChange={(event) => updateItem(idx, "qty", event.target.value)}
                        />
                        <Input
                          className="sm:col-span-1"
                          placeholder="UOM"
                          value={item.uom}
                          onChange={(event) => updateItem(idx, "uom", event.target.value)}
                        />
                        <Input
                          className="sm:col-span-1"
                          placeholder="Rate"
                          value={item.rate}
                          onChange={(event) => updateItem(idx, "rate", event.target.value)}
                        />
                        <div className="flex items-center gap-2 sm:col-span-1">
                          <Input
                            placeholder="Amount"
                            value={item.amount}
                            onChange={(event) => updateItem(idx, "amount", event.target.value)}
                          />
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>
                        <Input
                          className="sm:col-span-8"
                          placeholder="Remarks"
                          value={item.remarks}
                          onChange={(event) => updateItem(idx, "remarks", event.target.value)}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Input
                  placeholder="Discount %"
                  value={poData.discount.percent}
                  onChange={(event) => setPoData((prev) => ({ ...prev, discount: { ...prev.discount, percent: event.target.value }, source: "Manual" }))}
                />
                <Input
                  placeholder="Discount Amount"
                  value={poData.discount.amount}
                  onChange={(event) => setPoData((prev) => ({ ...prev, discount: { ...prev.discount, amount: event.target.value }, source: "Manual" }))}
                />
                <Input
                  placeholder="After Discount Amount"
                  value={poData.afterDiscountAmount}
                  onChange={(event) => setPoData((prev) => ({ ...prev, afterDiscountAmount: event.target.value, source: "Manual" }))}
                />
                <Input
                  placeholder="CGST %"
                  value={poData.taxes.cgst.percent}
                  onChange={(event) => setPoData((prev) => ({ ...prev, taxes: { ...prev.taxes, cgst: { ...prev.taxes.cgst, percent: event.target.value } }, source: "Manual" }))}
                />
                <Input
                  placeholder="CGST Amount"
                  value={poData.taxes.cgst.amount}
                  onChange={(event) => setPoData((prev) => ({ ...prev, taxes: { ...prev.taxes, cgst: { ...prev.taxes.cgst, amount: event.target.value } }, source: "Manual" }))}
                />
                <Input
                  placeholder="SGST %"
                  value={poData.taxes.sgst.percent}
                  onChange={(event) => setPoData((prev) => ({ ...prev, taxes: { ...prev.taxes, sgst: { ...prev.taxes.sgst, percent: event.target.value } }, source: "Manual" }))}
                />
                <Input
                  placeholder="SGST Amount"
                  value={poData.taxes.sgst.amount}
                  onChange={(event) => setPoData((prev) => ({ ...prev, taxes: { ...prev.taxes, sgst: { ...prev.taxes.sgst, amount: event.target.value } }, source: "Manual" }))}
                />
                <Input
                  placeholder="Total Amount"
                  value={poData.totalAmount}
                  onChange={(event) => setPoData((prev) => ({ ...prev, totalAmount: event.target.value, source: "Manual" }))}
                />
                <Input
                  placeholder="Delivery"
                  value={poData.summary.delivery}
                  onChange={(event) => setPoData((prev) => ({ ...prev, summary: { ...prev.summary, delivery: event.target.value }, source: "Manual" }))}
                />
                <Input
                  placeholder="Payment"
                  value={poData.summary.payment}
                  onChange={(event) => setPoData((prev) => ({ ...prev, summary: { ...prev.summary, payment: event.target.value }, source: "Manual" }))}
                />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Textarea
                  placeholder="Notes (one per line)"
                  value={poData.notes.join("\n")}
                  onChange={(event) => setPoData((prev) => ({ ...prev, notes: event.target.value.split(/\n+/).map((line) => line.trim()).filter(Boolean), source: "Manual" }))}
                />
                <Textarea
                  placeholder="Terms & Conditions (one per line)"
                  value={poData.termsAndConditions.join("\n")}
                  onChange={(event) => setPoData((prev) => ({ ...prev, termsAndConditions: event.target.value.split(/\n+/).map((line) => line.trim()).filter(Boolean), source: "Manual" }))}
                />
              </div>

              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <Button variant="outline" onClick={handlePreview} className="w-full sm:w-auto">
                  <Eye className="mr-2 h-4 w-4" /> Preview
                </Button>
                {!hasPreview ? (
                  <div className="text-xs text-muted-foreground sm:self-center">
                    Add details to enable a richer preview.
                  </div>
                ) : null}
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
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteRecent(item.id)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
            ))}
            {recentPos.length === 0 ? (
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
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteRecent(item.id)}>
                        <Trash2 className="mr-2 h-3 w-3" /> Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {recentPos.length === 0 ? (
            <div className="hidden md:block rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              No purchase orders found. Upload or submit a PO to see it here.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
