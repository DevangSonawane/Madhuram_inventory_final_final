import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MM_PER_INCH = 25.4;

const formatSizeValue = (value) => {
  if (!Number.isFinite(value)) return '';
  return String(Number(value.toFixed(4)));
};

const inferUnit = (item = {}) => {
  if (item.size_unit === 'inch' || item.size_unit === 'mm') return item.size_unit;
  if (item.size_mm && !item.size_inch) return 'mm';
  return 'inch';
};

const getValueForUnit = (item = {}, unit = 'inch') => {
  return unit === 'mm' ? (item.size_mm ?? '') : (item.size_inch ?? '');
};

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
              {(() => {
                const selectedUnit = inferUnit(item);
                const sizeValue = getValueForUnit(item, selectedUnit);

                const handleSizeValueChange = (rawValue) => {
                  onChange(index, 'size_unit', selectedUnit);
                  if (rawValue === '') {
                    onChange(index, 'size_inch', '');
                    onChange(index, 'size_mm', '');
                    return;
                  }

                  const parsed = Number(rawValue);
                  if (!Number.isFinite(parsed)) {
                    if (selectedUnit === 'inch') {
                      onChange(index, 'size_inch', rawValue);
                      onChange(index, 'size_mm', '');
                    } else {
                      onChange(index, 'size_mm', rawValue);
                      onChange(index, 'size_inch', '');
                    }
                    return;
                  }

                  if (selectedUnit === 'inch') {
                    onChange(index, 'size_inch', rawValue);
                    onChange(index, 'size_mm', formatSizeValue(parsed * MM_PER_INCH));
                  } else {
                    onChange(index, 'size_mm', rawValue);
                    onChange(index, 'size_inch', formatSizeValue(parsed / MM_PER_INCH));
                  }
                };

                const handleUnitChange = (nextUnit) => {
                  const currentValue = getValueForUnit(item, selectedUnit);
                  const parsed = Number(currentValue);

                  onChange(index, 'size_unit', nextUnit);

                  if (currentValue === '' || !Number.isFinite(parsed)) return;

                  if (selectedUnit === 'inch' && nextUnit === 'mm') {
                    const converted = formatSizeValue(parsed * MM_PER_INCH);
                    onChange(index, 'size_mm', converted);
                    onChange(index, 'size_inch', formatSizeValue(parsed));
                  } else if (selectedUnit === 'mm' && nextUnit === 'inch') {
                    const converted = formatSizeValue(parsed / MM_PER_INCH);
                    onChange(index, 'size_inch', converted);
                    onChange(index, 'size_mm', formatSizeValue(parsed));
                  }
                };

                return (
                  <div className="space-y-1 lg:max-w-[220px]">
                    <Label>Size</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="any"
                        className="h-9"
                        value={sizeValue}
                        onChange={(e) => handleSizeValueChange(e.target.value)}
                        placeholder="Enter size"
                      />
                      <Select value={selectedUnit} onValueChange={handleUnitChange}>
                        <SelectTrigger className="h-9 w-[92px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inch">Inch</SelectItem>
                          <SelectItem value="mm">MM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })()}
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
