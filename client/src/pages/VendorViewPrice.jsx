import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { vendorFlowStore } from '@/lib/vendorFlowStore';

const toTitleCase = (value) => value.charAt(0).toUpperCase() + value.slice(1);

export default function VendorViewPrice() {
  const navigate = useNavigate();
  const { projectId, vendorId } = useParams();

  const [vendor, setVendor] = useState(null);
  const [priceLists, setPriceLists] = useState([]);
  const [latestDetail, setLatestDetail] = useState(null);

  useEffect(() => {
    const load = async () => {
      const localVendor = vendorFlowStore.getVendorById(vendorId);
      try {
        const apiVendor = await api.getVendorById(vendorId);
        setVendor(apiVendor?.success && apiVendor.data ? apiVendor.data : localVendor);
      } catch {
        setVendor(localVendor);
      }

      let lists = vendorFlowStore.listPriceLists(vendorId);
      try {
        const apiLists = await api.getVendorPriceLists(vendorId);
        if (apiLists?.success && Array.isArray(apiLists.data)) {
          lists = apiLists.data;
        }
      } catch {
        // keep fallback
      }
      setPriceLists(lists);
    };

    load();
  }, [vendorId]);

  const latest = useMemo(() => (priceLists.length ? priceLists[0] : null), [priceLists]);

  useEffect(() => {
    const loadLatest = async () => {
      if (!latest?.price_list_id) {
        setLatestDetail(null);
        return;
      }

      try {
        const detail = await api.getVendorPriceListById(latest.price_list_id);
        if (detail?.success && detail.data) {
          setLatestDetail(detail.data);
          return;
        }
      } catch {
        // fallback below
      }

      setLatestDetail(vendorFlowStore.getPriceListById(vendorId, latest.price_list_id));
    };

    loadLatest();
  }, [latest, vendorId]);

  const latestItems = latestDetail?.items || [];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-6 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex gap-2">
              <Button variant="outline" onClick={() => navigate(`/${projectId}/vendors`)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Vendor List
              </Button>
              <Button variant="outline" onClick={() => navigate(`/${projectId}/vendors/${vendorId}/price-lists`)}>
                Back to Price List Page
              </Button>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">View Price</h1>
            <p className="mt-1 text-sm text-muted-foreground">Vendor: {vendor?.vendor_name || `Vendor Id ${vendorId}`}</p>
          </div>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Latest Price Snapshot</CardTitle>
          <CardDescription>From the most recent vendor price list.</CardDescription>
        </CardHeader>
        <CardContent>
          {!latest ? (
            <div className="text-sm text-muted-foreground">No price list found for this vendor.</div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{latest.version_name || '-'}</Badge>
                <Badge variant="outline">{latest.status ? toTitleCase(latest.status) : '-'}</Badge>
                <span className="text-xs text-muted-foreground">Created: {latest.created_at ? new Date(latest.created_at).toLocaleString() : '-'}</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>HSN</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Price per Piece</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latestItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">No item rows in latest price list.</TableCell>
                    </TableRow>
                  ) : (
                    latestItems.map((item, idx) => (
                      <TableRow key={`latest-item-${idx}`}>
                        <TableCell>{item.items_name || '-'}</TableCell>
                        <TableCell>{item.hsn_code || '-'}</TableCell>
                        <TableCell>{item.product_name || '-'}</TableCell>
                        <TableCell>{item.price_per_pic ?? '-'}</TableCell>
                        <TableCell>{item.discount_price ?? '-'}</TableCell>
                        <TableCell>{item.net_price ?? '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <Button onClick={() => navigate(`/${projectId}/vendors/${vendorId}/price-lists/${latest.price_list_id}`)}>
                <Eye className="mr-2 h-4 w-4" /> Open Pricelist View Page
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Price Lists</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {priceLists.length === 0 ? (
              <div className="text-sm text-muted-foreground">No price list records yet.</div>
            ) : (
              priceLists.map((row) => (
                <div key={row.price_list_id} className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-medium">{row.version_name || '-'}</div>
                    <div className="text-xs text-muted-foreground">{row.status ? toTitleCase(row.status) : '-'} | {row.created_at ? new Date(row.created_at).toLocaleString() : '-'}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/${projectId}/vendors/${vendorId}/price-lists/${row.price_list_id}`)}>
                    <Eye className="mr-2 h-4 w-4" /> Pricelist View
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
