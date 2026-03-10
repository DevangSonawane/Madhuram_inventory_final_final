import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileUp, PencilLine, Eye, Plus, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useProject } from "@/contexts/ProjectContext";
import { api } from "@/lib/api";
import { EMPTY_PO, normalizePoData } from "@/pages/poShared";

function Field({ label, children, className = "" }) {
  return (
    <div className={`space-y-1 ${className}`.trim()}>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { toast } = useToast();
  const { selectedProject } = useProject();
  const projectId = selectedProject?.project_id ?? selectedProject?.id ?? null;
  const [poData, setPoData] = useState(EMPTY_PO);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recentPos, setRecentPos] = useState([]);
  const [loadingPos, setLoadingPos] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setLoadingPos(false);
      setRecentPos([]);
      return;
    }

    const fetchPos = async () => {
      setLoadingPos(true);
      try {
        const result = await api.getPosByProject(projectId);
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
        } else {
          if (result?.error) {
            toast({ title: "Error", description: result.error || "Failed to load purchase orders.", variant: "destructive" });
          }
          setRecentPos([]);
        }
      } catch (error) {
        toast({ title: "Error", description: error?.message || "Failed to load purchase orders.", variant: "destructive" });
        setRecentPos([]);
      } finally {
        setLoadingPos(false);
      }
    };

    fetchPos();
  }, [projectId, toast]);

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

      setPoData(next);
      navigate("preview", { state: { poData: next, mode: "create" } });
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
    navigate("preview", {
      state: {
        poData,
        poId: poData?.po_id ?? null,
        mode: poData?.po_id ? "edit" : "create",
      },
    });
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
    setPoData(normalized);
    navigate("preview", {
      state: {
        poData: normalized,
        poId: item.po_id ?? normalized.po_id ?? null,
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
                    <Input value={poData.companyGstNo} onChange={(event) => setPoData((prev) => ({ ...prev, companyGstNo: event.target.value, source: "Manual" }))} />
                  </Field>
                  <Field label="Indent No">
                    <Input value={poData.indentNo} onChange={(event) => setPoData((prev) => ({ ...prev, indentNo: event.target.value, source: "Manual" }))} />
                  </Field>
                  <Field label="Indent Date">
                    <Input value={poData.indentDate} onChange={(event) => setPoData((prev) => ({ ...prev, indentDate: event.target.value, source: "Manual" }))} />
                  </Field>
                  <Field label="Order No">
                    <Input value={poData.orderNo} onChange={(event) => setPoData((prev) => ({ ...prev, orderNo: event.target.value, source: "Manual" }))} />
                  </Field>
                  <Field label="PO Date">
                    <Input value={poData.poDate} onChange={(event) => setPoData((prev) => ({ ...prev, poDate: event.target.value, source: "Manual" }))} />
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
                    <Input value={poData.vendor.contacts.primary.phone} onChange={(event) => updateVendorContact("primary", "phone", event.target.value)} />
                  </Field>
                  <Field label="Secondary Contact Name">
                    <Input value={poData.vendor.contacts.secondary.name} onChange={(event) => updateVendorContact("secondary", "name", event.target.value)} />
                  </Field>
                  <Field label="Secondary Contact Phone">
                    <Input value={poData.vendor.contacts.secondary.phone} onChange={(event) => updateVendorContact("secondary", "phone", event.target.value)} />
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
                        <div key={`${item.srNo}-${idx}`} className="grid gap-2 sm:grid-cols-8 items-center">
                          <Input
                            className="sm:col-span-1"
                            value={item.srNo}
                            onChange={(event) => updateItem(idx, "srNo", event.target.value)}
                          />
                          <Input
                            className="sm:col-span-1"
                            value={item.hsnCode}
                            onChange={(event) => updateItem(idx, "hsnCode", event.target.value)}
                          />
                          <Input
                            className="sm:col-span-2"
                            value={item.description}
                            onChange={(event) => updateItem(idx, "description", event.target.value)}
                          />
                          <Input
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
                            className="sm:col-span-1"
                            value={item.rate}
                            onChange={(event) => updateItem(idx, "rate", event.target.value)}
                          />
                          <div className="flex items-center gap-2 sm:col-span-1">
                            <Input
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
                        ))}
                      </>
                    )}
                  </div>
                </div>

                <div className="manual-entry-grid sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Discount %">
                    <Input value={poData.discount.percent} onChange={(event) => setPoData((prev) => ({ ...prev, discount: { ...prev.discount, percent: event.target.value }, source: "Manual" }))} />
                  </Field>
                  <Field label="Discount Amount">
                    <Input value={poData.discount.amount} onChange={(event) => setPoData((prev) => ({ ...prev, discount: { ...prev.discount, amount: event.target.value }, source: "Manual" }))} />
                  </Field>
                  <Field label="After Discount Amount">
                    <Input value={poData.afterDiscountAmount} onChange={(event) => setPoData((prev) => ({ ...prev, afterDiscountAmount: event.target.value, source: "Manual" }))} />
                  </Field>
                  <Field label="CGST %">
                    <Input value={poData.taxes.cgst.percent} onChange={(event) => setPoData((prev) => ({ ...prev, taxes: { ...prev.taxes, cgst: { ...prev.taxes.cgst, percent: event.target.value } }, source: "Manual" }))} />
                  </Field>
                  <Field label="CGST Amount">
                    <Input value={poData.taxes.cgst.amount} onChange={(event) => setPoData((prev) => ({ ...prev, taxes: { ...prev.taxes, cgst: { ...prev.taxes.cgst, amount: event.target.value } }, source: "Manual" }))} />
                  </Field>
                  <Field label="SGST %">
                    <Input value={poData.taxes.sgst.percent} onChange={(event) => setPoData((prev) => ({ ...prev, taxes: { ...prev.taxes, sgst: { ...prev.taxes.sgst, percent: event.target.value } }, source: "Manual" }))} />
                  </Field>
                  <Field label="SGST Amount">
                    <Input value={poData.taxes.sgst.amount} onChange={(event) => setPoData((prev) => ({ ...prev, taxes: { ...prev.taxes, sgst: { ...prev.taxes.sgst, amount: event.target.value } }, source: "Manual" }))} />
                  </Field>
                  <Field label="Total Amount">
                    <Input value={poData.totalAmount} onChange={(event) => setPoData((prev) => ({ ...prev, totalAmount: event.target.value, source: "Manual" }))} />
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
                  <Button variant="outline" onClick={handlePreview} className="w-full sm:w-auto">
                    <Eye className="mr-2 h-4 w-4" /> Preview
                  </Button>
                  {!hasPreview ? (
                    <div className="text-xs text-muted-foreground sm:self-center">
                      Add details to enable a richer preview.
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
