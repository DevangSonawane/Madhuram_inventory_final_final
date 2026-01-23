import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Truck, Search, Eye, CheckCircle, AlertTriangle, FileText } from "lucide-react";

// Mock Challan Data
const MOCK_CHALLANS = [
  { id: "DC-2026-001", date: "2026-02-15", vendor: "Astral Pipes Ltd", poRef: "PO-2026-005", items: "CPVC Pipe 2 inch", qtyOrdered: 5000, qtyDelivered: 5000, status: "Verified", vehicle: "MH-04-AB-1234" },
  { id: "DC-2026-002", date: "2026-02-16", vendor: "Supreme Industries", poRef: "PO-2026-006", items: "Ball Valve 2 inch", qtyOrdered: 200, qtyDelivered: 195, status: "Discrepancy", vehicle: "MH-43-CD-5678" },
  { id: "DC-2026-003", date: "2026-02-18", vendor: "Kohler India", poRef: "PO-2026-008", items: "Wall Mounted WC", qtyOrdered: 50, qtyDelivered: 50, status: "Pending", vehicle: "KA-01-XY-9999" },
];

export default function Challans() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Delivery Challans</h1>
          <p className="text-muted-foreground mt-2">Record and verify incoming material deliveries.</p>
        </div>
        <Button className="w-full sm:w-auto">
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
            <div className="text-2xl font-bold">1</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 space-y-0">
          <CardTitle>Challan History</CardTitle>
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search challan no, vendor..." 
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
                  <TableHead>Vendor</TableHead>
                  <TableHead>PO Ref</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Qty (Ord/Del)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_CHALLANS.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.id}</TableCell>
                    <TableCell>{item.date}</TableCell>
                    <TableCell>{item.vendor}</TableCell>
                    <TableCell className="text-xs font-mono">{item.poRef}</TableCell>
                    <TableCell>{item.items}</TableCell>
                    <TableCell className="text-right">
                      {item.qtyOrdered} / <span className={item.qtyDelivered < item.qtyOrdered ? "text-red-500 font-bold" : ""}>{item.qtyDelivered}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        item.status === "Verified" ? "default" : 
                        item.status === "Pending" ? "secondary" : "destructive"
                      } className={
                        item.status === "Verified" ? "bg-green-600 hover:bg-green-700" : ""
                      }>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Verify</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {MOCK_CHALLANS.map((item) => (
              <Card key={item.id} className="border shadow-none">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{item.id}</div>
                      <div className="text-xs text-muted-foreground">{item.date}</div>
                    </div>
                    <Badge variant={
                      item.status === "Verified" ? "default" : 
                      item.status === "Pending" ? "secondary" : "destructive"
                    } className={
                      item.status === "Verified" ? "bg-green-600 hover:bg-green-700" : ""
                    }>
                      {item.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm border-t pt-2">
                    <div>
                      <div className="font-medium">{item.vendor}</div>
                      <div className="text-xs text-muted-foreground">PO: {item.poRef}</div>
                    </div>
                    <div>
                       <span className="text-muted-foreground text-xs">Items:</span>
                       <div className="truncate">{item.items}</div>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-muted-foreground">Qty (Ord/Del):</span>
                       <span>{item.qtyOrdered} / <span className={item.qtyDelivered < item.qtyOrdered ? "text-red-500 font-bold" : ""}>{item.qtyDelivered}</span></span>
                    </div>
                    <div className="pt-2 flex justify-end">
                       <Button variant="outline" size="sm" className="w-full">Verify</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
