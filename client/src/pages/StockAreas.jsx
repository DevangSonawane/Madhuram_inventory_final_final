import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Warehouse, MapPin, Box, MoreVertical, Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialWarehouses = [
  {
    id: "WH-001",
    name: "Main Warehouse (Mumbai)",
    type: "Warehouse",
    status: "Active",
    capacity: "85%",
    zones: [
      {
        id: "ZN-A",
        name: "Zone A - Raw Materials",
        type: "Zone",
        items: 120,
        racks: [
            { id: "R-01", name: "Rack 01", type: "Rack", capacity: "Full" },
            { id: "R-02", name: "Rack 02", type: "Rack", capacity: "Available" }
        ]
      },
      {
        id: "ZN-B",
        name: "Zone B - Finished Goods",
        type: "Zone",
        items: 450,
        racks: [
            { id: "R-03", name: "Rack 03", type: "Rack", capacity: "Available" }
        ]
      }
    ]
  },
  {
    id: "WH-002",
    name: "Pune Distribution Center",
    type: "Warehouse",
    status: "Active",
    capacity: "45%",
    zones: [
       {
        id: "ZN-C",
        name: "Zone C - General Storage",
        type: "Zone",
        items: 80,
        racks: []
      }
    ]
  },
  {
    id: "WH-003",
    name: "Nashik Storage",
    type: "Warehouse",
    status: "Maintenance",
    capacity: "0%",
    zones: []
  }
];

export default function StockAreas() {
  const [warehouses, setWarehouses] = useState(initialWarehouses);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newWarehouse, setNewWarehouse] = useState({
    name: "",
    status: "Active"
  });
  const { toast } = useToast();

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setNewWarehouse((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleStatusChange = (value) => {
    setNewWarehouse((prev) => ({
      ...prev,
      status: value,
    }));
  };

  const handleAddWarehouse = () => {
    if (!newWarehouse.name) {
      toast({
        title: "Error",
        description: "Warehouse name is required.",
        variant: "destructive",
      });
      return;
    }

    const warehouse = {
      id: `WH-${String(warehouses.length + 1).padStart(3, '0')}`,
      name: newWarehouse.name,
      type: "Warehouse",
      status: newWarehouse.status,
      capacity: "0%",
      zones: []
    };

    setWarehouses([...warehouses, warehouse]);
    setIsAddDialogOpen(false);
    setNewWarehouse({ name: "", status: "Active" });
    
    toast({
      title: "Success",
      description: "Warehouse added successfully.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Stock Areas</h1>
            <p className="text-muted-foreground">Manage warehouses, zones, and storage locations.</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Add Warehouse
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Warehouse</DialogTitle>
              <DialogDescription>
                Create a new warehouse location to manage inventory.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newWarehouse.name}
                  onChange={handleInputChange}
                  className="col-span-3"
                  placeholder="e.g. Mumbai Warehouse"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Status
                </Label>
                <Select onValueChange={handleStatusChange} value={newWarehouse.status}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddWarehouse}>Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {warehouses.map((warehouse) => (
            <Card key={warehouse.id}>
                <CardHeader className="flex flex-col sm:flex-row items-start justify-between gap-4 space-y-0 pb-2">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Warehouse className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-xl">{warehouse.name}</CardTitle>
                            <CardDescription className="flex flex-wrap items-center gap-2 mt-1">
                                <span>{warehouse.id}</span>
                                <span>•</span>
                                <Badge variant={warehouse.status === 'Active' ? 'default' : 'secondary'}>
                                    {warehouse.status}
                                </Badge>
                                <span>•</span>
                                <span className={parseInt(warehouse.capacity) > 80 ? "text-red-500 font-medium" : "text-green-500 font-medium"}>
                                    {warehouse.capacity} Full
                                </span>
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <Button variant="outline" size="sm">View Details</Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardHeader>
                <CardContent>
                    {warehouse.zones.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full">
                            {warehouse.zones.map((zone) => (
                                <AccordionItem key={zone.id} value={zone.id}>
                                    <AccordionTrigger className="hover:no-underline hover:bg-muted/50 px-4 rounded-md">
                                        <div className="flex items-center gap-3">
                                            <MapPin className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">{zone.name}</span>
                                            <Badge variant="outline" className="ml-2">{zone.items} Items</Badge>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pt-2">
                                        {zone.racks.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                                                {zone.racks.map((rack) => (
                                                    <div key={rack.id} className="flex items-center justify-between p-3 border rounded-md bg-background">
                                                        <div className="flex items-center gap-3">
                                                            <Box className="h-4 w-4 text-muted-foreground" />
                                                            <span className="text-sm font-medium">{rack.name}</span>
                                                        </div>
                                                        <Badge variant="secondary" className="text-xs">{rack.capacity}</Badge>
                                                    </div>
                                                ))}
                                                <Button variant="ghost" className="border border-dashed h-auto py-3">
                                                    <Plus className="h-4 w-4 mr-2" /> Add Rack
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="py-4 text-center text-sm text-muted-foreground">
                                                No racks configured in this zone.
                                                <Button variant="link" className="text-primary h-auto p-0 ml-1">Add Rack</Button>
                                            </div>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    ) : (
                         <div className="py-8 text-center text-muted-foreground bg-muted/20 rounded-md border border-dashed">
                            No zones configured. 
                            <Button variant="link" className="text-primary h-auto p-0 ml-1">Add Zone</Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        ))}
      </div>
    </div>
  );
}
