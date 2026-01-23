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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Material Inspection Reports (MIR)</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">Upload and manage material inspection documents.</p>
        </div>
        <Button className="w-full sm:w-auto">
          <Upload className="mr-2 h-4 w-4" /> Upload New MIR
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent MIRs</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {MOCK_MIR.map((item) => (
              <div key={item.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{item.id}</div>
                    <div className="text-xs text-muted-foreground">{item.date}</div>
                  </div>
                  <Badge variant={item.status === "Approved" ? "default" : "secondary"}>
                    {item.status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm border-t pt-2">
                  <div className="col-span-2">
                    <div className="text-muted-foreground text-xs">Project</div>
                    <div>{item.project}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-muted-foreground text-xs">Material / Batch</div>
                    <div>{item.material}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-muted-foreground text-xs">Inspector</div>
                    <div>{item.inspector}</div>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t mt-2">
                  <Button variant="outline" size="sm" className="w-full">
                    <FileText className="mr-2 h-4 w-4" /> View PDF
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <Table className="hidden md:table">
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
