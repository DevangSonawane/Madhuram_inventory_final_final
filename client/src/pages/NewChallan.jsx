import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Plus, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useProject } from "@/contexts/ProjectContext";
import { api } from "@/lib/api";

const NONE_VALUE = "__none__";
const EMPTY_ITEM = { name: "", description: "", width: "", length: "", quantity: "", price: "" };

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const mapPoItemsForPreview = (po) => {
  if (!Array.isArray(po?.items) || po.items.length === 0) {
    return [];
  }

  return po.items.map((item, index) => ({
    name: item?.name || item?.description || `Item ${index + 1}`,
    description: item?.description || item?.remarks || "",
    width: item?.width != null ? String(item.width) : "",
    length: item?.length != null ? String(item.length) : "",
    quantity: item?.quantity != null ? String(item.quantity) : (item?.qty != null ? String(item.qty) : ""),
    price: item?.price != null ? String(item.price) : (item?.rate != null ? String(item.rate) : "")
  }));
};

export default function NewChallan() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId: routeProjectId } = useParams();
  const { toast } = useToast();
  const { selectedProject } = useProject();
  const projectId = selectedProject?.project_id ?? selectedProject?.id ?? routeProjectId ?? null;
  const targetProjectId = projectId != null ? String(projectId) : String(routeProjectId || "");

  const [projectPos, setProjectPos] = useState([]);
  const [selectedPoItems, setSelectedPoItems] = useState([]);
  const [loadingPos, setLoadingPos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [poItemsExpanded, setPoItemsExpanded] = useState(false);
  const [form, setForm] = useState({
    challan_number: "",
    po_id: "",
    po_number: "",
    challan_date: "",
    work_order_number: "",
    order_date: "",
    items: [{ ...EMPTY_ITEM }]
  });

  useEffect(() => {
    if (!projectId) {
      setProjectPos([]);
      return;
    }

    const loadPos = async () => {
      setLoadingPos(true);
      try {
        const poRes = await api.getPosByProject(projectId);
        if (poRes.success && Array.isArray(poRes.data)) {
          setProjectPos(poRes.data);
        } else {
          setProjectPos([]);
        }
      } catch {
        setProjectPos([]);
      } finally {
        setLoadingPos(false);
      }
    };

    loadPos();
  }, [projectId]);

  useEffect(() => {
    const incomingItems = location.state?.deliveryItems;
    if (!Array.isArray(incomingItems) || incomingItems.length === 0) return;
    setForm((prev) => ({ ...prev, items: incomingItems }));
  }, [location.state]);

  const selectPo = (selected) => {
    if (!selected) {
      setForm((prev) => ({
        ...prev,
        po_id: "",
        po_number: "",
      }));
      setSelectedPoItems([]);
      return;
    }

    setForm((prev) => ({
      ...prev,
      po_id: selected.po_id != null ? String(selected.po_id) : "",
      po_number: selected.order_no || "",
    }));
    setSelectedPoItems(mapPoItemsForPreview(selected));
  };

  const handlePoNumberSelect = (value) => {
    if (value === NONE_VALUE) {
      selectPo(null);
      return;
    }

    const selected = value.startsWith("__poid__:")
      ? projectPos.find((po) => String(po.po_id) === value.replace("__poid__:", ""))
      : projectPos.find((po) => String(po.order_no) === String(value));

    selectPo(selected);
  };

  const handleViewInDetail = () => {
    if (!targetProjectId || selectedPoItems.length === 0) return;
    navigate(`/${targetProjectId}/challans/new/details`, {
      state: {
        poItems: selectedPoItems,
        deliveryItems: form.items,
        returnPath: `/${targetProjectId}/challans/new`
      }
    });
  };

  const updateItem = (index, field, value) => {
    setForm((prev) => {
      const next = { ...prev, items: [...prev.items] };
      next.items[index] = { ...next.items[index], [field]: value };
      return next;
    });
  };

  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, { ...EMPTY_ITEM }] }));
  };

  const removeItem = (index) => {
    setForm((prev) => {
      const nextItems = prev.items.filter((_, i) => i !== index);
      return { ...prev, items: nextItems.length > 0 ? nextItems : [{ ...EMPTY_ITEM }] };
    });
  };

  const goToChallans = () => {
    if (!targetProjectId) {
      navigate('/projects');
      return;
    }
    navigate(`/${targetProjectId}/challans`);
  };

  const handleCreate = async () => {
    if (!projectId) {
      toast({ title: "Select project", description: "Choose a project first.", variant: "destructive" });
      return;
    }

    const payload = {
      project_id: Number(projectId),
      challan_number: form.challan_number,
      items: form.items.map((it) => ({
        name: it.name,
        description: it.description,
        width: toNumber(it.width),
        length: toNumber(it.length),
        quantity: toNumber(it.quantity),
        price: toNumber(it.price)
      })),
      po_id: form.po_id ? Number(form.po_id) : undefined,
      po_number: form.po_number || undefined,
      challan_date: form.challan_date || undefined,
      work_order_number: form.work_order_number || undefined,
      order_date: form.order_date || undefined
    };

    setSaving(true);
    try {
      const res = await api.createDc(payload);
      if (res.success) {
        toast({ title: "Created", description: "Delivery challan saved." });
        goToChallans();
      } else {
        toast({ title: "Error", description: res.error || "Failed to create", variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Delivery Challan</h1>
          <p className="text-muted-foreground mt-2">Select PO, review PO items (view only), then add challan items.</p>
        </div>
        <Button variant="outline" onClick={goToChallans}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Challans
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Challan Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm">Challan Number</div>
              <Input className="h-11 text-base" value={form.challan_number} onChange={(e) => setForm((prev) => ({ ...prev, challan_number: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <div className="text-sm">PO Number</div>
              <Select value={form.po_number || NONE_VALUE} onValueChange={handlePoNumberSelect}>
                <SelectTrigger className="h-11 text-base">
                  <SelectValue placeholder={loadingPos ? "Loading PO..." : "Select PO Number"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>None</SelectItem>
                  {projectPos.map((po) => (
                    <SelectItem
                      key={`${po.po_id}-${po.order_no || "no-order"}`}
                      value={po.order_no ? String(po.order_no) : `__poid__:${po.po_id}`}
                    >
                      {po.order_no || `PO-${po.po_id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="text-sm">Challan Date</div>
              <Input className="h-11 text-base" type="date" value={form.challan_date} onChange={(e) => setForm((prev) => ({ ...prev, challan_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <div className="text-sm">Work Order Number</div>
              <Input className="h-11 text-base" value={form.work_order_number} onChange={(e) => setForm((prev) => ({ ...prev, work_order_number: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <div className="text-sm">Order Date</div>
              <Input className="h-11 text-base" type="date" value={form.order_date} onChange={(e) => setForm((prev) => ({ ...prev, order_date: e.target.value }))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="secondary"
          disabled={selectedPoItems.length === 0}
          onClick={handleViewInDetail}
        >
          View in Detail
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>PO Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Accordion
            type="single"
            collapsible
            value={poItemsExpanded ? "po-items" : undefined}
            onValueChange={(value) => setPoItemsExpanded(value === "po-items")}
          >
            <AccordionItem value="po-items">
              <AccordionTrigger className="justify-end py-2 hover:no-underline">
                <span className="sr-only">Toggle PO items</span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                {selectedPoItems.length > 0 ? (
                  <div className="hidden md:grid md:grid-cols-7 gap-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <div>Name</div>
                    <div className="md:col-span-2">Description</div>
                    <div>Width</div>
                    <div>Length</div>
                    <div>Quantity</div>
                    <div>Price</div>
                  </div>
                ) : null}
                {selectedPoItems.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    Select a PO to view linked PO items.
                  </div>
                ) : (
                  selectedPoItems.map((item, index) => (
                    <div key={`po-item-${index}`} className="grid grid-cols-1 gap-2 rounded-lg border bg-muted/20 p-3 md:grid-cols-7">
                      <div className="text-sm font-medium">{item.name || "-"}</div>
                      <div className="text-sm text-muted-foreground md:col-span-2">{item.description || "-"}</div>
                      <div className="text-sm">{item.width || "-"}</div>
                      <div className="text-sm">{item.length || "-"}</div>
                      <div className="text-sm">{item.quantity || "-"}</div>
                      <div className="text-sm">{item.price || "-"}</div>
                    </div>
                  ))
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Challan Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="hidden md:grid md:grid-cols-7 gap-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <div>Name</div>
            <div className="md:col-span-2">Description</div>
            <div>Width</div>
            <div>Length</div>
            <div>Quantity</div>
            <div>Price</div>
          </div>
          {form.items.map((item, index) => (
            <div
              key={index}
              className={`grid grid-cols-1 gap-2 md:grid-cols-7 ${index > 0 ? "border-t pt-3 md:border-t-0 md:pt-0" : ""}`}
            >
              <div className="text-xs font-medium text-muted-foreground md:hidden">Sr.No {index + 1}</div>
              <Input className="h-11 text-base" placeholder="Name" value={item.name} onChange={(e) => updateItem(index, 'name', e.target.value)} />
              <Textarea className="md:col-span-2 text-base" rows={2} placeholder="Description" value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} />
              <Input className="h-11 text-base" placeholder="Width" value={item.width} onChange={(e) => updateItem(index, 'width', e.target.value)} />
              <Input className="h-11 text-base" placeholder="Length" value={item.length} onChange={(e) => updateItem(index, 'length', e.target.value)} />
              <Input className="h-11 text-base" placeholder="Quantity" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} />
              <div className="flex gap-2">
                <Input className="h-11 text-base" placeholder="Price" value={item.price} onChange={(e) => updateItem(index, 'price', e.target.value)} />
                <Button variant="outline" size="icon" onClick={() => removeItem(index)}>
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-2 h-4 w-4" /> Add Item
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={goToChallans}>Cancel</Button>
        <Button onClick={handleCreate} disabled={saving || !form.challan_number || form.items.length === 0}>
          {saving ? "Saving..." : "Save Challan"}
        </Button>
      </div>
    </div>
  );
}
