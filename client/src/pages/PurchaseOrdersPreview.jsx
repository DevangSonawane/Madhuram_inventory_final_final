import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useProject } from "@/contexts/ProjectContext";
import { api } from "@/lib/api";
import { EMPTY_PO, normalizePoData } from "@/pages/poShared";

function InfoItem({ label, value }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-foreground">{value || "—"}</div>
    </div>
  );
}

const parseDecimalValue = (value) => {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).replace(/,/g, '').trim();
  if (normalized === '') return undefined;
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const normalizeDateForApi = (value) => {
  if (!value) return "";
  const raw = String(value).trim();
  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const dayFirstMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dayFirstMatch) {
    const [, day, month, year] = dayFirstMatch;
    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return raw;
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
  status: "created",
});

export default function PurchaseOrdersPreview() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId: routeProjectId } = useParams();
  const { toast } = useToast();
  const { selectedProject } = useProject();
  const projectId = selectedProject?.project_id ?? selectedProject?.id ?? routeProjectId ?? null;
  const [poData, setPoData] = useState(() => normalizePoData(location.state?.poData));
  const [editingPoId, setEditingPoId] = useState(() => location.state?.poId ?? location.state?.poData?.po_id ?? null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!location.state) return;
    if (location.state.poData) {
      const normalized = normalizePoData(location.state.poData);
      setPoData(normalized);
      setEditingPoId(location.state.poId ?? normalized.po_id ?? null);
    }
  }, [location.state]);

  const hasPreview = useMemo(() => {
    return poData.vendor?.name || poData.orderNo || poData.poDate || poData.totalAmount;
  }, [poData]);

  const updateVendor = (key, value) => {
    setPoData((prev) => ({
      ...prev,
      vendor: { ...prev.vendor, [key]: value },
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
    }));
  };

  const updateItem = (index, field, value) => {
    setPoData((prev) => {
      const nextItems = [...prev.items];
      nextItems[index] = { ...nextItems[index], [field]: value };
      return { ...prev, items: nextItems };
    });
  };

  const addItem = () => {
    setPoData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { srNo: String(prev.items.length + 1), hsnCode: "", description: "", qty: "", uom: "", rate: "", amount: "", remarks: "" },
      ],
    }));
  };

  const removeItem = (index) => {
    setPoData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    if (!projectId) {
      toast({ title: "Select project", description: "Choose a project before submitting a PO.", variant: "destructive" });
      return;
    }

    const numericProjectId = Number(projectId);
    if (Number.isNaN(numericProjectId)) {
      toast({ title: "Select project", description: "Invalid project selected.", variant: "destructive" });
      return;
    }

    const payload = buildPoPayload(poData, numericProjectId);
    setSaving(true);
    try {
      const response = editingPoId
        ? await api.updatePo(editingPoId, payload)
        : await api.createPo(payload);
      if (response.success) {
        const normalized = normalizePoData(response.data || {});
        toast({
          title: editingPoId ? "PO updated" : "PO submitted",
          description: editingPoId
            ? "Purchase order updated successfully."
            : "Purchase order saved successfully.",
        });
        setEditingPoId(normalized.po_id ?? editingPoId ?? null);
        navigate(`/${numericProjectId}/purchase-orders`);
      } else {
        toast({
          title: "Error",
          description: response.error || (editingPoId ? "Failed to update PO." : "Failed to submit PO."),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error?.message || (editingPoId ? "Failed to update PO." : "Failed to submit PO."),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Purchase Order Preview</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">Review extracted fields and finalize the purchase order.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button className="w-full sm:w-auto" onClick={handleSubmit} disabled={saving || !hasPreview || !projectId}>
            {saving ? (editingPoId ? "Updating..." : "Submitting...") : (editingPoId ? "Update PO" : "Submit PO")}
          </Button>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => {
              setPoData(EMPTY_PO);
              setEditingPoId(null);
              navigate(-1);
            }}
          >
            Remove PO
          </Button>
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Edit
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Header Details</CardTitle>
          <CardDescription>Company identifiers and basic metadata.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input placeholder="Company Name" value={poData.companyName} onChange={(event) => setPoData((prev) => ({ ...prev, companyName: event.target.value }))} />
            <Input placeholder="Company Subtitle" value={poData.companySubtitle} onChange={(event) => setPoData((prev) => ({ ...prev, companySubtitle: event.target.value }))} />
            <Input placeholder="Company Email" value={poData.companyEmail} onChange={(event) => setPoData((prev) => ({ ...prev, companyEmail: event.target.value }))} />
            <Input placeholder="Company GST No" value={poData.companyGstNo} onChange={(event) => setPoData((prev) => ({ ...prev, companyGstNo: event.target.value }))} />
            <Input placeholder="Indent No" value={poData.indentNo} onChange={(event) => setPoData((prev) => ({ ...prev, indentNo: event.target.value }))} />
            <Input type="date" placeholder="Indent Date" value={poData.indentDate} onChange={(event) => setPoData((prev) => ({ ...prev, indentDate: event.target.value }))} />
            <Input placeholder="Order No" value={poData.orderNo} onChange={(event) => setPoData((prev) => ({ ...prev, orderNo: event.target.value }))} />
            <Input type="date" placeholder="PO Date" value={poData.poDate} onChange={(event) => setPoData((prev) => ({ ...prev, poDate: event.target.value }))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vendor Details</CardTitle>
          <CardDescription>Recipient, contact, and delivery location.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input placeholder="Vendor Name" value={poData.vendor.name} onChange={(event) => updateVendor("name", event.target.value)} />
            <Input placeholder="Site" value={poData.vendor.site} onChange={(event) => updateVendor("site", event.target.value)} />
            <Input placeholder="Contact Person" value={poData.vendor.contactPerson} onChange={(event) => updateVendor("contactPerson", event.target.value)} />
            <Input placeholder="Vendor Address" value={poData.vendor.address} onChange={(event) => updateVendor("address", event.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input placeholder="Primary Contact Name" value={poData.vendor.contacts.primary.name} onChange={(event) => updateVendorContact("primary", "name", event.target.value)} />
            <Input placeholder="Primary Contact Phone" value={poData.vendor.contacts.primary.phone} onChange={(event) => updateVendorContact("primary", "phone", event.target.value)} />
            <Input placeholder="Secondary Contact Name" value={poData.vendor.contacts.secondary.name} onChange={(event) => updateVendorContact("secondary", "name", event.target.value)} />
            <Input placeholder="Secondary Contact Phone" value={poData.vendor.contacts.secondary.phone} onChange={(event) => updateVendorContact("secondary", "phone", event.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
          <CardDescription>Material lines and pricing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Line Items</div>
            <Button type="button" size="sm" variant="outline" onClick={addItem}>
              <Plus className="mr-2 h-3 w-3" /> Add Item
            </Button>
          </div>
          {poData.items.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground text-center">
              No items added yet.
            </div>
          ) : (
            poData.items.map((item, idx) => (
              <div key={`${item.srNo}-${idx}`} className="grid gap-2 sm:grid-cols-8 items-center">
                <Input className="sm:col-span-1" placeholder="Sr No" value={item.srNo} onChange={(event) => updateItem(idx, "srNo", event.target.value)} />
                <Input className="sm:col-span-1" placeholder="HSN" value={item.hsnCode} onChange={(event) => updateItem(idx, "hsnCode", event.target.value)} />
                <Input className="sm:col-span-2" placeholder="Description" value={item.description} onChange={(event) => updateItem(idx, "description", event.target.value)} />
                <Input className="sm:col-span-1" placeholder="Qty" value={item.qty} onChange={(event) => updateItem(idx, "qty", event.target.value)} />
                <Input className="sm:col-span-1" placeholder="UOM" value={item.uom} onChange={(event) => updateItem(idx, "uom", event.target.value)} />
                <Input className="sm:col-span-1" placeholder="Rate" value={item.rate} onChange={(event) => updateItem(idx, "rate", event.target.value)} />
                <div className="flex items-center gap-2 sm:col-span-1">
                  <Input placeholder="Amount" value={item.amount} onChange={(event) => updateItem(idx, "amount", event.target.value)} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
                <Input className="sm:col-span-8" placeholder="Remarks" value={item.remarks} onChange={(event) => updateItem(idx, "remarks", event.target.value)} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing & Terms</CardTitle>
          <CardDescription>Taxes, totals, notes, and delivery/payment terms.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input placeholder="Discount %" value={poData.discount.percent} onChange={(event) => setPoData((prev) => ({ ...prev, discount: { ...prev.discount, percent: event.target.value } }))} />
            <Input placeholder="Discount Amount" value={poData.discount.amount} onChange={(event) => setPoData((prev) => ({ ...prev, discount: { ...prev.discount, amount: event.target.value } }))} />
            <Input placeholder="After Discount Amount" value={poData.afterDiscountAmount} onChange={(event) => setPoData((prev) => ({ ...prev, afterDiscountAmount: event.target.value }))} />
            <Input placeholder="CGST %" value={poData.taxes.cgst.percent} onChange={(event) => setPoData((prev) => ({ ...prev, taxes: { ...prev.taxes, cgst: { ...prev.taxes.cgst, percent: event.target.value } } }))} />
            <Input placeholder="CGST Amount" value={poData.taxes.cgst.amount} onChange={(event) => setPoData((prev) => ({ ...prev, taxes: { ...prev.taxes, cgst: { ...prev.taxes.cgst, amount: event.target.value } } }))} />
            <Input placeholder="SGST %" value={poData.taxes.sgst.percent} onChange={(event) => setPoData((prev) => ({ ...prev, taxes: { ...prev.taxes, sgst: { ...prev.taxes.sgst, percent: event.target.value } } }))} />
            <Input placeholder="SGST Amount" value={poData.taxes.sgst.amount} onChange={(event) => setPoData((prev) => ({ ...prev, taxes: { ...prev.taxes, sgst: { ...prev.taxes.sgst, amount: event.target.value } } }))} />
            <Input placeholder="Total Amount" value={poData.totalAmount} onChange={(event) => setPoData((prev) => ({ ...prev, totalAmount: event.target.value }))} />
            <Input placeholder="Delivery" value={poData.summary.delivery} onChange={(event) => setPoData((prev) => ({ ...prev, summary: { ...prev.summary, delivery: event.target.value } }))} />
            <Input placeholder="Payment" value={poData.summary.payment} onChange={(event) => setPoData((prev) => ({ ...prev, summary: { ...prev.summary, payment: event.target.value } }))} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Textarea
              placeholder="Notes (one per line)"
              value={poData.notes.join("\n")}
              onChange={(event) => setPoData((prev) => ({ ...prev, notes: event.target.value.split(/\n+/).map((line) => line.trim()).filter(Boolean) }))}
            />
            <Textarea
              placeholder="Terms & Conditions (one per line)"
              value={poData.termsAndConditions.join("\n")}
              onChange={(event) => setPoData((prev) => ({ ...prev, termsAndConditions: event.target.value.split(/\n+/).map((line) => line.trim()).filter(Boolean) }))}
            />
          </div>
        </CardContent>
      </Card>

      {!hasPreview ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Upload or fill the form to see a structured preview here.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Quick Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <InfoItem label="PO No" value={poData.orderNo} />
              <InfoItem label="PO Date" value={poData.poDate} />
              <InfoItem label="Vendor" value={poData.vendor?.name} />
              <InfoItem label="Total Amount" value={poData.totalAmount} />
              <InfoItem label="Delivery" value={poData.summary?.delivery} />
              <InfoItem label="Payment" value={poData.summary?.payment} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
