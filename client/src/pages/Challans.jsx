import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Truck, Search, CheckCircle, AlertTriangle, Plus, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useProject } from "@/contexts/ProjectContext";
import { api } from "@/lib/api";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NONE_VALUE = "__none__";

export default function Challans() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { selectedProject } = useProject();
  const projectId = selectedProject?.project_id ?? selectedProject?.id ?? null;
  const [dcs, setDcs] = useState([]);
  const [projectPos, setProjectPos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    challan_number: "",
    po_id: "",
    po_number: "",
    challan_date: "",
    work_order_number: "",
    order_date: "",
    items: [{ name: "", description: "", width: "", length: "", quantity: "", price: "" }]
  });

  useEffect(() => {
    if (!projectId) {
      setDcs([]);
      setProjectPos([]);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const [dcsRes, poRes] = await Promise.all([
          api.getDcsByProject(projectId),
          api.getPosByProject(projectId)
        ]);
        if (dcsRes.success && Array.isArray(dcsRes.data)) {
          setDcs(dcsRes.data);
        } else {
          setDcs([]);
        }
        if (poRes.success && Array.isArray(poRes.data)) {
          setProjectPos(poRes.data);
        } else {
          setProjectPos([]);
        }
      } catch {
        setDcs([]);
        setProjectPos([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId]);

  const handlePoIdSelect = (value) => {
    if (value === NONE_VALUE) {
      setForm((prev) => ({ ...prev, po_id: "", po_number: "" }));
      return;
    }
    const selected = projectPos.find((po) => String(po.po_id) === String(value));
    setForm((prev) => ({
      ...prev,
      po_id: value,
      po_number: selected?.order_no || ""
    }));
  };

  const handlePoNumberSelect = (value) => {
    if (value === NONE_VALUE) {
      setForm((prev) => ({ ...prev, po_id: "", po_number: "" }));
      return;
    }
    const selected = value.startsWith("__poid__:")
      ? projectPos.find((po) => String(po.po_id) === value.replace("__poid__:", ""))
      : projectPos.find((po) => String(po.order_no) === String(value));
    setForm((prev) => ({
      ...prev,
      po_number: selected?.order_no || "",
      po_id: selected?.po_id != null ? String(selected.po_id) : prev.po_id
    }));
  };

  const pendingCount = useMemo(() => dcs.filter((x) => x.status === "incomplete").length, [dcs]);
  const verifiedCount = useMemo(() => dcs.filter((x) => x.status === "completed").length, [dcs]);
  const totalCount = useMemo(() => dcs.length, [dcs]);

  const updateItem = (index, field, value) => {
    setForm((prev) => {
      const next = { ...prev, items: [...prev.items] };
      next.items[index] = { ...next.items[index], [field]: value };
      return next;
    });
  };

  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, { name: "", description: "", width: "", length: "", quantity: "", price: "" }] }));
  };

  const removeItem = (index) => {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
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
        width: Number(it.width) || 0,
        length: Number(it.length) || 0,
        quantity: Number(it.quantity) || 0,
        price: Number(it.price) || 0
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
        setOpen(false);
        setForm({
          challan_number: "",
          po_id: "",
          po_number: "",
          challan_date: "",
          work_order_number: "",
          order_date: "",
          items: [{ name: "", description: "", width: "", length: "", quantity: "", price: "" }]
        });
        const refreshed = await api.getDcsByProject(projectId);
        if (refreshed.success && Array.isArray(refreshed.data)) {
          setDcs(refreshed.data);
        }
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
          <h1 className="text-3xl font-bold tracking-tight">Delivery Challans</h1>
          <p className="text-muted-foreground mt-2">Create and track delivery challans.</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setOpen(true)}>
          <Truck className="mr-2 h-4 w-4" /> Record New Delivery
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{verifiedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 space-y-0">
          <CardTitle>Challan History</CardTitle>
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search challan no, vendor..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm w-full"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Challan No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>PO No</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Counts</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dcs
                  .filter((x) => {
                    const term = searchTerm.trim().toLowerCase();
                    if (!term) return true;
                    const a = x.challan_number || '';
                    const b = x.po_number || '';
                    return a.toLowerCase().includes(term) || b.toLowerCase().includes(term);
                  })
                  .map((dc) => (
                  <TableRow key={dc.dc_id}>
                    <TableCell className="font-medium">{dc.challan_number}</TableCell>
                    <TableCell>{dc.challan_date || dc.order_date || dc.created_at}</TableCell>
                    <TableCell className="text-xs font-mono">{dc.po_number || dc.po_id || ''}</TableCell>
                    <TableCell>{Array.isArray(dc.items) ? dc.items.map((it) => it.name).filter(Boolean).join(', ') : ''}</TableCell>
                    <TableCell className="text-right">
                      {(dc.total_po_items ?? '—')} / {dc.total_challan_items ?? 0}
                    </TableCell>
                    <TableCell>
                      <Badge variant={dc.status === "completed" ? "default" : "secondary"}>
                        {dc.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid grid-cols-1 gap-4 md:hidden">
            {dcs.map((dc) => (
              <Card key={dc.dc_id} className="border shadow-none">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{dc.challan_number}</div>
                      <div className="text-xs text-muted-foreground">{dc.challan_date || dc.order_date || dc.created_at}</div>
                    </div>
                    <Badge variant={dc.status === "completed" ? "default" : "secondary"}>
                      {dc.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-muted-foreground text-xs">PO Ref</div>
                      <div className="font-mono text-xs">{dc.po_number || dc.po_id || ''}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Items</div>
                      <div className="truncate">{Array.isArray(dc.items) ? dc.items.map((it) => it.name).filter(Boolean).join(', ') : ''}</div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm">View</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95vw] max-w-5xl">
          <DialogHeader>
            <DialogTitle>Record New Delivery</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm">Challan Number</div>
                <Input className="h-11 text-base" value={form.challan_number} onChange={(e) => setForm((prev) => ({ ...prev, challan_number: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <div className="text-sm">PO ID</div>
                <Select value={form.po_id || NONE_VALUE} onValueChange={handlePoIdSelect}>
                  <SelectTrigger className="h-11 text-base">
                    <SelectValue placeholder="Select PO ID" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>None</SelectItem>
                    {projectPos.map((po) => (
                      <SelectItem key={po.po_id} value={String(po.po_id)}>
                        {po.po_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-sm">PO Number</div>
                <Select value={form.po_number || NONE_VALUE} onValueChange={handlePoNumberSelect}>
                  <SelectTrigger className="h-11 text-base">
                    <SelectValue placeholder="Select PO Number" />
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
            <div className="space-y-2">
              <div className="text-sm font-medium">Items</div>
              <div className="space-y-3">
                {form.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-2">
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
              </div>
              <Button variant="outline" size="sm" onClick={addItem} className="mt-2">
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving || !form.challan_number || form.items.length === 0}>
                {saving ? "Saving..." : "Save Challan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
