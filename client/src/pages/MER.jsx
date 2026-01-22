import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileCheck, Mail, Printer, Eye } from "lucide-react";

// Mock MER Data
const MOCK_MER = [
  { id: "MER-2026-001", date: "2026-02-15", project: "Lodha World One", challanRef: "DC-2026-001", items: "CPVC Pipe 2 inch", status: "Sent to Client", clientAck: "Pending" },
  { id: "MER-2026-002", date: "2026-02-16", project: "Hiranandani Gardens", challanRef: "DC-2026-002", items: "Ball Valve 2 inch", status: "Draft", clientAck: "-" },
];

export default function MER() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Material Entry Reports (MER)</h1>
          <p className="text-muted-foreground mt-2">Generate reports for customer acknowledgment of material receipt.</p>
        </div>
        <Button>
          <FileCheck className="mr-2 h-4 w-4" /> Generate New MER
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>MER Log</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>MER Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Challan Ref</TableHead>
                <TableHead>Material Details</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Client Ack</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_MER.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.id}</TableCell>
                  <TableCell>{item.date}</TableCell>
                  <TableCell>{item.project}</TableCell>
                  <TableCell>{item.challanRef}</TableCell>
                  <TableCell>{item.items}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === "Sent to Client" ? "default" : "secondary"}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{item.clientAck}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="ghost" size="icon">
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Mail className="h-4 w-4" />
                      </Button>
                    </div>
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
