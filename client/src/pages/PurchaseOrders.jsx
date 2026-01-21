import React from 'react';
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Plus, Eye, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const data = [
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

export default function PurchaseOrders() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-3xl font-bold tracking-tight">Purchase Orders</h2>
            <p className="text-muted-foreground">Manage and track purchase orders.</p>
        </div>
        <Button>
            <Plus className="mr-2 h-4 w-4" /> Create PO
        </Button>
      </div>
      <DataTable columns={columns} data={data} searchKey="vendor" />
    </div>
  );
}
