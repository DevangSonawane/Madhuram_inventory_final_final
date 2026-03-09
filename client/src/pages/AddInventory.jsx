import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProject } from '@/contexts/ProjectContext';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Boxes, PackagePlus, RefreshCw, Search, Loader2, Pencil, Trash2 } from 'lucide-react';

const EMPTY_FORM = {
  brand: '',
  name: '',
  quantity: '',
  price: '',
  stockin: true,
  billing: false,
};

function normalizeInventory(item) {
  return {
    id: item.inventory_id || item.id,
    inventory_id: item.inventory_id || item.id,
    project_id: item.project_id,
    brand: item.brand || '',
    name: item.name || '',
    quantity: Number(item.quantity) || 0,
    price: Number(item.price) || 0,
    stockin: Boolean(item.stockin),
    billing: Boolean(item.billing),
  };
}

export default function AddInventory() {
  const navigate = useNavigate();
  const { projectId: routeProjectId } = useParams();
  const { selectedProject, selectProject, projects } = useProject();
  const { toast } = useToast();

  const initialProjectId = selectedProject?.id ?? selectedProject?.project_id ?? routeProjectId ?? '';

  const [activeProjectId, setActiveProjectId] = useState(initialProjectId ? String(initialProjectId) : '');
  const [form, setForm] = useState(EMPTY_FORM);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [billingFilter, setBillingFilter] = useState('all');
  const [rowPending, setRowPending] = useState({});
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    if (activeProjectId) return;
    if (selectedProject?.id || selectedProject?.project_id) {
      const id = selectedProject.id || selectedProject.project_id;
      setActiveProjectId(String(id));
    }
  }, [activeProjectId, selectedProject]);

  const projectLabel = useMemo(() => {
    if (activeProjectId === 'all') return 'All Projects';
    const found = (projects || []).find(
      (project) => String(project.id || project.project_id) === String(activeProjectId),
    );

    if (found) return found.name || found.project_name || `Project ${activeProjectId}`;
    return activeProjectId ? `Project ${activeProjectId}` : 'Select a project';
  }, [projects, activeProjectId]);

  const fetchItems = async () => {
    if (!activeProjectId) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const result = activeProjectId === 'all'
        ? await api.getInventories()
        : await api.getInventoriesByProject(activeProjectId);
      if (result.success && Array.isArray(result.data)) {
        setItems(result.data.map(normalizeInventory));
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'Failed to load inventory items for this project.',
        variant: 'destructive',
      });
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [activeProjectId]);

  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        !query ||
        (item.brand || '').toLowerCase().includes(query) ||
        (item.name || '').toLowerCase().includes(query) ||
        String(item.inventory_id || '').includes(query) ||
        String(item.project_id || '').includes(query);
      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'in' && item.stockin) ||
        (stockFilter === 'out' && !item.stockin);
      const matchesBilling =
        billingFilter === 'all' ||
        (billingFilter === 'billed' && item.billing) ||
        (billingFilter === 'pending' && !item.billing);
      return matchesSearch && matchesStock && matchesBilling;
    });
  }, [items, searchTerm, stockFilter, billingFilter]);

  const totalQuantity = useMemo(
    () => filteredItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    [filteredItems],
  );

  const totalValue = useMemo(
    () =>
      filteredItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0), 0),
    [filteredItems],
  );

  const handleProjectChange = (value) => {
    setActiveProjectId(value);
    if (value === 'all') return;
    const found = (projects || []).find(
      (project) => String(project.id || project.project_id) === String(value),
    );
    if (found) {
      selectProject(found);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!activeProjectId || activeProjectId === 'all') {
      toast({ title: 'Error', description: 'Select a project first.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const result = await api.createInventory({
        project_id: Number(activeProjectId),
        brand: form.brand,
        name: form.name,
        quantity: Number(form.quantity),
        price: Number(form.price),
        stockin: Boolean(form.stockin),
        billing: Boolean(form.billing),
      });

      if (result.success) {
        toast({ title: 'Success', description: 'Inventory item created successfully.' });
        setForm(EMPTY_FORM);
        await fetchItems();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create inventory item.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to create inventory item.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const setRowBusy = (id, busy) => {
    setRowPending((prev) => {
      if (busy) return { ...prev, [id]: true };
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const toggleStock = async (item, value) => {
    const id = item.inventory_id || item.id;
    setRowBusy(id, true);
    try {
      const result = await api.updateInventoryStockIn(id, value);
      if (result.success) {
        setItems((prev) =>
          prev.map((row) => ((row.inventory_id || row.id) === id ? normalizeInventory(result.data) : row)),
        );
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to update stock status.', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: error?.message || 'Failed to update stock status.', variant: 'destructive' });
    } finally {
      setRowBusy(id, false);
    }
  };

  const toggleBilling = async (item, value) => {
    const id = item.inventory_id || item.id;
    setRowBusy(id, true);
    try {
      const result = await api.updateInventoryBilling(id, value);
      if (result.success) {
        setItems((prev) =>
          prev.map((row) => ((row.inventory_id || row.id) === id ? normalizeInventory(result.data) : row)),
        );
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to update billing status.', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: error?.message || 'Failed to update billing status.', variant: 'destructive' });
    } finally {
      setRowBusy(id, false);
    }
  };

  const openEdit = async (item) => {
    const id = item.inventory_id || item.id;
    setRowBusy(id, true);
    try {
      const result = await api.getInventoryById(id);
      if (!result.success || !result.data) {
        toast({ title: 'Error', description: result.error || 'Failed to load inventory item.', variant: 'destructive' });
        return;
      }
      const normalized = normalizeInventory(result.data);
      setEditingId(id);
      setEditForm({
        brand: normalized.brand,
        name: normalized.name,
        quantity: String(normalized.quantity),
        price: String(normalized.price),
        stockin: normalized.stockin,
        billing: normalized.billing,
      });
      setEditOpen(true);
    } catch (error) {
      toast({ title: 'Error', description: error?.message || 'Failed to load inventory item.', variant: 'destructive' });
    } finally {
      setRowBusy(id, false);
    }
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    if (!editingId) return;

    setEditSaving(true);
    try {
      const result = await api.updateInventory(editingId, {
        brand: editForm.brand,
        name: editForm.name,
        quantity: Number(editForm.quantity),
        price: Number(editForm.price),
        stockin: Boolean(editForm.stockin),
        billing: Boolean(editForm.billing),
      });

      if (result.success) {
        toast({ title: 'Success', description: 'Inventory item updated.' });
        setEditOpen(false);
        setEditingId(null);
        await fetchItems();
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to update inventory item.', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: error?.message || 'Failed to update inventory item.', variant: 'destructive' });
    } finally {
      setEditSaving(false);
    }
  };

  const removeItem = async (item) => {
    const id = item.inventory_id || item.id;
    if (!window.confirm(`Delete inventory #${id}?`)) return;

    setRowBusy(id, true);
    try {
      const result = await api.deleteInventory(id);
      if (result.success) {
        toast({ title: 'Success', description: 'Inventory item deleted.' });
        await fetchItems();
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to delete inventory item.', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: error?.message || 'Failed to delete inventory item.', variant: 'destructive' });
    } finally {
      setRowBusy(id, false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[120rem] space-y-8 px-4 pb-8 pt-2 sm:px-6 lg:px-10">
      <div className="rounded-3xl border border-border/60 bg-gradient-to-r from-background via-background to-muted/40 p-6 shadow-sm sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Badge variant="outline" className="mb-3 border-primary/30 bg-primary/5 text-primary">Inventory Workspace</Badge>
            <h1 className="text-3xl font-bold tracking-tight">Add Inventory</h1>
            <p className="text-muted-foreground mt-1">Create inventory entries for {projectLabel}.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/projects')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Total Items</CardDescription>
            <CardTitle className="text-2xl">{filteredItems.length}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Matching current filters
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Total Quantity</CardDescription>
            <CardTitle className="text-2xl">{totalQuantity}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Units across visible rows
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Inventory Value</CardDescription>
            <CardTitle className="text-2xl">₹{totalValue.toLocaleString('en-IN')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Quantity x price
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>In Stock</CardDescription>
            <CardTitle className="text-2xl">{filteredItems.filter((it) => it.stockin).length}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Items currently available
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="border-border/60 bg-card/90 shadow-sm lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackagePlus className="h-5 w-5 text-primary" />
              New Item
            </CardTitle>
            <CardDescription>Mapped fields: project_id, brand, quantity, name, price, stockin, billing.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={activeProjectId} onValueChange={handleProjectChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All projects</SelectItem>
                    {(projects || []).map((project) => {
                      const id = String(project.id || project.project_id);
                      const name = project.name || project.project_name || `Project ${id}`;
                      return (
                        <SelectItem key={id} value={id}>
                          {name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Brand</Label>
                <Input
                  value={form.brand}
                  onChange={(event) => setForm((prev) => ({ ...prev, brand: event.target.value }))}
                  placeholder="e.g. ACC"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Item Name</Label>
                <Input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="e.g. Cement Bag"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.quantity}
                    onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Stock Status</Label>
                <Select
                  value={form.stockin ? 'in' : 'out'}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, stockin: value === 'in' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">In Stock</SelectItem>
                    <SelectItem value="out">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Billing Status</Label>
                <Select
                  value={form.billing ? 'done' : 'pending'}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, billing: value === 'done' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="done">Billed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={saving || !activeProjectId || activeProjectId === 'all'}>
                {saving ? 'Saving...' : '+ Add inventory'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/90 shadow-sm lg:col-span-3">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Boxes className="h-5 w-5 text-primary" />
                  Inventory
                </CardTitle>
                <CardDescription>
                  {activeProjectId === 'all' ? 'Showing items across all projects.' : 'Current items for the selected project.'}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative w-full sm:w-52">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search..."
                  />
                </div>
                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="in">In Stock</SelectItem>
                    <SelectItem value="out">Out Stock</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={billingFilter} onValueChange={setBillingFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Billing</SelectItem>
                    <SelectItem value="billed">Billed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={fetchItems} disabled={loading || !activeProjectId}>
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border/50 bg-background/70 p-4 sm:p-5">
              {filteredItems.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  {loading ? 'Loading items...' : 'No inventory items found.'}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border/70 bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold">{item.name}</p>
                          <p className="truncate text-sm text-muted-foreground">
                            {item.brand} • #{item.inventory_id} • P{item.project_id || '-'}
                          </p>
                        </div>
                        {rowPending[item.id] && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
                      </div>

                      <div className="mb-4 grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-2">
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Qty</p>
                          <p className="text-sm font-semibold">{item.quantity}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Unit Price</p>
                          <p className="text-sm font-semibold">₹{item.price.toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total</p>
                          <p className="text-sm font-semibold">₹{(item.quantity * item.price).toLocaleString('en-IN')}</p>
                        </div>
                      </div>

                      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-border/70 p-2.5">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs font-medium text-muted-foreground">Stock</p>
                            <Badge className={item.stockin ? 'bg-emerald-600 hover:bg-emerald-600' : ''} variant={item.stockin ? 'default' : 'secondary'}>
                              {item.stockin ? 'In' : 'Out'}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant={item.stockin ? 'default' : 'outline'}
                              className="h-7 text-xs"
                              onClick={() => toggleStock(item, true)}
                              disabled={Boolean(rowPending[item.id]) || item.stockin}
                            >
                              In
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={!item.stockin ? 'default' : 'outline'}
                              className="h-7 text-xs"
                              onClick={() => toggleStock(item, false)}
                              disabled={Boolean(rowPending[item.id]) || !item.stockin}
                            >
                              Out
                            </Button>
                          </div>
                        </div>

                        <div className="rounded-lg border border-border/70 p-2.5">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs font-medium text-muted-foreground">Billing</p>
                            <Badge className={item.billing ? 'bg-blue-600 hover:bg-blue-600' : ''} variant={item.billing ? 'default' : 'secondary'}>
                              {item.billing ? 'Billed' : 'Pending'}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant={item.billing ? 'default' : 'outline'}
                              className="h-7 text-xs"
                              onClick={() => toggleBilling(item, true)}
                              disabled={Boolean(rowPending[item.id]) || item.billing}
                            >
                              Billed
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={!item.billing ? 'default' : 'outline'}
                              className="h-7 text-xs"
                              onClick={() => toggleBilling(item, false)}
                              disabled={Boolean(rowPending[item.id]) || !item.billing}
                            >
                              Pending
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(item)}
                          disabled={Boolean(rowPending[item.id])}
                        >
                          <Pencil className="mr-1 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeItem(item)}
                          disabled={Boolean(rowPending[item.id])}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Inventory Item #{editingId}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitEdit}>
            <div className="space-y-2">
              <Label>Brand</Label>
              <Input
                value={editForm.brand}
                onChange={(event) => setEditForm((prev) => ({ ...prev, brand: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Item Name</Label>
              <Input
                value={editForm.name}
                onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.quantity}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, quantity: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Price</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.price}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, price: event.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Stock Status</Label>
                <Select
                  value={editForm.stockin ? 'in' : 'out'}
                  onValueChange={(value) => setEditForm((prev) => ({ ...prev, stockin: value === 'in' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">In Stock</SelectItem>
                    <SelectItem value="out">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Billing Status</Label>
                <Select
                  value={editForm.billing ? 'done' : 'pending'}
                  onValueChange={(value) => setEditForm((prev) => ({ ...prev, billing: value === 'done' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="done">Billed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={editSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={editSaving}>
                {editSaving ? 'Saving...' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
