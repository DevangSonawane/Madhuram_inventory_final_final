import React, { useState } from 'react';
import { 
  ArrowRightLeft, 
  Plus, 
  Search, 
  Filter, 
  ArrowRight,
  Check,
  MapPin,
  Package,
  Calendar,
  User,
  MoreVertical,
  Truck
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/contexts/NotificationContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";

// Mock data for transfers
const initialTransfers = [
  {
    id: "TR-2024-001",
    from: "Main Warehouse - Zone A",
    to: "Production Floor - Line 1",
    items: 12,
    requestedBy: "John Doe",
    date: "2024-03-20",
    status: "Completed",
    priority: "High"
  },
  {
    id: "TR-2024-002",
    from: "Main Warehouse - Zone B",
    to: "Testing Lab",
    items: 5,
    requestedBy: "Jane Smith",
    date: "2024-03-19",
    status: "In Transit",
    priority: "Medium"
  },
  {
    id: "TR-2024-003",
    from: "Receiving Area",
    to: "Main Warehouse - Zone C",
    items: 45,
    requestedBy: "Mike Johnson",
    date: "2024-03-18",
    status: "Pending",
    priority: "Low"
  }
];

const mockItems = [
  { id: 1, name: "Copper Wire 2mm", code: "MAT-001", stock: 500, unit: "m" },
  { id: 2, name: "Circuit Board A4", code: "MAT-002", stock: 120, unit: "pcs" },
  { id: 3, name: "Resistor 10k", code: "MAT-003", stock: 2000, unit: "pcs" },
  { id: 4, name: "Capacitor 100uF", code: "MAT-004", stock: 800, unit: "pcs" },
];

export default function StockTransfers() {
  const { addNotification } = useNotifications();
  const [transfers, setTransfers] = useState(initialTransfers);
  const [isNewTransferOpen, setIsNewTransferOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    source: "",
    destination: "",
    items: [],
    priority: "Medium",
    notes: ""
  });

  // Table columns
  const columns = [
    {
      accessorKey: "id",
      header: "Transfer ID",
      cell: ({ row }) => <div className="font-medium">{row.getValue("id")}</div>,
    },
    {
      accessorKey: "from",
      header: "Source",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-3 w-3 text-muted-foreground" />
          <span>{row.getValue("from")}</span>
        </div>
      ),
    },
    {
      accessorKey: "to",
      header: "Destination",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span>{row.getValue("to")}</span>
        </div>
      ),
    },
    {
      accessorKey: "items",
      header: "Items",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Package className="h-3 w-3 text-muted-foreground" />
          <span>{row.getValue("items")} items</span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status");
        return (
          <Badge variant={
            status === "Completed" ? "default" :
            status === "In Transit" ? "secondary" :
            "outline"
          }>
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{row.getValue("date")}</span>
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem>Download Slip</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">Cancel Transfer</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const handleCreateTransfer = () => {
    // Logic to save transfer
    console.log("Creating transfer:", formData);

    const newTransfer = {
      id: `TR-2024-${String(transfers.length + 1).padStart(3, '0')}`,
      from: formData.source || "Unknown Source",
      to: formData.destination || "Unknown Destination",
      items: formData.items.reduce((acc, item) => acc + item.quantity, 0),
      requestedBy: "Current User",
      date: new Date().toISOString().split('T')[0],
      status: "Pending",
      priority: formData.priority
    };

    setTransfers([newTransfer, ...transfers]);
    setIsNewTransferOpen(false);
    setStep(1);
    setFormData({
      source: "",
      destination: "",
      items: [],
      priority: "Medium",
      notes: ""
    });
    
    toast({
      title: "Success",
      description: "Stock transfer request created successfully.",
    });
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!formData.source || !formData.destination) {
        toast({
          title: "Error",
          description: "Please select both source and destination locations.",
          variant: "destructive",
        });
        return;
      }
      if (formData.source === formData.destination) {
        toast({
            title: "Error",
            description: "Source and destination cannot be the same.",
            variant: "destructive",
        });
        return;
      }
    }
    
    if (step === 2) {
      if (formData.items.length === 0) {
        toast({
          title: "Error",
          description: "Please add at least one item to transfer.",
          variant: "destructive",
        });
        return;
      }
    }

    setStep(step + 1);
  };

  const handleAddItem = (itemId) => {
    const item = mockItems.find(i => i.id === itemId);
    if (item && !formData.items.find(i => i.id === itemId)) {
      setFormData({
        ...formData,
        items: [...formData.items, { ...item, quantity: 1 }]
      });
    }
  };

  const handleUpdateQuantity = (itemId, quantity) => {
    setFormData({
      ...formData,
      items: formData.items.map(item => 
        item.id === itemId ? { ...item, quantity: parseInt(quantity) || 0 } : item
      )
    });
  };

  const handleRemoveItem = (itemId) => {
    setFormData({
      ...formData,
      items: formData.items.filter(item => item.id !== itemId)
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Transfers</h1>
          <p className="text-muted-foreground">
            Manage internal stock movements between warehouses and zones.
          </p>
        </div>
        <Button onClick={() => setIsNewTransferOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Transfer
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transfers..."
            className="pl-8"
          />
        </div>
        <Button variant="outline" className="flex gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>

      <DataTable columns={columns} data={transfers} />

      {/* New Transfer Wizard Dialog */}
      <Dialog open={isNewTransferOpen} onOpenChange={setIsNewTransferOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Stock Transfer</DialogTitle>
            <DialogDescription>
              Create a new internal transfer request. Step {step} of 3.
            </DialogDescription>
          </DialogHeader>

          {/* Progress Indicator */}
          <div className="flex items-center justify-between mb-6 px-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors",
                  step >= i ? "border-primary bg-primary text-primary-foreground" : "border-muted text-muted-foreground"
                )}>
                  {step > i ? <Check className="h-4 w-4" /> : i}
                </div>
                {i < 3 && <div className={cn("w-24 h-0.5 mx-2 transition-colors", step > i ? "bg-primary" : "bg-muted")} />}
              </div>
            ))}
          </div>

          <div className="py-4">
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Source Location</Label>
                    <Select 
                      value={formData.source} 
                      onValueChange={(val) => setFormData({...formData, source: val})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="wh-main-a">Main Warehouse - Zone A</SelectItem>
                        <SelectItem value="wh-main-b">Main Warehouse - Zone B</SelectItem>
                        <SelectItem value="wh-receiving">Receiving Area</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Destination Location</Label>
                    <Select 
                      value={formData.destination} 
                      onValueChange={(val) => setFormData({...formData, destination: val})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select destination" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prod-line-1">Production Floor - Line 1</SelectItem>
                        <SelectItem value="testing-lab">Testing Lab</SelectItem>
                        <SelectItem value="wh-shipping">Shipping Area</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Transfer Type</Label>
                  <Select defaultValue="standard">
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard Transfer</SelectItem>
                      <SelectItem value="urgent">Urgent Replenishment</SelectItem>
                      <SelectItem value="return">Return to Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Add Items</Label>
                  <Select onValueChange={(val) => handleAddItem(Number(val))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select item to add" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockItems.map(item => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          {item.name} ({item.code}) - Stock: {item.stock}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="border rounded-md">
                  <div className="p-3 bg-muted font-medium grid grid-cols-12 gap-2 text-sm">
                    <div className="col-span-6">Item</div>
                    <div className="col-span-4">Quantity</div>
                    <div className="col-span-2"></div>
                  </div>
                  {formData.items.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      No items added yet.
                    </div >
                  ) : (
                    <div className="divide-y">
                      {formData.items.map((item) => (
                        <div key={item.id} className="p-3 grid grid-cols-12 gap-2 items-center text-sm">
                          <div className="col-span-6">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-muted-foreground">{item.code}</div>
                          </div>
                          <div className="col-span-4 flex items-center gap-2">
                            <Input 
                              type="number" 
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateQuantity(item.id, e.target.value)}
                              className="h-8 w-20"
                            />
                            <span className="text-xs text-muted-foreground">{item.unit}</span>
                          </div>
                          <div className="col-span-2 text-right">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <span className="sr-only">Remove</span>
                              &times;
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Source:</span>
                    <span className="font-medium">Main Warehouse - Zone A</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Destination:</span>
                    <span className="font-medium">Production Floor - Line 1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Items:</span>
                    <span className="font-medium">{formData.items.length} types</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes / Instructions</Label>
                  <Input 
                    placeholder="Any special handling instructions..." 
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button onClick={handleNextStep}>
                Next Step
              </Button>
            ) : (
              <Button onClick={handleCreateTransfer}>
                Confirm Transfer
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
