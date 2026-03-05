import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProject } from '@/contexts/ProjectContext';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Boxes, PackagePlus, RefreshCw, Search } from 'lucide-react';

const EMPTY_FORM = {
  brand: '',
  name: '',
  quantity: '',
  price: '',
  stockin: true,
};

function normalizeInventory(item) {
  return {
    id: item.inventory_id || item.id,
    inventory_id: item.inventory_id || item.id,
    brand: item.brand || '',
    name: item.name || '',
    quantity: Number(item.quantity) || 0,
    price: Number(item.price) || 0,
    stockin: Boolean(item.stockin),
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

  useEffect(() => {
    if (activeProjectId) return;
    if (selectedProject?.id || selectedProject?.project_id) {
      const id = selectedProject.id || selectedProject.project_id;
      setActiveProjectId(String(id));
    }
  }, [activeProjectId, selectedProject]);

  const projectLabel = useMemo(() => {
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
      const result = await api.getInventoriesByProject(activeProjectId);
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
        String(item.inventory_id || '').includes(query);
      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'in' && item.stockin) ||
        (stockFilter === 'out' && !item.stockin);
      return matchesSearch && matchesStock;
    });
  }, [items, searchTerm, stockFilter]);

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
    const found = (projects || []).find(
      (project) => String(project.id || project.project_id) === String(value),
    );
    if (found) {
      selectProject(found);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!activeProjectId) {
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

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 pb-8 pt-2 sm:px-6 lg:px-10">
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

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/60 bg-card/90 shadow-sm lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackagePlus className="h-5 w-5 text-primary" />
              New Item
            </CardTitle>
            <CardDescription>Mapped fields: project_id, brand, quantity, name, price, stockin.</CardDescription>
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

              <Button type="submit" className="w-full" disabled={saving || !activeProjectId}>
                {saving ? 'Saving...' : '+ Add inventory'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/90 shadow-sm lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Boxes className="h-5 w-5 text-primary" />
                  Project Inventory
                </CardTitle>
                <CardDescription>Current items for the selected project.</CardDescription>
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
                <Button variant="outline" size="icon" onClick={fetchItems} disabled={loading || !activeProjectId}>
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border border-border/50">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[90px]">ID</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
                <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      {loading ? 'Loading items...' : 'No inventory items found.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.inventory_id}</TableCell>
                      <TableCell>{item.brand}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">₹{item.price.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-right">₹{(item.quantity * item.price).toLocaleString('en-IN')}</TableCell>
                      <TableCell>
                        <Badge variant={item.stockin ? 'default' : 'secondary'}>
                          {item.stockin ? 'In Stock' : 'Out of Stock'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
