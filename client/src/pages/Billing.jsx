import React from 'react';
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Receipt, Download, Plus, DollarSign } from "lucide-react";

// Mock Invoice Data
const MOCK_INVOICES = [
  { id: "INV-2026-101", date: "2026-03-01", client: "Lodha Group", project: "Lodha World One", type: "MIR Based", amount: 450000, status: "Paid", dueDate: "2026-03-15" },
  { id: "INV-2026-102", date: "2026-03-05", client: "Hiranandani Group", project: "Hiranandani Gardens", type: "ITR Based", amount: 125000, status: "Pending", dueDate: "2026-03-20" },
];

export default function Billing() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing & Invoices</h1>
          <p className="text-muted-foreground mt-2">Generate invoices based on MIR (Delivery) or ITR (Installation).</p>
        </div>
        <Button
          className="w-full sm:w-auto"
          onClick={() => {
            if (!projectId) return;
            navigate(`/${projectId}/billing/invoice-editor`);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Generate Invoice
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced (This Month)</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹5,75,000</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹1,25,000</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Billing Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_INVOICES.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.id}</TableCell>
                    <TableCell>{item.date}</TableCell>
                    <TableCell>{item.client}</TableCell>
                    <TableCell>{item.project}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.type}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">₹{item.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === "Paid" ? "success" : "secondary"}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {MOCK_INVOICES.map((item) => (
              <Card key={item.id} className="border shadow-none">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{item.id}</div>
                      <div className="text-xs text-muted-foreground">{item.date}</div>
                    </div>
                    <Badge variant={item.status === "Paid" ? "success" : "secondary"}>
                      {item.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm border-t pt-2">
                    <div>
                      <div className="font-medium">{item.project}</div>
                      <div className="text-xs text-muted-foreground">{item.client}</div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <Badge variant="outline" className="text-xs">{item.type}</Badge>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="font-bold">₹{item.amount.toLocaleString()}</span>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Download className="h-4 w-4" />
                      </Button>
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
