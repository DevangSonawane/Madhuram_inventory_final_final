import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { vendorFlowStore } from '@/lib/vendorFlowStore';
import { PriceListItemsManualEntry } from '@/components/forms/PriceListItemsManualEntry';

const STATUS_VALUES = ['active', 'inactive', 'archived'];
const toTitleCase = (value) => value.charAt(0).toUpperCase() + value.slice(1);

const emptyItem = () => ({
  items_name: '',
  hsn_code: '',
  item_code: '',
  category: '',
  product_name: '',
  size_inch: '',
  size_mm: '',
  price_per_pic: '',
  discount_price: '',
  net_price: '',
});

const toNumberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const calculateNetPrice = (pricePerPieceValue, discountValue) => {
  const pricePerPiece = toNumberOrNull(pricePerPieceValue);
  const discountPrice = toNumberOrNull(discountValue);

  if (pricePerPiece === null && discountPrice === null) return '';
  const netValue = (pricePerPiece ?? 0) - (discountPrice ?? 0);
  return String(Number(netValue.toFixed(4)));
};

export default function VendorPriceListView() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { projectId, vendorId, priceListId } = useParams();

  const [vendor, setVendor] = useState(null);
  const [priceList, setPriceList] = useState(null);
  const [versionName, setVersionName] = useState('');
  const [status, setStatus] = useState('active');
  const [items, setItems] = useState([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [patching, setPatching] = useState(false);

  const loadData = async () => {
    try {
      const [vendorResult, detailResult] = await Promise.all([
        api.getVendorById(vendorId),
        api.getVendorPriceListById(priceListId),
      ]);

      if (vendorResult?.success) {
        setVendor(vendorResult.data);
      } else {
        setVendor(vendorFlowStore.getVendorById(vendorId));
      }

      if (detailResult?.success) {
        const data = detailResult.data;
        setPriceList(data);
        setVersionName(data.version_name || '');
        setStatus(data.status || 'active');
        setItems(Array.isArray(data.items) && data.items.length ? data.items : [emptyItem()]);
      } else {
        const local = vendorFlowStore.getPriceListById(vendorId, priceListId);
        setPriceList(local);
        setVersionName(local?.version_name || '');
        setStatus(local?.status || 'active');
        setItems(Array.isArray(local?.items) && local.items.length ? local.items : [emptyItem()]);
      }
    } catch {
      const local = vendorFlowStore.getPriceListById(vendorId, priceListId);
      setVendor(vendorFlowStore.getVendorById(vendorId));
      setPriceList(local);
      setVersionName(local?.version_name || '');
      setStatus(local?.status || 'active');
      setItems(Array.isArray(local?.items) && local.items.length ? local.items : [emptyItem()]);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId, priceListId]);

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (index) => setItems((prev) => prev.filter((_, idx) => idx !== index));
  const updateItem = (index, key, value) => {
    setItems((prev) => prev.map((item, idx) => {
      if (idx !== index) return item;
      const nextItem = { ...item, [key]: value };
      if (key === 'price_per_pic' || key === 'discount_price') {
        nextItem.net_price = calculateNetPrice(nextItem.price_per_pic, nextItem.discount_price);
      }
      return nextItem;
    }));
  };

  const handlePatchStatus = async () => {
    if (!priceList?.price_list_id) return;
    try {
      setPatching(true);
      const result = await api.updateVendorPriceListStatus(priceList.price_list_id, status);
      if (!result.success) {
        vendorFlowStore.updatePriceList(priceList.price_list_id, { status });
        toast({ title: 'Status saved locally', description: result.error || 'Could not update on server.' });
      } else {
        toast({ title: 'Status updated' });
      }
      await loadData();
    } finally {
      setPatching(false);
    }
  };

  const handlePutUpdate = async () => {
    if (!priceList?.price_list_id) return;

    const payload = {
      version_name: versionName,
      status,
      items,
    };

    try {
      setSaving(true);
      const result = await api.updateVendorPriceList(priceList.price_list_id, payload);
      if (!result.success) {
        vendorFlowStore.updatePriceList(priceList.price_list_id, payload);
        toast({ title: 'Updated locally', description: result.error || 'Could not update on server.' });
      } else {
        toast({ title: 'Updated', description: 'Price list updated successfully.' });
      }
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  if (!priceList) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => navigate(`/${projectId}/vendors/${vendorId}/price-lists`)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Card><CardContent className="pt-6 text-sm text-muted-foreground">Price list not found.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-gradient-to-r from-sky-50 via-cyan-50 to-white p-6 md:p-8 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex gap-2">
              <Button variant="outline" onClick={() => navigate(`/${projectId}/vendors`)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Vendor List
              </Button>
              <Button variant="outline" onClick={() => navigate(`/${projectId}/vendors/${vendorId}/price-lists`)}>
                Price List Page
              </Button>
              <Button variant="outline" onClick={loadData}>
                <RefreshCw className="mr-2 h-4 w-4" /> Reload
              </Button>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Price List Detail</h1>
            <p className="text-sm text-muted-foreground">Vendor: {vendor?.vendor_name || `Vendor Id ${vendorId}`}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">Price List Id: {priceList.price_list_id}</Badge>
            <Badge variant="outline">Vendor Id: {priceList.vendor_id}</Badge>
          </div>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Header Fields</CardTitle>
          <CardDescription>Edit version details and save changes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <Label>Version Name</Label>
              <Input value={versionName} onChange={(e) => setVersionName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_VALUES.map((statusValue) => <SelectItem key={statusValue} value={statusValue}>{toTitleCase(statusValue)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">File Path: {priceList.file_path || '-'}</div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handlePatchStatus} disabled={patching}>{patching ? 'Updating...' : 'Update Status'}</Button>
            <Button onClick={handlePutUpdate} disabled={saving}><Save className="mr-2 h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'} </Button>
          </div>
        </CardContent>
      </Card>

      <PriceListItemsManualEntry
        items={items}
        onAdd={addItem}
        onRemove={removeItem}
        onChange={updateItem}
        title="Manual Item Entry"
        description="Update each line item in a form-based layout, then save changes."
      />
    </div>
  );
}
