import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Truck, Search, CheckCircle, AlertTriangle } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { api } from "@/lib/api";

export default function Challans() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dcs, setDcs] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { selectedProject } = useProject();
  const projectId = selectedProject?.project_id ?? selectedProject?.id ?? null;

  useEffect(() => {
    if (!projectId) {
      setDcs([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const dcsRes = await api.getDcsByProject(projectId);
        if (dcsRes.success && Array.isArray(dcsRes.data)) {
          setDcs(dcsRes.data);
        } else {
          setDcs([]);
        }
      } catch {
        setDcs([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [projectId]);

  const pendingCount = useMemo(() => dcs.filter((x) => x.status === "incomplete").length, [dcs]);
  const verifiedCount = useMemo(() => dcs.filter((x) => x.status === "completed").length, [dcs]);
  const totalCount = useMemo(() => dcs.length, [dcs]);

  const filteredDcs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return dcs;
    return dcs.filter((x) => {
      const challanNumber = x.challan_number || '';
      const poNumber = x.po_number || '';
      return challanNumber.toLowerCase().includes(term) || poNumber.toLowerCase().includes(term);
    });
  }, [dcs, searchTerm]);

  const getCounts = (dc) => {
    const totalQtyRaw = dc.total_po_quantity ?? dc.total_po_items;
    const deliveredQtyRaw = dc.total_challan_quantity ?? dc.total_challan_items;
    const totalQty = totalQtyRaw == null ? null : Number(totalQtyRaw);
    const deliveredQty = deliveredQtyRaw == null ? 0 : Number(deliveredQtyRaw);
    if (totalQty == null || Number.isNaN(totalQty)) {
      return { totalQty: null, remainingQty: null };
    }
    const safeDelivered = Number.isNaN(deliveredQty) ? 0 : deliveredQty;
    return { totalQty, remainingQty: Math.max(totalQty - safeDelivered, 0) };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Delivery Challans</h1>
          <p className="text-muted-foreground mt-2">Create and track delivery challans.</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => navigate('new')}>
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
              placeholder="Search challan no, PO no..."
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
                  <TableHead>View</TableHead>
                  <TableHead className="text-right">Counts</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDcs.map((dc) => (
                  <TableRow key={dc.dc_id}>
                    <TableCell className="font-medium">{dc.challan_number}</TableCell>
                    <TableCell>{dc.challan_date || dc.order_date || dc.created_at}</TableCell>
                    <TableCell className="text-xs font-mono">{dc.po_number || dc.po_id || ''}</TableCell>
                    <TableCell>{Array.isArray(dc.items) ? dc.items.map((it) => it.name).filter(Boolean).join(', ') : ''}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/${projectId}/challans/${dc.dc_id}`)}>
                        View
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      {(() => {
                        const { totalQty, remainingQty } = getCounts(dc);
                        if (totalQty == null || remainingQty == null) return '—';
                        const remainingClass = remainingQty <= 0 ? "text-green-600" : "text-red-600";
                        return (
                          <span className={remainingClass}>
                            {totalQty} / {remainingQty}
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={dc.status === "completed" ? "default" : "secondary"}>
                        {dc.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredDcs.map((dc) => (
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
                    <div>
                      <div className="text-muted-foreground text-xs">Counts</div>
                      {(() => {
                        const { totalQty, remainingQty } = getCounts(dc);
                        if (totalQty == null || remainingQty == null) return <div>—</div>;
                        const remainingClass = remainingQty <= 0 ? "text-green-600" : "text-red-600";
                        return (
                          <div className={remainingClass}>
                            {totalQty} / {remainingQty}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex items-end">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/${projectId}/challans/${dc.dc_id}`)}>
                        View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {!loading && filteredDcs.length === 0 ? (
            <div className="text-sm text-muted-foreground mt-4">No delivery challans found.</div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
