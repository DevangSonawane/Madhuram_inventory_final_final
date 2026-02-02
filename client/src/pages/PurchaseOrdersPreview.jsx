import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Minus } from "lucide-react";
import { EMPTY_PO } from "@/pages/poShared";

const STORAGE_KEY = "poPreview";
const RECENT_KEY = "poRecent";

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

function InfoItem({ label, value }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-foreground">{value || "—"}</div>
    </div>
  );
}

export default function PurchaseOrdersPreview() {
  const navigate = useNavigate();
  const [poData, setPoData] = useState(() => normalizePoData(loadStoredPo()));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(poData));
    }
  }, [poData]);

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
    setSaving(true);
    try {
      const recent = loadRecentPos();
      const id = poData.orderNo || poData.indentNo || `PO-${Date.now()}`;
      const date = poData.poDate || poData.indentDate || new Date().toISOString().split('T')[0];
      const vendor = poData.vendor?.name || "";
      const payload = { ...poData };
      const nextRecent = [
        { id, date, vendor, totalAmount: poData.totalAmount, status: "Submitted", payload },
        ...recent.filter((item) => item.id !== id),
      ].slice(0, 25);
      saveRecentPos(nextRecent);
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
      navigate("/purchase-orders");
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
          <Button className="w-full sm:w-auto" onClick={handleSubmit} disabled={saving || !hasPreview}>
            {saving ? "Submitting..." : "Submit PO"}
          </Button>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.sessionStorage.removeItem(STORAGE_KEY);
              }
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
            <Input placeholder="Indent Date" value={poData.indentDate} onChange={(event) => setPoData((prev) => ({ ...prev, indentDate: event.target.value }))} />
            <Input placeholder="Order No" value={poData.orderNo} onChange={(event) => setPoData((prev) => ({ ...prev, orderNo: event.target.value }))} />
            <Input placeholder="PO Date" value={poData.poDate} onChange={(event) => setPoData((prev) => ({ ...prev, poDate: event.target.value }))} />
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
