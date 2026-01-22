import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Hammer, CheckCircle, XCircle, Plus } from "lucide-react";

// Mock ITR Data
const MOCK_ITR = [
  { id: "ITR-2026-055", date: "2026-02-20", floor: "14th Floor", location: "Unit 1402 - Master Bath", item: "Wall Mounted WC", test: "Leakage Test", result: "Pass", status: "Approved" },
  { id: "ITR-2026-056", date: "2026-02-21", floor: "14th Floor", location: "Unit 1403 - Kitchen", item: "Sink Mixer", test: "Pressure Test", result: "Fail", status: "Rework Required" },
];

export default function ITR() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Installation Test Reports (ITR)</h1>
          <p className="text-muted-foreground mt-2">Document installation quality and test results.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Create New ITR
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tests Conducted (This Month)</CardTitle>
            <Hammer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">128</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Passed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">115</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed / Rework</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">13</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ITR History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ITR No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Floor / Location</TableHead>
                <TableHead>Item Installed</TableHead>
                <TableHead>Test Performed</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_ITR.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.id}</TableCell>
                  <TableCell>{item.date}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{item.floor}</span>
                      <span className="text-xs text-muted-foreground">{item.location}</span>
                    </div>
                  </TableCell>
                  <TableCell>{item.item}</TableCell>
                  <TableCell>{item.test}</TableCell>
                  <TableCell>
                    <Badge variant={item.result === "Pass" ? "success" : "destructive"}>
                      {item.result}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Details</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
