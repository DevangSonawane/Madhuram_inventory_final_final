import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Layers, Save, Copy } from "lucide-react";

// Mock Sample Data (Floor-wise distribution)
const MOCK_SAMPLES = [
  { id: 1, item: "CPVC Pipe 2 inch", unit: "Mtr", perFloorQty: 42, totalFloors: 117, totalQty: 4914, status: "Locked" },
  { id: 2, item: "Wall Mounted WC", unit: "Nos", perFloorQty: 4, totalFloors: 117, totalQty: 468, status: "Locked" },
  { id: 3, item: "Basin Mixer", unit: "Nos", perFloorQty: 4, totalFloors: 117, totalQty: 468, status: "Draft" },
  { id: 4, item: "Shower Head", unit: "Nos", perFloorQty: 4, totalFloors: 117, totalQty: 468, status: "Draft" },
];

export default function Samples() {
  const [selectedProject, setSelectedProject] = useState("p1");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sample Management</h1>
          <p className="text-muted-foreground mt-2">Define and lock material quantities per floor.</p>
        </div>
        <div className="flex space-x-2">
           <Button variant="outline">
            <Copy className="mr-2 h-4 w-4" /> Copy Floor Config
          </Button>
          <Button>
            <Save className="mr-2 h-4 w-4" /> Save Configuration
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-4 bg-background p-4 rounded-lg border">
        <span className="text-sm font-medium">Select Project:</span>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="p1">Lodha World One Tower</SelectItem>
            <SelectItem value="p2">Hiranandani Gardens</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Floor-wise Configuration</CardTitle>
            <CardDescription>Define quantity per floor. Total will be calculated automatically.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="w-[150px]">Qty Per Floor</TableHead>
                  <TableHead>Total Floors</TableHead>
                  <TableHead className="text-right">Total Qty</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_SAMPLES.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.item}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        defaultValue={item.perFloorQty} 
                        className="h-8 w-24"
                        disabled={item.status === "Locked"}
                      />
                    </TableCell>
                    <TableCell>{item.totalFloors}</TableCell>
                    <TableCell className="text-right font-bold">{item.totalQty.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === "Locked" ? "default" : "outline"}>
                        {item.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Project Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Floors</span>
              <span className="font-bold">117</span>
            </div>
             <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Typical Floors</span>
              <span className="font-bold">110</span>
            </div>
             <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Refuge Floors</span>
              <span className="font-bold">5</span>
            </div>
             <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Ground/Lobby</span>
              <span className="font-bold">2</span>
            </div>
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                * Quantities defined here will be used to generate Purchase Requests automatically after approval.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
