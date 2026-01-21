import React, { useState } from 'react';
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Plus, Eye, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialData = [
  {
    id: "PO-2023-001",
    vendor: "UltraTech Cement Ltd",
    date: "2023-10-25",
    amount: 45000.00,
    status: "Approved",
    items: 5
  },
  {
    id: "PO-2023-002",
    vendor: "Asian Paints",
    date: "2023-10-26",
    amount: 12500.00,
    status: "Pending",
    items: 2
  },
  {
    id: "PO-2023-003",
    vendor: "Local Hardware Store",
    date: "2023-10-27",
    amount: 3200.00,
    status: "Rejected",
    items: 10
  },
  {
    id: "PO-2023-004",
    vendor: "Steel Authority of India",
    date: "2023-10-28",
    amount: 150000.00,
    status: "Draft",
    items: 1
  },
];

const columns = [
  {
    accessorKey: "id",
    header: "PO Number",
    cell: ({ row }) => <span className="font-medium">{row.getValue("id")}</span>
  },
  {
    accessorKey: "vendor",
    header: "Vendor",
  },
  {
    accessorKey: "date",
    header: "Date",
  },
  {
    accessorKey: "items",
    header: "Items",
  },
  {
    accessorKey: "amount",
    header: "Total Amount",
    cell: ({ row }) => {
        const amount = parseFloat(row.getValue("amount"))
        const formatted = new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
        }).format(amount)
        return <div>{formatted}</div>
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
        const status = row.getValue("status");
        let className = "";
        if (status === "Approved") className = "bg-green-100 text-green-800 hover:bg-green-100 border-green-200";
        if (status === "Pending") className = "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200";
        if (status === "Rejected") className = "bg-red-100 text-red-800 hover:bg-red-100 border-red-200";
        if (status === "Draft") className = "bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200";

        return <Badge variant="outline" className={className}>{status}</Badge>
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const status = row.getValue("status");
      return (
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" title="View Details">
                <Eye className="h-4 w-4" />
            </Button>
            {status === 'Pending' && (
                <>
                    <Button variant="ghost" size="icon" className="text-green-600" title="Approve">
                        <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-600" title="Reject">
                        <XCircle className="h-4 w-4" />
                    </Button>
                </>
            )}
        </div>
      )
    },
  },
]

function CreatePODialog({ open, onOpenChange, onSubmit }) {
    const [formData, setFormData] = useState({
        vendor: "",
        date: "",
        items: "",
        amount: ""
    });

    const handleSubmit = () => {
        onSubmit(formData);
        setFormData({ vendor: "", date: "", items: "", amount: "" });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create Purchase Order</DialogTitle>
                    <DialogDescription>
                        Create a new purchase order for a vendor.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="vendor">Vendor</Label>
                        <Select value={formData.vendor} onValueChange={(val) => setFormData({...formData, vendor: val})}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select vendor" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="UltraTech Cement Ltd">UltraTech Cement Ltd</SelectItem>
                                <SelectItem value="Asian Paints">Asian Paints</SelectItem>
                                <SelectItem value="Local Hardware Store">Local Hardware Store</SelectItem>
                                <SelectItem value="Steel Authority of India">Steel Authority of India</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div className="grid gap-2">
                            <Label htmlFor="date">Date</Label>
                            <Input 
                                id="date" 
                                type="date" 
                                value={formData.date}
                                onChange={(e) => setFormData({...formData, date: e.target.value})}
                            />
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="items">Item Count</Label>
                            <Input 
                                id="items" 
                                type="number" 
                                placeholder="e.g. 5"
                                value={formData.items}
                                onChange={(e) => setFormData({...formData, items: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="amount">Total Amount (INR)</Label>
                        <Input 
                            id="amount" 
                            type="number" 
                            placeholder="0.00"
                            value={formData.amount}
                            onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit}>Create PO</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function PurchaseOrders() {
  const [data, setData] = useState(initialData);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleCreatePO = (newPO) => {
    if (!newPO.vendor || !newPO.date || !newPO.amount) {
        toast({
            title: "Error",
            description: "Please fill in all required fields.",
            variant: "destructive",
        });
        return;
    }

    const po = {
        id: `PO-2023-${String(data.length + 5).padStart(3, '0')}`,
        vendor: newPO.vendor,
        date: newPO.date,
        amount: parseFloat(newPO.amount),
        status: "Draft",
        items: parseInt(newPO.items) || 1
    };

    setData([po, ...data]);
    setOpen(false);
    toast({
        title: "Success",
        description: "Purchase Order created successfully.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
            <p className="text-muted-foreground">Manage and track purchase orders.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create PO
        </Button>
      </div>
      <DataTable columns={columns} data={data} searchKey="vendor" />
      <CreatePODialog open={open} onOpenChange={setOpen} onSubmit={handleCreatePO} />
    </div>
  );
}
