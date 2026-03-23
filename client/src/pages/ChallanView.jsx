import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const toDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString();
};

const normalizeItems = (items) => {
  if (!items) return [];
  if (Array.isArray(items)) return items;
  if (typeof items === "string") {
    try {
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const getCounts = (dc) => {
  const totalQtyRaw = dc?.total_po_quantity ?? dc?.total_po_items;
  const deliveredQtyRaw = dc?.total_challan_quantity ?? dc?.total_challan_items;
  const totalQty = totalQtyRaw == null ? null : Number(totalQtyRaw);
  const deliveredQty = deliveredQtyRaw == null ? 0 : Number(deliveredQtyRaw);
  if (totalQty == null || Number.isNaN(totalQty)) {
    return { totalQty: null, deliveredQty: null, remainingQty: null };
  }
  const safeDelivered = Number.isNaN(deliveredQty) ? 0 : deliveredQty;
  return {
    totalQty,
    deliveredQty: safeDelivered,
    remainingQty: Math.max(totalQty - safeDelivered, 0),
  };
};

const getItemName = (item, index) => {
  return item?.name || item?.item_name || item?.material || item?.description || `Item ${index + 1}`;
};

export default function ChallanView() {
  const navigate = useNavigate();
  const { projectId, dcId } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dc, setDc] = useState(null);
  const [po, setPo] = useState(null);
  const [poLoading, setPoLoading] = useState(false);

  useEffect(() => {
    const fetchDc = async () => {
      if (!dcId) return;
      try {
        setLoading(true);
        const result = await api.getDcById(dcId);
        if (!result.success || !result.data) {
          toast({
            title: "Failed to load challan",
            description: result.error || "Could not fetch delivery challan details.",
            variant: "destructive",
          });
          return;
        }
        setDc(result.data);
      } catch {
        toast({
          title: "Failed to load challan",
          description: "Could not fetch delivery challan details.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDc();
  }, [dcId, toast]);

  const items = useMemo(() => normalizeItems(dc?.items), [dc]);
  const poItems = useMemo(() => normalizeItems(po?.items), [po]);
  const { totalQty, deliveredQty, remainingQty } = useMemo(() => getCounts(dc), [dc]);
  const remainingClass = remainingQty != null && remainingQty <= 0 ? "text-green-600" : "text-red-600";
  const totalPoItems = dc?.total_po_items ?? (poItems.length || null);
  const totalChallanItems = dc?.total_challan_items ?? items.length;
  const remainingItems = totalPoItems == null ? null : Math.max(Number(totalPoItems) - Number(totalChallanItems || 0), 0);

  useEffect(() => {
    const fetchPo = async () => {
      if (!dc) return;
      if (!dc.po_id && !dc.po_number) {
        setPo(null);
        return;
      }
      try {
        setPoLoading(true);
        if (dc.po_id) {
          const result = await api.getPoById(dc.po_id);
          if (result?.success && result.data) {
            setPo(result.data);
            return;
          }
        }
        if (dc.po_number && projectId) {
          const result = await api.getPosByProject(projectId);
          const rows = Array.isArray(result?.data) ? result.data : [];
          const match = rows.find((row) => row?.order_no === dc.po_number);
          setPo(match || null);
        } else {
          setPo(null);
        }
      } catch {
        setPo(null);
      } finally {
        setPoLoading(false);
      }
    };

    fetchPo();
  }, [dc, projectId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Challan Record History</h1>
          <p className="text-muted-foreground mt-2">Delivery challan details and item counts.</p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/${projectId}/challans`)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading challan...
        </div>
      ) : null}

      {!loading && !dc ? (
        <div className="text-sm text-muted-foreground">No challan found.</div>
      ) : null}

      {!loading && dc ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>PO Comparison</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-sm text-muted-foreground">Total Items in PO</div>
                <div className="text-4xl font-bold">{totalPoItems ?? "-"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Remaining Items</div>
                <div className={`text-4xl font-bold ${remainingItems != null && remainingItems <= 0 ? "text-green-600" : "text-red-600"}`}>
                  {remainingItems ?? "-"}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Challan No</span><span>{dc.challan_number || "-"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Challan Date</span><span>{toDate(dc.challan_date || dc.order_date || dc.created_at)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">PO No</span><span className="font-mono text-xs">{dc.po_number || dc.po_id || "-"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Work Order</span><span>{dc.work_order_number || "-"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span><Badge variant={dc.status === "completed" ? "default" : "secondary"}>{dc.status}</Badge></span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Item Counts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Total Items</span><span>{totalPoItems ?? "-"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Challan Items</span><span>{totalChallanItems ?? items.length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Items Listed</span><span>{items.length}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quantity Counts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Total Qty</span><span>{totalQty == null ? "-" : totalQty}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Delivered Qty</span><span>{deliveredQty == null ? "-" : deliveredQty}</span></div>
              <div className={`flex justify-between ${remainingClass}`}>
                <span className="text-muted-foreground">Remaining Qty</span>
                <span>{remainingQty == null ? "-" : remainingQty}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {!loading && dc ? (
        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-sm text-muted-foreground">No items found for this challan.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Width</TableHead>
                    <TableHead>Length</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={`challan-item-${index}`}>
                      <TableCell className="font-medium">{item?.name || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{item?.description || "-"}</TableCell>
                      <TableCell>{item?.width || "-"}</TableCell>
                      <TableCell>{item?.length || "-"}</TableCell>
                      <TableCell>{item?.quantity || "-"}</TableCell>
                      <TableCell>{item?.price || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : null}

      {!loading && dc ? (
        <Card>
          <CardHeader>
            <CardTitle>PO Items</CardTitle>
          </CardHeader>
          <CardContent>
            {poLoading ? (
              <div className="text-sm text-muted-foreground">Loading PO items...</div>
            ) : poItems.length === 0 ? (
              <div className="text-sm text-muted-foreground">No PO items found for this challan.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Width</TableHead>
                    <TableHead>Length</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {poItems.map((item, index) => (
                    <TableRow key={`po-item-${index}`}>
                      <TableCell className="font-medium">{getItemName(item, index)}</TableCell>
                      <TableCell className="text-muted-foreground">{item?.description || item?.name || "-"}</TableCell>
                      <TableCell>{item?.width || "-"}</TableCell>
                      <TableCell>{item?.length || "-"}</TableCell>
                      <TableCell>{item?.quantity || item?.qty || "-"}</TableCell>
                      <TableCell>{item?.price || item?.rate || item?.Rate || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
