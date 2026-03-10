import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function PriceListItemsManualEntry({
  items,
  onAdd,
  onRemove,
  onChange,
  title = 'Items',
  description = 'Enter each line item manually.',
  addLabel = 'Add Item',
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Total items: {items.length}</div>
          <Button type="button" variant="outline" size="sm" onClick={onAdd}>
            <Plus className="mr-2 h-4 w-4" /> {addLabel}
          </Button>
        </div>

        {items.map((item, index) => (
          <div key={`manual-item-${index}`} className="rounded-lg border bg-background p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="font-medium">Item {index + 1}</div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => onRemove(index)}
                disabled={items.length === 1}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Remove
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <Label>Item Name</Label>
                <Input value={item.items_name || ''} onChange={(e) => onChange(index, 'items_name', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Product Name</Label>
                <Input value={item.product_name || ''} onChange={(e) => onChange(index, 'product_name', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Input value={item.category || ''} onChange={(e) => onChange(index, 'category', e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label>Item Code</Label>
                <Input value={item.item_code || ''} onChange={(e) => onChange(index, 'item_code', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>HSN Code</Label>
                <Input value={item.hsn_code || ''} onChange={(e) => onChange(index, 'hsn_code', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Size (Inch)</Label>
                <Input value={item.size_inch || ''} onChange={(e) => onChange(index, 'size_inch', e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label>Size (MM)</Label>
                <Input value={item.size_mm || ''} onChange={(e) => onChange(index, 'size_mm', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Price Per Piece</Label>
                <Input type="number" value={item.price_per_pic ?? ''} onChange={(e) => onChange(index, 'price_per_pic', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Discount Price</Label>
                <Input type="number" value={item.discount_price ?? ''} onChange={(e) => onChange(index, 'discount_price', e.target.value)} />
              </div>

              <div className="space-y-1 md:col-span-2 lg:col-span-1">
                <Label>Net Price</Label>
                <Input type="number" value={item.net_price ?? ''} onChange={(e) => onChange(index, 'net_price', e.target.value)} />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
