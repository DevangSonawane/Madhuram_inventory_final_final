import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Upload, Plus, FileSpreadsheet, Save } from "lucide-react";

// Mock Projects
const PROJECTS = [
  { id: "p1", name: "Lodha World One Tower" },
  { id: "p2", name: "Hiranandani Gardens" }
];

// Mock BOQ Data
const MOCK_BOQ_ITEMS = [
  { id: 1, category: "Plumbing", code: "PLM-001", description: "CPVC Pipe 2 inch", unit: "Mtr", quantity: 5000, rate: 450, amount: 2250000, floor: "Typical" },
  { id: 2, category: "Plumbing", code: "PLM-002", description: "Ball Valve 2 inch", unit: "Nos", quantity: 200, rate: 1200, amount: 240000, floor: "All" },
  { id: 3, category: "Sanitary", code: "SAN-001", description: "Wall Mounted WC", unit: "Nos", quantity: 450, rate: 15000, amount: 6750000, floor: "Typical" },
  { id: 4, category: "Electrical", code: "ELE-005", description: "Copper Wire 2.5mm", unit: "Coil", quantity: 1000, rate: 2500, amount: 2500000, floor: "All" },
];

export default function BOQ() {
  const [selectedProject, setSelectedProject] = useState("p1");
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">BOQ Management</h1>
          <p className="text-muted-foreground mt-2">Manage Bill of Quantities for projects.</p>
        </div>
        <div className="flex flex-col sm:flex-row w-full sm:w-auto space-y-2 sm:space-y-0 sm:space-x-2">
          <Button variant="outline" className="w-full sm:w-auto">
            <Upload className="mr-2 h-4 w-4" /> Import Excel
          </Button>
          <Button variant="outline" className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Add Item
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 bg-background p-4 rounded-lg border">
        <span className="text-sm font-medium">Select Project:</span>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-full sm:w-[280px]">
            <SelectValue placeholder="Select Project" />
          </SelectTrigger>
          <SelectContent>
            {PROJECTS.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>BOQ Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Rate (Est.)</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_BOQ_ITEMS.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell><Badge variant="outline">{item.category}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{item.code}</TableCell>
                    <TableCell className="font-medium">{item.description}</TableCell>
                    <TableCell>{item.floor}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right">{item.quantity.toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{item.rate.toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{item.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <FileSpreadsheet className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={5}>Total</TableCell>
                  <TableCell className="text-right"></TableCell>
                  <TableCell className="text-right"></TableCell>
                  <TableCell className="text-right">₹11,740,000</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Mobile View */}
          <div className="space-y-4 md:hidden">
            {MOCK_BOQ_ITEMS.map((item) => (
              <div key={item.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                     <Badge variant="outline">{item.category}</Badge>
                     <div className="font-medium">{item.description}</div>
                     <div className="text-xs font-mono text-muted-foreground">{item.code}</div>
                  </div>
                  <div className="text-right">
                     <div className="font-bold">₹{item.amount.toLocaleString()}</div>
                     <div className="text-xs text-muted-foreground">₹{item.rate.toLocaleString()}/{item.unit}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
                   <div>
                     <span className="text-muted-foreground block">Quantity:</span>
                     <span>{item.quantity.toLocaleString()} {item.unit}</span>
                   </div>
                   <div>
                     <span className="text-muted-foreground block">Floor:</span>
                     <span>{item.floor}</span>
                   </div>
                </div>
                
                <div className="flex justify-end pt-2">
                   <Button variant="ghost" size="sm">
                      <FileSpreadsheet className="mr-2 h-4 w-4" /> Details
                   </Button>
                </div>
              </div>
            ))}
            <div className="p-4 bg-muted/50 rounded-lg flex justify-between items-center font-bold">
               <span>Total Amount</span>
               <span>₹11,740,000</span>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button>
          <Save className="mr-2 h-4 w-4" /> Save Changes
        </Button>
      </div>
    </div>
  );
}
