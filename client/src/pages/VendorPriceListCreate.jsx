import React, { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

const emptyForm = () => ({
  version_name: '',
  status: 'active',
  upload_file: null,
  filename: '',
  file_path: '',
  items: [emptyItem()],
});

export default function VendorPriceListCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { projectId, vendorId } = useParams();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(emptyForm());
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);

  const addItemRow = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
  };

  const removeItemRow = (index) => {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, idx) => idx !== index) }));
  };

  const updateItem = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, idx) => (idx === index ? { ...item, [key]: value } : item)),
    }));
  };

  const handleUploadFile = async (selectedFile = null) => {
    const file = selectedFile || form.upload_file;
    if (!file) {
      toast({ title: 'Select a file first', variant: 'destructive' });
      return;
    }

    try {
      setUploading(true);
      const result = await api.uploadVendorPriceListFile(file);
      if (!result.success) {
        toast({ title: 'Upload failed', description: result.error || 'Could not upload file.', variant: 'destructive' });
        return;
      }

      setForm((prev) => ({
        ...prev,
        filename: result.data?.filename || '',
        file_path: result.data?.filePath || '',
      }));

      toast({ title: 'Upload successful', description: result.data?.filePath || '' });
    } catch {
      toast({ title: 'Upload failed', description: 'Server error.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const [file] = Array.from(event.dataTransfer.files || []);
    if (!file) return;
    setForm((prev) => ({ ...prev, upload_file: file }));
    handleUploadFile(file);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setForm((prev) => ({ ...prev, upload_file: file }));
    handleUploadFile(file);
  };

  const clearSelectedFile = () => {
    setForm((prev) => ({ ...prev, upload_file: null, filename: '', file_path: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreate = async () => {
    if (!form.version_name.trim()) {
      toast({ title: 'Version Name Is Required', variant: 'destructive' });
      return;
    }

    const payload = {
      vendor_id: Number(vendorId),
      version_name: form.version_name.trim(),
      status: form.status,
      ...(form.filename ? { filename: form.filename } : {}),
      ...(form.file_path ? { file_path: form.file_path } : {}),
      items: form.items,
    };

    try {
      setCreating(true);
      const result = await api.createVendorPriceList(payload);
      if (!result.success) {
        vendorFlowStore.createPriceList(vendorId, payload);
        toast({ title: 'Saved locally', description: result.error || 'Could not create on server.' });
      } else {
        toast({ title: 'Created', description: 'Price list created successfully.' });
      }

      navigate(`/${projectId}/vendors/${vendorId}/price-lists`);
    } catch {
      vendorFlowStore.createPriceList(vendorId, payload);
      toast({ title: 'Saved locally', description: 'Server error during create.' });
      navigate(`/${projectId}/vendors/${vendorId}/price-lists`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-gradient-to-r from-lime-50 via-emerald-50 to-white p-6 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex gap-2">
              <Button variant="outline" onClick={() => navigate(`/${projectId}/vendors/${vendorId}/price-lists`)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Price Lists
              </Button>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Create Price List</h1>
            <p className="text-sm text-muted-foreground">Create a new vendor price list with optional file upload.</p>
          </div>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Header</CardTitle>
          <CardDescription>Fill the basic details for this version.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label>Vendor Id</Label>
            <Input value={String(vendorId)} disabled />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Version Name *</Label>
            <Input value={form.version_name} onChange={(e) => setForm((p) => ({ ...p, version_name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(value) => setForm((p) => ({ ...p, status: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_VALUES.map((status) => <SelectItem key={`create-${status}`} value={status}>{toTitleCase(status)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>Drag and drop or choose a file to upload.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center transition ${
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30'
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
            <div className="text-sm font-medium">Upload Vendor Price List</div>
            <div className="text-xs text-muted-foreground">Drag and drop or click to upload</div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              disabled={uploading}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Choose File'}
            </Button>
            {form.upload_file ? (
              <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
                <div>Selected: {form.upload_file.name}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    clearSelectedFile();
                  }}
                >
                  Remove File
                </Button>
              </div>
            ) : null}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>File Name</Label>
              <Input value={form.filename} onChange={(e) => setForm((p) => ({ ...p, filename: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>File Path</Label>
              <Input value={form.file_path} onChange={(e) => setForm((p) => ({ ...p, file_path: e.target.value }))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <PriceListItemsManualEntry
        items={form.items}
        onAdd={addItemRow}
        onRemove={removeItemRow}
        onChange={updateItem}
        title="Manual Item Entry"
        description="Add each product line manually with clean field grouping."
      />

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate(`/${projectId}/vendors/${vendorId}/price-lists`)}>Cancel</Button>
        <Button onClick={handleCreate} disabled={creating}>{creating ? 'Creating...' : 'Create Price List'}</Button>
      </div>
    </div>
  );
}
