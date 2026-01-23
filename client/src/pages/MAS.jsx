import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle, Eye, FileText, Send } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Mock Data
const MOCK_MAS_ITEMS = [
  { id: 1, code: "PLM-001", item: "CPVC Pipe 2 inch", brand: "Astral", model: "FlowGuard Plus", spec: "SDR 11, Class 1", status: "Approved", clientRemark: "Approved as per standard" },
  { id: 2, code: "PLM-002", item: "Ball Valve 2 inch", brand: "Zoloto", model: "1078", spec: "Bronze, Screwed", status: "Pending", clientRemark: "Awaiting datasheet" },
  { id: 3, code: "SAN-001", item: "Wall Mounted WC", brand: "Kohler", model: "Veil", spec: "Intelligent Toilet", status: "Rejected", clientRemark: "Too expensive, suggest alternative" },
  { id: 4, code: "ELE-005", item: "Copper Wire 2.5mm", brand: "Polycab", model: "FR", spec: "Flame Retardant", status: "Approved", clientRemark: "Ok" },
];

export default function MAS() {
  const [selectedProject, setSelectedProject] = useState("p1");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Material Approval Sheet (MAS)</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">Manage material specifications and client approvals.</p>
        </div>
        <div className="flex w-full sm:w-auto space-x-2">
          <Button className="w-full sm:w-auto">
            <Send className="mr-2 h-4 w-4" /> Submit to Client
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-background p-4 rounded-lg border">
        <span className="text-sm font-medium whitespace-nowrap">Select Project:</span>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-full sm:w-[280px]">
            <SelectValue placeholder="Select Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="p1">Lodha World One Tower</SelectItem>
            <SelectItem value="p2">Hiranandani Gardens</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="all">All Items</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>MAS Items</CardTitle>
              <CardDescription>List of materials submitted for approval.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Mobile Card View */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {MOCK_MAS_ITEMS.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{item.item}</div>
                        <div className="text-xs text-muted-foreground font-mono">{item.code}</div>
                      </div>
                      <Badge variant={
                        item.status === "Approved" ? "default" :
                        item.status === "Pending" ? "secondary" : "destructive"
                      } className={
                        item.status === "Approved" ? "bg-green-600 hover:bg-green-700" : ""
                      }>
                        {item.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm border-t pt-2">
                      <div>
                        <div className="text-muted-foreground text-xs">Brand</div>
                        <div>{item.brand}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">Model</div>
                        <div>{item.model}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-muted-foreground text-xs">Specification</div>
                        <div>{item.spec}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-muted-foreground text-xs">Client Remarks</div>
                        <div>{item.clientRemark}</div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t mt-2">
                      <Button variant="ghost" size="sm" className="w-full">
                        <Eye className="mr-2 h-4 w-4" /> View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Proposed Brand</TableHead>
                    <TableHead>Model/Spec</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Client Remarks</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_MAS_ITEMS.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.code}</TableCell>
                      <TableCell className="font-medium">{item.item}</TableCell>
                      <TableCell>{item.brand}</TableCell>
                      <TableCell>{item.model} <br/> <span className="text-xs text-muted-foreground">{item.spec}</span></TableCell>
                      <TableCell>
                        <Badge variant={
                          item.status === "Approved" ? "default" :
                          item.status === "Pending" ? "secondary" : "destructive"
                        } className={
                          item.status === "Approved" ? "bg-green-600 hover:bg-green-700" : ""
                        }>
                          {item.status === "Approved" && <CheckCircle className="mr-1 h-3 w-3" />}
                          {item.status === "Pending" && <Clock className="mr-1 h-3 w-3" />}
                          {item.status === "Rejected" && <XCircle className="mr-1 h-3 w-3" />}
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.clientRemark}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
