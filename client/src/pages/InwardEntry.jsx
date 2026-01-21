import React, { useState } from 'react';
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowDownToLine, Upload, FileText, X } from "lucide-react";
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

const data = [
  {
    id: "INW-2023-001",
    poNumber: "PO-2023-001",
    vendor: "UltraTech Cement Ltd",
    receivedDate: "2023-10-28",
    invoiceNumber: "INV-998877",
    status: "Verified",
    document: "invoice_001.pdf"
  },
  {
    id: "INW-2023-002",
    poNumber: "PO-2023-002",
    vendor: "Asian Paints",
    receivedDate: "2023-10-29",
    invoiceNumber: "INV-112233",
    status: "Pending Inspection",
    document: "challan_002.pdf"
  },
];

const columns = [
  {
    accessorKey: "id",
    header: "Inward ID",
    cell: ({ row }) => <span className="font-medium">{row.getValue("id")}</span>
  },
  {
    accessorKey: "poNumber",
    header: "PO Ref",
  },
  {
    accessorKey: "vendor",
    header: "Vendor",
  },
  {
    accessorKey: "receivedDate",
    header: "Received Date",
  },
  {
    accessorKey: "invoiceNumber",
    header: "Invoice No",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
        const status = row.getValue("status");
        let className = "";
        if (status === "Verified") className = "bg-green-100 text-green-800 hover:bg-green-100 border-green-200";
        if (status === "Pending Inspection") className = "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200";
        
        return <Badge variant="outline" className={className}>{status}</Badge>
    }
  },
  {
    id: "document",
    cell: ({ row }) => {
      return (
        <Button variant="ghost" size="sm" className="h-8">
            <FileText className="h-4 w-4 mr-2" /> View
        </Button>
      )
    },
  },
]

function NewInwardDialog({ open, onOpenChange }) {
    const [file, setFile] = useState(null);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>New Inward Entry</DialogTitle>
                    <DialogDescription>
                        Record goods receipt and upload documents.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="po">Purchase Order Reference</Label>
                        <Select>
                            <SelectTrigger>
                                <SelectValue placeholder="Select PO" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="po1">PO-2023-001 (UltraTech)</SelectItem>
                                <SelectItem value="po2">PO-2023-002 (Asian Paints)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="invoice">Invoice / Challan No</Label>
                            <Input id="invoice" placeholder="Enter number" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="date">Received Date</Label>
                            <Input id="date" type="date" />
                        </div>
                    </div>
                    
                    <div className="grid gap-2">
                        <Label>Document Upload</Label>
                        <div 
                            className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById('file-upload').click()}
                        >
                            <Input 
                                id="file-upload" 
                                type="file" 
                                className="hidden" 
                                onChange={handleFileChange} 
                            />
                            
                            {file ? (
                                <div className="flex items-center gap-2 text-sm bg-muted p-2 rounded-md">
                                    <FileText className="h-4 w-4 text-primary" />
                                    <span className="font-medium truncate max-w-[200px]">{file.name}</span>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 ml-2" 
                                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <div className="p-3 bg-primary/10 rounded-full mb-2">
                                        <Upload className="h-6 w-6 text-primary" />
                                    </div>
                                    <p className="text-sm font-medium">Click to upload or drag and drop</p>
                                    <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG (Max 5MB)</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={() => onOpenChange(false)}>Create Entry</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function InwardEntry() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
            <h2 className="text-3xl font-bold tracking-tight">Inward Entry</h2>
            <p className="text-muted-foreground">Manage incoming goods and receipts.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
            <ArrowDownToLine className="mr-2 h-4 w-4" /> New Inward
        </Button>
      </div>
      <DataTable columns={columns} data={data} searchKey="poNumber" />
      <NewInwardDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
