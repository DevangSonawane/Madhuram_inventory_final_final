import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProject } from '@/contexts/ProjectContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { Search, RefreshCw, Plus, Pencil } from 'lucide-react';

function normalizeInventory(it) {
  return {
    id: it.inventory_id || it.id,
    inventory_id: it.inventory_id || it.id,
    project_id: it.project_id,
    brand: it.brand,
    quantity: Number(it.quantity) || 0,
    name: it.name,
    price: Number(it.price) || 0,
    stockin: Boolean(it.stockin),
    created_at: it.created_at,
    updated_at: it.updated_at,
  };
}

const EMPTY_FORM = { brand: '', name: '', quantity: '', price: '', stockin: true };

export default function Inventory() {
  const { toast } = useToast();
  const { projectId: routeProjectId } = useParams();
  const { selectedProject } = useProject();
  const projectId = selectedProject?.id ?? selectedProject?.project_id ?? routeProjectId ?? null;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStock, setFilterStock] = useState("all"); // all | in | out
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      let res;
      if (projectId) {
        res = await api.getInventoriesByProject(projectId);
      } else {
        res = await api.getInventories();
      }
      if (res.success && Array.isArray(res.data)) {
        setItems(res.data.map(normalizeInventory));
      } else {
        setItems([]);
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to load inventory items.", variant: "destructive" });
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [projectId]);

  const filtered = useMemo(() => {
    const q = (searchTerm || '').toLowerCase();
    return items.filter((it) => {
      const matchesSearch =
        !q ||
        (it.brand || '').toLowerCase().includes(q) ||
        (it.name || '').toLowerCase().includes(q) ||
        String(it.quantity).includes(q) ||
        String(it.price).includes(q);
      const matchesStock =
        filterStock === 'all' ||
        (filterStock === 'in' && it.stockin === true) ||
        (filterStock === 'out' && it.stockin === false);
      return matchesSearch && matchesStock;
    });
  }, [items, searchTerm, filterStock]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setAddOpen(true);
  };

  const submitAdd = async (e) => {
    e?.preventDefault();
    if (!projectId) {
      toast({ title: "Select project", description: "Choose a project first.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await api.createInventory({
        ...form,
        project_id: projectId,
      });
      if (res.success) {
        setAddOpen(false);
        setForm(EMPTY_FORM);
        await fetchItems();
        toast({ title: "Item added", description: "Inventory item created." });
      } else {
        toast({ title: "Error", description: res.error || "Failed to add item.", variant: "destructive" });
      }
    } catch (e2) {
      toast({ title: "Error", description: e2.message || "Failed to add item.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (it) => {
    setEditItem(it);
    setForm({
      brand: it.brand || '',
      name: it.name || '',
      quantity: String(it.quantity ?? ''),
      price: String(it.price ?? ''),
      stockin: Boolean(it.stockin),
    });
  };

  const submitEdit = async (e) => {
    e?.preventDefault();
    if (!editItem) return;
    setSaving(true);
    try {
      const res = await api.updateInventory(editItem.inventory_id || editItem.id, {
        ...form,
      });
      if (res.success) {
        setEditItem(null);
        setForm(EMPTY_FORM);
        await fetchItems();
        toast({ title: "Item updated", description: "Inventory item saved." });
      } else {
        toast({ title: "Error", description: res.error || "Failed to update item.", variant: "destructive" });
      }
    } catch (e2) {
      toast({ title: "Error", description: e2.message || "Failed to update item.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (it) => {
    if (!window.confirm("Delete this inventory item?")) return;
    setSaving(true);
    try {
      const res = await api.deleteInventory(it.inventory_id || it.id);
      if (res.success) {
        await fetchItems();
        toast({ title: "Item deleted", description: "Inventory item removed." });
      } else {
        toast({ title: "Error", description: res.error || "Failed to delete item.", variant: "destructive" });
      }
    } catch (e2) {
      toast({ title: "Error", description: e2.message || "Failed to delete item.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground mt-2">Manage project-linked inventory items.</p>
          {!projectId && (
            <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">Select a project to load/save inventory.</p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
          <Button variant="outline" size="sm" className="shrink-0" onClick={fetchItems} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" /> {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Create Inventory</CardTitle>
              <CardDescription>Uses project, brand, quantity, name, price, and stock status fields.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={submitAdd}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Project ID</Label>
                <Input value={projectId || ""} readOnly placeholder="Select a project" />
              </div>
              <div className="space-y-2">
                <Label>Brand</Label>
                <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Price</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Stock In</Label>
                <div className="flex items-center gap-2">
                  <Switch checked={form.stockin} onCheckedChange={(v) => setForm({ ...form, stockin: v })} />
                  <span className="text-sm text-muted-foreground">{form.stockin ? "In" : "Out"}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={saving || !projectId}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Inventory Items</CardTitle>
              <CardDescription>Brand, name, quantity, price, and stock status.</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-[280px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search brand, name, qty, price…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={filterStock} onValueChange={setFilterStock}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Stock filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="in">Stock In</SelectItem>
                  <SelectItem value="out">Stock Out</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="w-[160px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No items found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="text-muted-foreground">{it.inventory_id}</TableCell>
                    <TableCell>{it.brand}</TableCell>
                    <TableCell>{it.name}</TableCell>
                    <TableCell className="text-right">{it.quantity}</TableCell>
                    <TableCell className="text-right">{it.price}</TableCell>
                    <TableCell>
                      <Badge variant={it.stockin ? "default" : "outline"}>
                        {it.stockin ? "In" : "Out"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(it)}>
                          <Pencil className="h-4 w-4 mr-2" /> Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => removeItem(it)}>
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={submitEdit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Brand</Label>
                <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Price</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Stock In</Label>
                <div className="flex items-center gap-2">
                  <Switch checked={form.stockin} onCheckedChange={(v) => setForm({ ...form, stockin: v })} />
                  <span className="text-sm text-muted-foreground">{form.stockin ? "In" : "Out"}</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
