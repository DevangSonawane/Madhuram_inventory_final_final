import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Eye, Upload, FileText, CheckCircle } from "lucide-react";

// Mock MIR Data
const MOCK_MIR = [
  { id: "MIR-2026-005", date: "2026-02-18", inspector: "Rajesh K.", project: "Lodha World One", material: "CPVC Pipes Batch #44", status: "Approved", doc: "mir_scan_005.pdf" },
  { id: "MIR-2026-006", date: "2026-02-19", inspector: "Amit S.", project: "Prestige City", material: "Ceramic Tiles", status: "Pending Review", doc: "mir_scan_006.pdf" },
];

export default function MIR() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Material Inspection Reports (MIR)</h1>
          <p className="text-muted-foreground mt-2">Upload and manage material inspection documents.</p>
        </div>
        <Button>
          <Upload className="mr-2 h-4 w-4" /> Upload New MIR
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent MIRs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>MIR No</TableHead>
                <TableHead>Inspection Date</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Material / Batch</TableHead>
                <TableHead>Inspector</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Document</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_MIR.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.id}</TableCell>
                  <TableCell>{item.date}</TableCell>
                  <TableCell>{item.project}</TableCell>
                  <TableCell>{item.material}</TableCell>
                  <TableCell>{item.inspector}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === "Approved" ? "default" : "secondary"}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">
                      <FileText className="mr-2 h-3 w-3" /> View PDF
                    </Button>
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
